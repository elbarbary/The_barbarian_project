"""Validate the precomputed workbench as one publication, without any API calls."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import pathlib


def fingerprint(top5, picks, scenarios, readings):
    def content(doc):
        return {k: v for k, v in doc.items() if k not in ("builtAt", "publicationId")}
    bundle = {"top5": content(top5), "picks": content(picks),
              "scenarios": content(scenarios),
              "readings": {key: content(doc) for key, doc in readings.items()}}
    return hashlib.sha256(json.dumps(bundle, sort_keys=True, separators=(",", ":"),
                                     ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def validate(top5, picks, scenarios, readings, *, require_id=True):
    errors = []
    basis = scenarios.get("basisSession")
    if not basis or not picks.get("latestSession") or picks["latestSession"] < basis:
        errors.append("forecast basis is missing or newer than the price record")
    if picks.get("horizons") != scenarios.get("horizons") or top5.get("horizons") != scenarios.get("horizons"):
        errors.append("forecast and scoring horizons differ")
    indexed = (scenarios.get("rerank") or {}).get("readings") or {}
    if set(indexed) != set(readings):
        errors.append("reading files do not match the published index")
    for key, doc in readings.items():
        index = indexed.get(key) or {}
        if doc.get("basisSession") != basis or doc.get("key") != key:
            errors.append(f"{key}: wrong basis or key")
        if doc.get("layers") != index.get("layers"):
            errors.append(f"{key}: evidence layers differ from index")
        scores = doc.get("scores")
        if not isinstance(scores, dict) or any(isinstance(v, bool) or not isinstance(v, (int, float))
                or not math.isfinite(v) or not 0 <= v <= 100 for v in (scores or {}).values()):
            errors.append(f"{key}: invalid scores")
        elif not set(scores).issubset(scenarios.get("companies") or {}):
            errors.append(f"{key}: scores include companies missing from the forecast")
        if doc.get("forecastHorizon", 5) != 5:
            errors.append(f"{key}: unsupported Gemini ranking target")
    if require_id:
        expected = fingerprint(top5, picks, scenarios, readings)
        if any(doc.get("publicationId") != expected for doc in [top5, picks, scenarios, *readings.values()]):
            errors.append("publication ID missing, mixed, or does not match document contents")
    if errors:
        raise ValueError("; ".join(errors))


def stamp(top5, picks, scenarios, readings):
    validate(top5, picks, scenarios, readings, require_id=False)
    identity = fingerprint(top5, picks, scenarios, readings)
    for doc in [top5, picks, scenarios, *readings.values()]:
        doc["publicationId"] = identity
    return identity


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=pathlib.Path,
                        default=pathlib.Path(__file__).resolve().parents[2] / "public/data/v1")
    args = parser.parse_args()
    def read(path):
        return json.loads(path.read_text(encoding="utf-8"))
    root = args.root
    readings = {p.stem: read(p) for p in (root / "lab/rerank").glob("*.json")}
    validate(read(root / "research/top5.json"), read(root / "lab/picks.json"),
             read(root / "lab/scenarios.json"), readings)
    print(f"Workbench publication verified: {len(readings)} precomputed readings; no model calls")


if __name__ == "__main__":
    main()
