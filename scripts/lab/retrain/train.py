"""Stage 1 pilot: fine-tune Kronos-small's predictor on EGX windows scaled by their past alone.

    python train.py <data dir> <run dir> [--epochs 3] [--steps 2000] [--batch 50] [--device mps]

Upstream's Qlib recipe (finetune/train_predictor.py at 67b630e), unchanged
except for the windows' scaling:
  * the tokenizer is frozen; each batch is tokenised on the fly;
  * inputs are tokens[:-1], targets tokens[1:]; the loss is the head's own
    (s1 + s2) / 2, with s2 conditioned on a sampled s1 as upstream trains it;
  * AdamW at 4e-5, betas 0.9/0.95, weight decay 0.1; OneCycleLR with
    pct_start 0.03 and div_factor 10 over the whole run; gradients clipped at 3;
  * 2,000 steps of 50 windows an epoch, drawn at random from the train split;
  * the checkpoint kept is the one with the lowest validation loss.

The original weights' validation loss is measured first, on the same fixed
20,000 windows, so the stop rule's third test compares like with like.
Resumable at epoch boundaries: a run killed mid-epoch restarts that epoch.
"""

import argparse
import json
import os
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
os.environ.setdefault("HF_HOME", str(ROOT / "hf"))
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
sys.path.insert(0, str(ROOT / "source"))

import numpy as np
import torch

import candles as cd
from model import Kronos, KronosTokenizer

MODEL = ("NeoQuasar/Kronos-small", "901c26c1332695a2a8f243eb2f37243a37bea320")
TOKENIZER = ("NeoQuasar/Kronos-Tokenizer-base", "0e0117387f39004a9016484a186a908917e22426")
SEED = 100


def log(message):
    print(f"{time.strftime('%H:%M:%S')} {message}", flush=True)


def tensors(panel, pairs, device):
    x, t = panel.batch(pairs)
    return torch.from_numpy(x).to(device), torch.from_numpy(t).to(device)


def step_loss(model, tokenizer, x, t):
    with torch.no_grad():
        s1, s2 = tokenizer.encode(x, half=True)
    logits = model(s1[:, :-1], s2[:, :-1], t[:, :-1, :])
    return model.head.compute_loss(logits[0], logits[1], s1[:, 1:], s2[:, 1:])


def validation_loss(model, tokenizer, panel, pairs, device, batch):
    model.eval()
    torch.manual_seed(SEED)
    totals = np.zeros(3)
    with torch.no_grad():
        for i in range(0, len(pairs), batch):
            chunk = pairs[i:i + batch]
            x, t = tensors(panel, chunk, device)
            loss, s1, s2 = step_loss(model, tokenizer, x, t)
            totals += np.array([loss.item(), s1.item(), s2.item()]) * len(chunk)
    model.train()
    return dict(zip(("loss", "s1", "s2"), (totals / len(pairs)).round(6).tolist()))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=pathlib.Path)
    parser.add_argument("run", type=pathlib.Path)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--steps", type=int, default=2000)
    parser.add_argument("--batch", type=int, default=50)
    parser.add_argument("--lr", type=float, default=4e-5)
    parser.add_argument("--device", default="mps")
    parser.add_argument("--val-limit", type=int, default=None, help="smoke tests only")
    args = parser.parse_args()
    args.run.mkdir(parents=True, exist_ok=True)
    device = args.device

    frozen = json.loads((args.data / "frozen" / "manifest.json").read_text())
    prereg = json.loads((args.data / "frozen" / "preregistration.json").read_text())
    directory = {r["ticker"]: r for r in json.loads((args.data / "companies.json").read_text())["companies"]}
    companies, manifest = cd.load(args.data / "candles", directory)
    if manifest["sha256"] != frozen["sha256"]:
        raise SystemExit("the candles are not the frozen set")
    panel = cd.Panel(companies)
    index = {name: s for s, name in enumerate(panel.names)}
    train_pairs = panel.windows["train"]
    val_pairs = [(index[(ticker, seg)], start) for ticker, seg, start in prereg["validationWindows"]][:args.val_limit]
    log(f"{len(train_pairs)} train windows, {len(val_pairs)} validation windows, device {device}")

    torch.manual_seed(SEED)
    tokenizer = KronosTokenizer.from_pretrained(TOKENIZER[0], revision=TOKENIZER[1]).eval().to(device)
    for p in tokenizer.parameters():
        p.requires_grad_(False)
    state_path = args.run / "state.pt"
    metrics_path = args.run / "metrics.json"
    metrics = json.loads(metrics_path.read_text()) if metrics_path.exists() else {"epochs": []}
    start_epoch = 0
    if state_path.exists():
        state = torch.load(state_path, map_location="cpu")
        model = Kronos.from_pretrained(str(args.run / "last")).to(device).train()
        start_epoch = state["epoch"] + 1
        log(f"resuming after epoch {state['epoch'] + 1}")
    else:
        model = Kronos.from_pretrained(MODEL[0], revision=MODEL[1]).to(device).train()
        if "original" not in metrics:
            started = time.time()
            metrics["original"] = validation_loss(model, tokenizer, panel, val_pairs, device, args.batch)
            metrics["original"]["seconds"] = round(time.time() - started)
            metrics_path.write_text(json.dumps(metrics, indent=1))
            log(f"original weights, validation loss {metrics['original']}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, betas=(0.9, 0.95), weight_decay=0.1)
    scheduler = torch.optim.lr_scheduler.OneCycleLR(optimizer, max_lr=args.lr, steps_per_epoch=args.steps,
                                                    epochs=args.epochs, pct_start=0.03, div_factor=10)
    if state_path.exists():
        optimizer.load_state_dict(state["optimizer"])
        scheduler.load_state_dict(state["scheduler"])

    best = min((e["validation"]["loss"] for e in metrics["epochs"]), default=float("inf"))
    for epoch in range(start_epoch, args.epochs):
        rng = np.random.default_rng(SEED + epoch * 10000)
        torch.manual_seed(SEED + epoch * 10000)
        started, seen, window_loss = time.time(), 0, []
        for step in range(args.steps):
            picks = rng.integers(0, len(train_pairs), args.batch)
            x, t = tensors(panel, [train_pairs[i] for i in picks], device)
            loss, s1, s2 = step_loss(model, tokenizer, x, t)
            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=3.0)
            optimizer.step()
            scheduler.step()
            seen += args.batch
            window_loss.append(loss.item())
            if (step + 1) % 50 == 0:
                rate = seen / (time.time() - started)
                log(f"epoch {epoch + 1} step {step + 1}/{args.steps} loss {np.mean(window_loss[-50:]):.4f} "
                    f"s1 {s1.item():.4f} s2 {s2.item():.4f} lr {scheduler.get_last_lr()[0]:.2e} {rate:.1f} windows/s")
        val = validation_loss(model, tokenizer, panel, val_pairs, device, args.batch)
        model.save_pretrained(str(args.run / f"epoch-{epoch + 1}"))
        model.save_pretrained(str(args.run / "last"))
        if val["loss"] < best:
            best = val["loss"]
            model.save_pretrained(str(args.run / "best"))
        metrics["epochs"].append({"epoch": epoch + 1, "trainLoss": round(float(np.mean(window_loss)), 6),
                                  "validation": val, "seconds": round(time.time() - started)})
        metrics["bestEpoch"] = min(metrics["epochs"], key=lambda e: e["validation"]["loss"])["epoch"]
        metrics_path.write_text(json.dumps(metrics, indent=1))
        torch.save({"epoch": epoch, "optimizer": optimizer.state_dict(), "scheduler": scheduler.state_dict()}, state_path)
        log(f"epoch {epoch + 1} done: validation {val} (original {metrics['original']['loss']})")
    log("finished")


if __name__ == "__main__":
    main()
