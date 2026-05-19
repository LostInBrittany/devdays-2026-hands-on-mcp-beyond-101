# Solution — Phase 4.3 (Tools are contracts)

End state of phase 4.3: the rename was demonstrated live and reverted. **Code identical to 4.2** — the lesson is the experience (rename → break → revert), not a code diff.

## Why "no code diff" is the right end state

The 4.3 walkthrough has participants:
1. Rename `compare_monsters` to `pit_monsters` in `catalog-server/src/tools/compare-monsters.ts`
2. Restart the gateway and watch the agent fail to find the old name
3. Discuss the four kinds of breaking change
4. **Revert** the rename so the catalog's contract stays stable for 4.4

The post-revert state is the same code as 4.2. What changed is in the participant's head, not on disk. This solution captures that — running it gives you 4.2's behaviour, with the lesson learned.

## How to run this solution

```bash
cd solutions/4.3
bun install               # if you haven't already
claude
```

Same setup as 4.2 — single `mcp-gateway` entry, namespaced tools.

## Try the rename live (the workshop exercise)

If you want to replay the 4.3 lesson here:

```bash
# Inside solutions/4.3/, edit catalog-server/src/tools/compare-monsters.ts:
#   change `server.registerTool("compare_monsters", ...)`
#   to     `server.registerTool("pit_monsters", ...)`
# Save. Exit Claude Code (/exit) and re-launch.
```

Run `/mcp` — see `catalog.pit_monsters` instead of `catalog.compare_monsters`. Re-ask a prompt that uses the comparison. Watch the agent react (tool-not-found if its session memory cached the old name, or it picks the new one fresh).

**Then revert the rename** so 4.3 ends in a known-good state.

## The right way to evolve (which we'd ship, in production)

Don't rename in place. Register both names; route both to the same handler; mark the old one `[DEPRECATED]`:

```ts
server.registerTool("pit_monsters",      { description: "…",                  inputSchema }, handler);
server.registerTool("compare_monsters",  { description: "[DEPRECATED] …",     inputSchema }, handler);
```

Remove the alias after every consumer has migrated. **Don't surprise the agent.**

## What this state delivers

A vocabulary for evolving MCP tool contracts without breaking active agents — earned by feeling the break.

**Principle landed:** *Tool schemas are public APIs. Rename costs.*

→ Next solution: [`4.4/README.md`](../4.4/README.md) — idempotency in the gateway.
