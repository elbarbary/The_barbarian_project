#!/usr/bin/env python3
"""Let the build attempt its own repair, under a proof gate it cannot talk past.

Two modes, one machine:

  --mode repair   the suite is red. Read the failure, propose an edit, and keep
                  it only if the suite goes green.
  --mode improve  the suite is green. Propose one improvement to the build
                  itself, and keep it only if the suite is still green.

The interesting part of this file is not the model call. It is everything that
refuses the model's answer.

An agent asked to make a failing test pass has one move available that always
works and is always wrong: delete the test. A second, nearly as bad: edit the
assertion until it matches whatever the code now does. This repository is a
financial publication — its tests are the things standing between a reader and
a wrong number about a real company, and §8 of Capital Market Law 95/1992 is
enforced by some of them. So the model here cannot touch a test at all, cannot
touch the §8 guards, and cannot touch a single published byte. It can propose
a change to the *code and the docs*, and then it has to survive the same suite
that caught the problem.

It never pushes to `main`. Cloudflare deploys this repository from `main` on
its own Git integration, so a push to main is a deploy to production; what this
writes is a branch, and a person merges it or does not.

Run:
    python3 scripts/ci_selfheal.py --mode repair  --out /tmp/heal
    python3 scripts/ci_selfheal.py --mode improve --out /tmp/heal
"""

from __future__ import annotations

import argparse
import dataclasses
import json
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

REPO = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = REPO / "scripts"

# ── The policy ───────────────────────────────────────────────────────────────
#
# Deny wins over allow, always. Written as prefixes against a repo-relative
# POSIX path.

# Published bytes. These are the numbers about real companies. Nothing
# automated writes them, and the one time something invented a figure for a
# real ticker it shipped from the first commit and stayed up for weeks.
DENY_PUBLISHED = (
    "public/data/",
    "app/assets/fixtures/",
    "data-source/",
    "docs/archive/",
)

# The tests themselves, and the §8 guards they enforce. The whole proof gate
# below is worthless if the thing being proved can be edited by the same hand.
DENY_PROOF = (
    "scripts/macro_types.py",
    ".github/workflows/self-repair.yml",
)

# Credentials, CI identity, and anything that changes who the build is.
DENY_TRUST = (
    ".github/actions/",
    ".git/",
)

ALLOW = (
    "docs/",
    "scripts/",
    "public/esthmr/",
    "site-worker/",
    "worker/",
    ".github/workflows/",
)

MAX_EDIT_BYTES = 60_000
MAX_EDITS = 6


def is_test_path(rel: str) -> bool:
    name = rel.rsplit("/", 1)[-1]
    return (
        name.startswith("test_")
        or name.endswith(".test.mjs")
        or name.endswith("_test.py")
        or "/test/" in rel
    )


def path_allowed(rel: str) -> tuple[bool, str]:
    """May the healer write this path? Returns (allowed, why-not)."""
    rel = rel.replace("\\", "/").lstrip("./")
    if not rel or rel.startswith("/") or ".." in rel.split("/"):
        return False, "path escapes the repository"
    if is_test_path(rel):
        return False, "a test — the healer may not edit what proves it right"
    for deny, why in (
        (DENY_PUBLISHED, "published data about real companies"),
        (DENY_PROOF, "a guard the proof gate depends on"),
        (DENY_TRUST, "CI identity or credentials"),
    ):
        for prefix in deny:
            if rel == prefix.rstrip("/") or rel.startswith(prefix):
                return False, why
    if not any(rel.startswith(p) for p in ALLOW):
        return False, "outside the paths the healer may touch"
    return True, ""


# ── The proof gate ───────────────────────────────────────────────────────────

PY_SUITE = ["python3", "-m", "unittest", "discover", "-s", "scripts", "-p", "test_*.py"]
RAN_RE = re.compile(r"^Ran (\d+) tests? in", re.M)


@dataclasses.dataclass
class SuiteResult:
    ok: bool
    ran: int
    output: str

    @property
    def summary(self) -> str:
        tail = "\n".join(self.output.strip().splitlines()[-40:])
        return f"ok={self.ok} ran={self.ran}\n{tail}"


def run_python_suite(cwd: pathlib.Path | None = None) -> SuiteResult:
    proc = subprocess.run(
        PY_SUITE, cwd=cwd or REPO, capture_output=True, text=True, timeout=1800
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    m = RAN_RE.search(out)
    return SuiteResult(ok=proc.returncode == 0, ran=int(m.group(1)) if m else 0, output=out)


# The same four globs `check-website.yml` runs. Expanded here rather than
# passed as directories: `node --test <dir>` walks the tree and reports each
# directory as one failing test, which looks exactly like a real failure.
NODE_TEST_GLOBS = ("site-worker/test/*.test.mjs", "worker/quotes/test/*.test.mjs",
                   "worker/fetchrelay/test/*.test.mjs", "worker/clock/test/*.test.mjs")


def run_node_suite() -> SuiteResult:
    """The website's own tests.

    Not because the healer diagnoses them — it reads a Python failure — but
    because `public/esthmr/` and `site-worker/` are on its allow list, and a
    Python test can be repaired by an edit that quietly breaks the template
    bindings or lets §8 directive language onto a screen. Green here is part of
    the proof, not a separate errand.
    """
    files = sorted(str(p.relative_to(REPO))
                   for g in NODE_TEST_GLOBS for p in REPO.glob(g))
    if not files:
        return SuiteResult(ok=False, ran=0, output="no website test files found")
    try:
        proc = subprocess.run(["node", "--test", *files], cwd=REPO,
                              capture_output=True, text=True, timeout=900)
    except (OSError, subprocess.SubprocessError) as exc:
        # No node on the runner is a reason to refuse the edit, not to wave it
        # through: an unproved change is exactly what this file exists to stop.
        return SuiteResult(ok=False, ran=0, output=f"could not run node: {exc}")
    out = (proc.stdout or "") + (proc.stderr or "")
    # Node writes the summary as "# pass 474" on older runners and "\u2139 pass 474"
    # on newer ones. Missing the count would silently report zero passing tests
    # for a green suite, which the gate would then read as no coverage at all.
    m = re.search(r"^(?:#|\u2139)\s*pass (\d+)", out, re.M)
    return SuiteResult(ok=proc.returncode == 0, ran=int(m.group(1)) if m else 0, output=out)


def gate(before: SuiteResult, after: SuiteResult,
         node_after: SuiteResult | None = None) -> tuple[bool, str]:
    """The only way an edit survives.

    Green is necessary and not sufficient. A suite that went green by running
    fewer tests did not get fixed; it got quieter. `before.ran` is the count
    from the red run — the failing test still executed and still counted — so
    a drop means a test stopped being collected.
    """
    if not after.ok:
        return False, f"suite still red after the edit ({after.ran} tests ran)"
    if after.ran < before.ran:
        return False, (
            f"suite went green but lost {before.ran - after.ran} test(s) "
            f"({before.ran} → {after.ran}). A quieter suite is not a repair."
        )
    if node_after is not None and not node_after.ok:
        return False, ("python suite green, but the website tests broke — "
                       "the edit fixed one suite by damaging another")
    node = f", website {node_after.ran} passing" if node_after else ""
    return True, f"green, {after.ran} tests ran (was {before.ran}){node}"


# ── Asking ───────────────────────────────────────────────────────────────────

SCHEMA_NOTE = """Answer with JSON only, no prose around it, exactly this shape:

{
  "diagnosis": "<what is actually wrong, one short paragraph>",
  "edits": [
    {"path": "<repo-relative path>",
     "find": "<exact text that appears once in that file>",
     "replace": "<what it becomes>"}
  ],
  "refuse": "<null, or why you will not attempt this>"
}

Rules you must follow, because the harness enforces them and a violation
throws your whole answer away:
- "find" must appear EXACTLY ONCE in the file, byte for byte, including
  indentation. Quote enough surrounding lines to be unique.
- You may not edit any test file. If the correct repair is a change to a test,
  set "refuse" and explain — that is a real answer, not a failure.
- You may not edit published data under public/data/, app/assets/fixtures/ or
  data-source/.
- Prefer the smallest edit that fixes the cause. Do not reformat.
- Match the surrounding comment voice: this repository explains WHY in prose,
  and says plainly what does not work."""


def ask(prompt: str, *, model: str | None = None) -> dict:
    import gemini

    text, _ = gemini.generate(prompt, model=model or gemini.MODEL)
    raw = text.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)
    start, end = raw.find("{"), raw.rfind("}")
    if start < 0 or end <= start:
        raise ValueError(f"no JSON object in the answer: {raw[:200]!r}")
    return json.loads(raw[start : end + 1])


# ── Applying ─────────────────────────────────────────────────────────────────


def apply_edits(edits: list[dict]) -> tuple[list[str], list[str]]:
    """Write the edits. Returns (paths written, refusals).

    Anchored find/replace rather than a unified diff, because a diff that does
    not apply cleanly has a dozen ways to half-apply and this has exactly two
    outcomes per edit: the anchor was there exactly once and the file changed,
    or nothing happened and it is reported.
    """
    written, refused = [], []
    if len(edits) > MAX_EDITS:
        return [], [f"{len(edits)} edits proposed, more than the {MAX_EDITS} allowed"]
    for e in edits:
        rel = str(e.get("path", "")).replace("\\", "/").lstrip("./")
        ok, why = path_allowed(rel)
        if not ok:
            refused.append(f"{rel}: {why}")
            continue
        path = REPO / rel
        if not path.is_file():
            refused.append(f"{rel}: no such file")
            continue
        find, replace = e.get("find"), e.get("replace")
        if not isinstance(find, str) or not isinstance(replace, str) or not find:
            refused.append(f"{rel}: edit has no usable find/replace")
            continue
        if len(replace) > MAX_EDIT_BYTES:
            refused.append(f"{rel}: replacement is larger than {MAX_EDIT_BYTES} bytes")
            continue
        text = path.read_text(encoding="utf-8")
        hits = text.count(find)
        if hits != 1:
            refused.append(f"{rel}: anchor appears {hits} times, needed exactly 1")
            continue
        path.write_text(text.replace(find, replace, 1), encoding="utf-8")
        written.append(rel)
    return written, refused


# ── Context for the model ────────────────────────────────────────────────────

# unittest writes `FAIL: test_x (test_sources.CatalogueTest.test_x)`. The bare
# method name is what a person wants to read; the dotted path in the brackets
# is the only part that names the MODULE, and the module is how the file gets
# found when the traceback points somewhere else entirely.
FAIL_RE = re.compile(r"^(?:FAIL|ERROR): (\S+)(?:\s+\(([\w.]+)\))?", re.M)


def failing_tests(output: str) -> list[str]:
    return list(dict.fromkeys(m[0] for m in FAIL_RE.findall(output)))


def failing_modules(output: str) -> list[str]:
    """The test modules that failed, from the dotted path unittest prints."""
    mods = []
    for name, dotted in FAIL_RE.findall(output):
        mod = (dotted or name).split(".")[0]
        if mod and mod not in mods:
            mods.append(mod)
    return mods


# `REPO / "docs" / "data-sources.md"`, `"docs/data-sources.md"`, `docs/x.json`.
PATH_PARTS = re.compile(r'"([A-Za-z0-9_.\-/]+)"')


def referenced_paths(source: pathlib.Path, exclude=()) -> list[str]:
    """Repo files a module names, in the order it names them."""
    try:
        text = source.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    found: list[str] = []
    # Joined forms first: REPO / "docs" / "data-sources.md"
    for chain in re.finditer(r'REPO\s*/\s*((?:"[^"]+"\s*/\s*)*"[^"]+")', text):
        rel = "/".join(PATH_PARTS.findall(chain.group(1)))
        if rel and (REPO / rel).is_file() and rel not in found and rel not in exclude:
            found.append(rel)
    # Then plain literals that happen to be real files.
    for lit in PATH_PARTS.findall(text):
        if "/" not in lit or lit.startswith("/") or ".." in lit:
            continue
        if (REPO / lit).is_file() and lit not in found and lit not in exclude:
            found.append(lit)
    return found


def failure_context(result: SuiteResult, budget: int = 40_000) -> str:
    """The failure, plus the files it actually names.

    Chosen over "here is the repository" deliberately: a traceback names the
    test and the module under test, and those two files are almost always the
    whole story. Sending more costs money and buys a worse answer.
    """
    lines = result.output.strip().splitlines()
    tail = "\n".join(lines[-120:])
    wanted: list[str] = []
    for mod in failing_modules(result.output):
        for cand in (f"scripts/{mod}.py", f"scripts/{mod.replace('test_', '', 1)}.py"):
            if (REPO / cand).is_file() and cand not in wanted:
                wanted.append(cand)
    for path in re.findall(r'File "([^"]+)"', result.output):
        try:
            rel = str(pathlib.Path(path).resolve().relative_to(REPO))
        except ValueError:
            continue
        if rel not in wanted and (REPO / rel).is_file():
            wanted.append(rel)

    # And the files those files point AT. A guard's whole job is to compare the
    # code against something else — a catalogue, a schema, a fixture — and the
    # something else is where the repair almost always belongs. Without this
    # the model is asked to edit a file it has never seen, and it does what
    # anyone would: it invents a plausible anchor, which is then refused.
    for rel in list(wanted):
        wanted.extend(referenced_paths(REPO / rel, exclude=wanted))

    chunks = [f"=== suite output (tail) ===\n{tail}\n"]
    spent = len(chunks[0])
    for rel in wanted[:8]:
        body = (REPO / rel).read_text(encoding="utf-8", errors="replace")
        if spent + len(body) > budget:
            body = body[: max(0, budget - spent)] + "\n… (truncated)"
        chunk = f"\n=== {rel} ===\n{body}\n"
        chunks.append(chunk)
        spent += len(chunk)
        if spent >= budget:
            break
    return "".join(chunks)


REPAIR_PROMPT = """The test suite for ESTHMR — a published record of the Egyptian
Exchange — is failing. Diagnose the cause and propose the smallest edit that
fixes it.

This repository publishes figures about real, named companies. A test that
fails is usually a guard doing its job, not a nuisance: the most common cause
is that somebody added something real (a data source, a field, a screen) and
did not declare it where the guard checks. Fix the *cause*, in the code or the
documentation. Never make the check weaker.

{context}

{schema}"""

IMPROVE_PROMPT = """The test suite for ESTHMR — a published record of the Egyptian
Exchange — is green. Propose ONE improvement to the build itself.

What counts as an improvement here, roughly in order of value:
  1. A guard that would have caught a real past failure and does not exist yet.
     The repository's own comments describe failures it has had; a test that
     pins one of those shut is the best thing you can add.
  2. A failure that reports itself badly — a check that fails with no useful
     message, or one that passes silently when its input is missing.
  3. Something the build does that is documented as wrong, slow or wasteful in
     its own comments.

What does NOT count, and will be rejected:
  - Reformatting, renaming, or style changes.
  - Loosening any existing check.
  - Adding a dependency.
  - Anything touching published data or a test file.

Because you may not write a test file, an improvement that needs a new test
should instead be proposed as a refusal that says exactly which test to add and
why — a person will write it. Prefer improvements you can make in non-test code.

Here is the shape of the build:

{context}

{schema}"""


def repo_shape(budget: int = 32_000) -> str:
    """What the build is, for the improve pass."""
    parts = []
    wf = sorted((REPO / ".github" / "workflows").glob("*.yml"))
    parts.append("=== workflows ===\n" + "\n".join(f"- {p.name}" for p in wf) + "\n")
    tests = sorted(SCRIPTS.glob("test_*.py"))
    parts.append(
        "\n=== python test modules ===\n"
        + "\n".join(f"- {p.name} ({p.stat().st_size} bytes)" for p in tests)
        + "\n"
    )
    builders = sorted(p.name for p in SCRIPTS.glob("*.py") if not p.name.startswith("test_"))
    parts.append("\n=== scripts ===\n" + ", ".join(builders) + "\n")
    spent = sum(len(p) for p in parts)
    for rel in (".github/workflows/check-website.yml", "docs/data-sources.md"):
        path = REPO / rel
        if not path.is_file():
            continue
        body = path.read_text(encoding="utf-8", errors="replace")
        # Whole file or none of it. The first improve pass read a catalogue cut
        # off mid-table and reported the missing rows as a defect in the
        # repository — a truncation mark is not enough to stop that, because a
        # file that ends mid-sentence looks broken however it is labelled.
        if spent + len(body) > budget:
            parts.append(f"\n=== {rel} === (omitted: {len(body)} bytes, over budget)\n")
            continue
        chunk = f"\n=== {rel} ===\n{body}\n"
        parts.append(chunk)
        spent += len(chunk)
    return "".join(parts)


# ── Driver ───────────────────────────────────────────────────────────────────


def report(out_dir: pathlib.Path, payload: dict) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "result.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in payload.items() if k != "context"},
                     ensure_ascii=False, indent=1))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=("repair", "improve"), required=True)
    ap.add_argument("--out", default="/tmp/ci-selfheal")
    ap.add_argument("--dry-run", action="store_true",
                    help="ask and report, write nothing")
    args = ap.parse_args()
    out = pathlib.Path(args.out)

    before = run_python_suite()
    if args.mode == "repair" and before.ok:
        report(out, {"mode": "repair", "action": "none",
                     "why": f"suite is green ({before.ran} tests) — nothing to repair"})
        return 0
    if args.mode == "improve" and not before.ok:
        report(out, {"mode": "improve", "action": "none",
                     "why": "suite is red — repair comes before improvement",
                     "failing": failing_tests(before.output)})
        return 0

    if args.mode == "repair":
        prompt = REPAIR_PROMPT.format(context=failure_context(before), schema=SCHEMA_NOTE)
    else:
        prompt = IMPROVE_PROMPT.format(context=repo_shape(), schema=SCHEMA_NOTE)

    try:
        answer = ask(prompt)
    except Exception as exc:  # the model is a best-effort dependency, never a gate
        report(out, {"mode": args.mode, "action": "none",
                     "why": f"could not get an answer: {type(exc).__name__}: {exc}"})
        return 0

    diagnosis = str(answer.get("diagnosis", "")).strip()
    refuse = answer.get("refuse")
    if refuse:
        report(out, {"mode": args.mode, "action": "refused",
                     "diagnosis": diagnosis, "refusal": str(refuse)})
        return 0

    edits = answer.get("edits") or []
    if not isinstance(edits, list) or not edits:
        report(out, {"mode": args.mode, "action": "none",
                     "why": "no edits proposed", "diagnosis": diagnosis})
        return 0

    if args.dry_run:
        report(out, {"mode": args.mode, "action": "dry-run",
                     "diagnosis": diagnosis,
                     "edits": [e.get("path") for e in edits]})
        return 0

    written, refused = apply_edits(edits)
    if not written:
        report(out, {"mode": args.mode, "action": "none",
                     "why": "no edit could be applied", "diagnosis": diagnosis,
                     "refused": refused})
        return 0

    after = run_python_suite()
    node_after = run_node_suite() if after.ok else None
    passed, verdict = gate(before, after, node_after)
    payload = {
        "mode": args.mode,
        "action": "proposed" if passed else "reverted",
        "diagnosis": diagnosis,
        "files": written,
        "refused": refused,
        "verdict": verdict,
        "before": {"ok": before.ok, "ran": before.ran},
        "after": {"ok": after.ok, "ran": after.ran},
        "website": {"ok": node_after.ok, "ran": node_after.ran} if node_after else None,
    }
    if not passed:
        subprocess.run(["git", "checkout", "--"] + written, cwd=REPO, check=False)
        payload["suite_tail"] = "\n".join(after.output.strip().splitlines()[-25:])
    report(out, payload)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
