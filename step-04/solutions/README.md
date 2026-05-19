# Solutions — Module 04 (v3 scales)

Reference end-states for each iteration of the v3 build. **Each folder is fully autonomous** — `cd` in, `bun install` (once), `claude`, and you're running that iteration's exact state.

## Layout

```
solutions/
├── 4.0/   — arena's simulate_battle implemented; two-server .mcp.json (no gateway)
├── 4.1/   — identical code to 4.0 (observation iteration); README walks the four pains
├── 4.2/   — gateway built (merge, route, audit); .mcp.json collapsed to one entry
├── 4.3/   — same code as 4.2 (rename was demoed and reverted); README has the alias pattern
└── 4.4/   — record-battle-result implemented + dedupe table filled in (final M04 state)
```

Each folder contains a complete drop-in tree:
- `package.json` + `bunfig.toml` + `bun.lock`
- `.mcp.json` (in the shape that iteration uses)
- `catalog-server/` (full step-03/solutions/3.8/ tree)
- `arena-server/` (full tree, including `src/log.ts`)
- `gateway/` (from 4.2 onwards)

## How to use these

**Option A — run a solution directly** (recommended):

```bash
cd solutions/4.<N>
bun install               # first time only
claude
```

Approve the MCP prompt(s). For 4.0/4.1 you'll see two prompts (catalog + arena); for 4.2+ you'll see one (mcp-gateway).

**Option B — diff against your in-progress work:**

```bash
diff -ru ../../arena-server/src solutions/4.4/arena-server/src
diff -ru ../../gateway/src      solutions/4.4/gateway/src
```

Useful when your build doesn't match expected behaviour.

## Cumulative diffs at a glance

| Step | What changes from the previous iteration |
|---|---|
| scaffold → 4.0 | `arena-server/src/tools/simulate-battle.ts` (TODO body → deriveStats-based resolver, with `logCall`/`logResult`) |
| 4.0 → 4.1 | (none — observation iteration; same code, different README/lesson) |
| 4.1 → 4.2 | NEW `gateway/` tree (server.ts, children.ts, idempotency.ts stub) with mergeManifests + auditLine implemented; `.mcp.json` collapsed from two child entries to one `mcp-gateway` entry |
| 4.2 → 4.3 | (none — rename was demoed live and reverted; README has the production-grade alias-then-deprecate pattern) |
| 4.3 → 4.4 | `arena-server/src/tools/record-battle-result.ts` (TODO → real write); `gateway/src/idempotency.ts` (check + record implemented) |

## A note on `.mcp.json` shapes

| Solution | `.mcp.json` |
|---|---|
| 4.0, 4.1 | Two entries: `catalog-server` + `arena-server` |
| 4.2, 4.3, 4.4 | One entry: `mcp-gateway` (gateway spawns children internally) |

## Prerequisites for every solution

- `pglite/`'s `bun run start:pg` running on `127.0.0.1:5432` (so catalog-server can connect)
- Only one Claude Code session at a time talking to PGlite (single-connection limit)

## What's NOT in here

- Walkthrough files (`4.0-add-arena.md` etc.) — those live in `step-04/` and are the *teaching* artifact; these solutions are the *code* artifact.
- A `scripts/` folder — the workshop's smoke test lives in `step-04/scripts/smoke.ts` and tests pieces of all five iterations against the in-process modules.
