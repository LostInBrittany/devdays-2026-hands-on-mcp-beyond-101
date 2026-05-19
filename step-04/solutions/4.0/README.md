# Solution — Phase 4.0 (Add the arena)

End state of phase 4.0: arena-server's `simulate_battle` is implemented; catalog-server unchanged; `.mcp.json` registers both servers separately (no gateway yet).

## What's different from the step-04 scaffold

- **`arena-server/src/tools/simulate-battle.ts`** — TODO body replaced. Takes two full monster detail payloads (the `data` object from catalog-server's `get_monster_details`), derives stats from a hash of the whole payload (FNV-1a-ish → attack/defense/speed in [3,12]), picks winner by total score. Composition is load-bearing: bare names produce degenerate scores, so the LLM is forced to call catalog first. Logs every call to `arena-server/logs/arena.txt`.
- **Everything else** — identical to the step-04 scaffold:
  - `arena-server/src/log.ts` (provided, writes `arena-server/logs/arena.txt`)
  - `arena-server/src/tools/record-battle-result.ts` (still a TODO stub — implemented in 4.4)
  - `catalog-server/` — drop-in `step-03/solutions/3.8/`, unchanged
  - `.mcp.json` — two entries, `catalog-server` + `arena-server`

## How to run this solution

This folder is **fully autonomous**. From the solution directory:

```bash
cd solutions/4.0
bun install               # if you haven't already
claude
```

Approve **both** MCP prompts (catalog + arena). Then `/mcp` should show both servers connected, with `simulate_battle` available.

Make sure `pglite/`'s `bun run start:pg` is alive on `127.0.0.1:5432` so catalog-server can talk to it.

## Try it

> *"Who wins between Thunderclaw and Aquafrost?"*

Tail both server logs in side terminals to see the calls:

```bash
tail -f catalog-server/logs/server.log    # two get_monster_details calls (one per fighter)
tail -f arena-server/logs/arena.txt       # one simulate_battle call
```

Three lines across the two tails — that's the orchestration the LLM is forced into, because `simulate_battle`'s schema demands the full catalog payload for each fighter.

## What this state delivers

Two MCP servers running side by side; the LLM picks lore from one, hands it to the other for a verdict. The arena owns combat math; the catalog owns lore; the LLM stitches.

**Principle landed:** *Composition happens at the agent layer. The LLM is the conductor — and the way you shape your Tools determines whether the LLM composes or short-circuits.*

→ Back to: [`4.0-add-arena.md`](../../4.0-add-arena.md)
