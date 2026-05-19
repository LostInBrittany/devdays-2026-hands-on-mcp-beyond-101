# Solution — Phase 4.2 (Build the gateway)

End state of phase 4.2: the typed MCP gateway is built; `.mcp.json` collapsed from two child entries to one (`mcp-gateway`); audit log lands in `gateway/logs/audit.log`.

## What's different from 4.1

- **NEW: `gateway/`** — full gateway tree:
  - `gateway/src/server.ts` — `mergeManifests` filled in (lists each child's tools, registers them on the gateway with `${child}/` namespace prefix); `auditLine` filled in (JSONL to `gateway/logs/audit.log`); `routeToolCall` already wired (idempotency hook present but no-op until 4.4)
  - `gateway/src/children.ts` — provided helper, spawns catalog + arena as stdio subprocesses
  - `gateway/src/idempotency.ts` — still empty stubs (4.4 fills them in)
- **`.mcp.json`** — collapsed to a single `mcp-gateway` entry. `DATABASE_URL` now lives in `gateway/src/children.ts` (forwarded to catalog on spawn). One `MCP_PRINCIPAL` env on the gateway, forwarded to both children.
- **Arena + catalog source unchanged** vs 4.1.

## How to run this solution

```bash
cd solutions/4.2
bun install               # if you haven't already
claude
```

Approve the **single** `mcp-gateway` prompt. Then `/mcp` shows one server with namespaced tools (`catalog.get_monster_details`, `arena.simulate_battle`, etc.).

Make sure `pglite/`'s `bun run start:pg` is alive on `127.0.0.1:5432`.

## Try it

Open three terminals to compare what each layer sees:

```bash
tail -f gateway/logs/audit.log          # one JSONL line per call, principal-attributed
tail -f arena-server/logs/arena.txt     # the handler-level trace for arena
tail -f catalog-server/logs/server.log  # the handler-level trace for catalog
```

Then in Claude Code:

> *"Who wins between Thunderclaw and Aquafrost?"*

You should see one line in `gateway/logs/audit.log` for the arena call, with `principal=developer`, `child=arena`, `name=simulate_battle`, `cache` field absent (no idempotency_key yet), and a millisecond duration. The arena log shows the same call from the handler's perspective. If the LLM also queries catalog for context, those calls show up in both the gateway audit AND `catalog-server/logs/server.log`.

## What this state delivers

A single MCP entry point that fans out to catalog + arena, namespaces every tool, and writes one JSONL audit line per call.

**Principle landed:** *Cross-cutting concerns belong in one place. The gateway is the place.*

**Thesis check:** notice you haven't touched `catalog-server/src/` even once. The v2 server you shipped in step-03 is the same code; what changed is what surrounds it.

→ Next solution: [`4.3/README.md`](../4.3/README.md) — break a contract, observe the agent.
