# Solution — Phase 3.8 (Golden tasks)

3.7 plus a manual golden-task harness. Every primitive call is captured as JSONL when `GOLDEN_LOG=1`; the runner reads that trace and asserts the LLM picked the expected tools in the expected order.

## What changed from 3.7

- **Modified:** `src/log.ts` — added JSONL output. When `GOLDEN_LOG=1` is set, every `logCall`/`logResult` also appends one JSON line to `logs/golden.jsonl`. Day-to-day behaviour (without the env var) is unchanged.
- **New file:** `tests/golden-tasks.ts` — three task definitions (list elementals, compare two, fetch one monster). Each task has a prompt and an expected tool-call sequence with optional regex args matching.
- **New file:** `scripts/run-golden-tasks.ts` — manual runner. Clears the log, prints each prompt for the operator to run in Claude Code, waits for Enter, then validates the captured calls against the expected sequence.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.8/src/* src/
cp -r solutions/3.8/tests .
cp -r solutions/3.8/scripts/run-golden-tasks.ts scripts/
```

Run the server with `GOLDEN_LOG=1` and (because one task uses `compare_monsters`) `MCP_PRINCIPAL=developer`:

```bash
GOLDEN_LOG=1 MCP_PRINCIPAL=developer bun --hot run src/server.ts
```

In a separate terminal, run the harness:

```bash
bun run scripts/run-golden-tasks.ts
```

Follow its prompts: for each task, paste the prompt into Claude Code, wait for the response, then press Enter in the harness terminal.

## The failure demo

After all three tasks pass, edit `src/tools/compare-monsters.ts` and change the Tool description to something useless (`"Internal utility. Do not use directly."`). Save. Re-run the harness. The "compare two monsters" task **fails** even though no handler code changed — the LLM picked a different Tool because the description no longer matches the user intent.

**Unit tests would never catch this. Golden tasks do.**

## What this state delivers

You can now assert on LLM behaviour, not just code correctness. Description changes, schema changes, new Tool additions — all surface as golden-task regressions.

**Principle landed:** *Test what the LLM actually does.*

→ Back to: [`step-03/README.md`](../../README.md) for the full v1↔v2 landing matrix.
