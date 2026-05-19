# Solution — Phase 4.1 (Where this hurts)

**No code diff vs 4.0.** This iteration is a structured observation pass — naming the four pains that the gateway will absorb in 4.2.

This folder ships identical code to `solutions/4.0/`, kept as its own autonomous tree so the workshop's iteration numbering stays consistent and you can `cd` into any phase to re-run it.

## How to run this solution

```bash
cd solutions/4.1
bun install               # if you haven't already
claude
```

Same setup as 4.0: approve both MCP prompts, `/mcp` shows two servers.

## What to look for

Walk through the four observation beats in [`4.1-where-this-hurts.md`](../../4.1-where-this-hurts.md):

1. **Tool count.** `/mcp` shows 6+ tools across 2 servers. Mentally multiply by a fleet.
2. **`.mcp.json` duplication.** `MCP_PRINCIPAL` would have to repeat per server.
3. **Fragmented audit.** Two per-server logs (`catalog-server/logs/server.log` + `arena-server/logs/arena.txt`), no fleet view.
4. **Name collisions.** What if two servers exposed a tool called `compare_monsters`? Undefined behaviour.

The four pains named here are what 4.2's gateway absorbs.

## What this state delivers

A list of named problems. The next iteration's gateway solves them.

**Principle landed:** *Nothing in 4.0 is broken. Everything in 4.0 scales badly.*

→ Next solution: [`4.2/README.md`](../4.2/README.md) — the gateway built.
