# Solutions — Module 03 (v2 shaped)

Reference solutions for each iteration of the v2 RAGmonsters server.

## Layout

```
solutions/
├── 3.0/   — baseline + logger (scaffold filled in, src/log.ts added)
├── 3.1/   — + curated schema Resource
├── 3.2/   — + hypermedia + pagination
├── 3.3/   — + cache for bounded Resources
├── 3.4/   — + compare_monsters Tool
├── 3.5/   — + Prompt rewritten as recipe
├── 3.6/   — + output sanitisation + output schema (src/sanitize.ts)
├── 3.7/   — + tool-level authorisation (src/auth.ts)
└── 3.8/   — + golden-task harness (tests/, scripts/run-golden-tasks.ts)
```

Each folder contains a complete `src/` tree at that iteration's **completion** state, plus a short `README.md` describing what changed. 3.8 also contains `tests/` and `scripts/` subfolders.

## How to use these

Each solution folder is **fully autonomous** — it ships its own `.mcp.json` alongside `src/`. Two ways to use a solution:

**Option A — run the solution directly** (no copying):

```bash
cd step-03/solutions/3.<N>
claude
```

Claude Code picks up the local `.mcp.json` and spawns the server from that folder's `src/`. Useful for comparing two iterations side-by-side, or for instructors demoing a specific phase. Dependencies resolve up the tree to step-03/node_modules — make sure you've already run `bun install` in `step-03/`.

**Option B — overlay onto your in-progress work**:

```bash
# from step-03/
cp -r solutions/3.<N>/src/* src/
# For 3.8 also:
cp -r solutions/3.8/tests .
cp solutions/3.8/scripts/run-golden-tasks.ts scripts/
```

Then restart your dev terminal. For iterations with cache changes (3.3+), do a **cold restart** (`Ctrl-C` + `bun --hot run src/server.ts`) — hot reload doesn't re-run startup code.

## Env vars per solution's `.mcp.json`

Each solution's `.mcp.json` carries the env vars appropriate for *running that phase directly*:

| Phase | `.mcp.json` env block |
|---|---|
| 3.0–3.7 | `DATABASE_URL` only — default principal is `guest`, so 3.7's deny-demo on `compare_monsters` lands as expected |
| 3.8 | also `MCP_PRINCIPAL=developer` + `GOLDEN_LOG=1` so the golden-task harness works out of the box |

If you're using **Option B** (overlay onto your work) and want to run 3.7 with the developer principal, restart your own dev terminal with:

```bash
MCP_PRINCIPAL=developer bun --hot run src/server.ts
```

Or for 3.8:

```bash
GOLDEN_LOG=1 MCP_PRINCIPAL=developer bun --hot run src/server.ts
```

## What's NOT in here

- `package.json`, `bunfig.toml`, `tsconfig.json`, `bun.lock`, `node_modules/` — those stay in `step-03/`. Solutions resolve modules up the tree.
- The walkthrough files (`3.0-baseline.md` etc.) — those are the *teaching* artifact. These solutions are the *code* artifact.

## Reading order

Solutions are cumulative — `3.8/src/` contains every change from 3.0 through 3.8. If you want to see what a single iteration adds, diff two adjacent folders:

```bash
diff -ru solutions/3.5/src solutions/3.6/src
```

## Cumulative diffs at a glance

| Step | New files | Modified files |
|---|---|---|
| 3.0 → 3.1 | `src/resources/schema.ts` | `src/server.ts` |
| 3.1 → 3.2 | (none) | three Tool files (envelope + offset) |
| 3.2 → 3.3 | `src/cache.ts` | `src/server.ts`, two cached-data handlers |
| 3.3 → 3.4 | `src/tools/compare-monsters.ts` | `src/server.ts` |
| 3.4 → 3.5 | (none) | `src/prompts/analyze-monster.ts` |
| 3.5 → 3.6 | `src/sanitize.ts` | `get-monster-details.ts`, `compare-monsters.ts` |
| 3.6 → 3.7 | `src/auth.ts` | every handler (`checkAuth*` guard) |
| 3.7 → 3.8 | `tests/golden-tasks.ts`, `scripts/run-golden-tasks.ts` | `src/log.ts` (GOLDEN_LOG branch) |
