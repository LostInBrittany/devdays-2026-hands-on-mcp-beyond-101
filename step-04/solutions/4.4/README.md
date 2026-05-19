# Solution — Phase 4.4 (Idempotency for the LLM era)

The final M04 state. Arena's `record_battle_result` write is implemented; the gateway's dedupe table is filled in; LLM retries with the same `idempotency_key` short-circuit to a cached response — without ever reaching the arena handler.

## What's different from 4.3

- **`arena-server/src/tools/record-battle-result.ts`** — TODO body replaced with the actual write. Appends `{ts, winner, loser}` to `arena-server/data/battle-log.jsonl`. Logs every call. **The handler IGNORES `idempotency_key`** — dedupe is the gateway's job.
- **`gateway/src/idempotency.ts`** — `check` and `record` implemented. In-memory `Map<string, { result, ts }>` with 5-minute TTL.
- **`gateway/src/server.ts`** — *unchanged* from 4.2. The dedupe hook in `routeToolCall` was already wired in the 4.2 skeleton; once `idempotency.ts` has real `check`/`record`, the hook starts working automatically.

## How to run this solution

```bash
cd solutions/4.4
bun install               # if you haven't already
claude
```

Same setup as 4.2/4.3 — single `mcp-gateway` entry, namespaced tools.

## Try the dedupe demo

Open three tails:

```bash
tail -f gateway/logs/audit.log
tail -f arena-server/logs/arena.txt
ls -la arena-server/data/         # empty until first write
```

In Claude Code:

> *"Record that Thunderclaw beat Aquafrost. Use idempotency key 'k1'."*

Then:

> *"That timed out, retry with the same key."*

End state across three files:

```bash
wc -l arena-server/data/battle-log.jsonl
# 1                                       (the underlying write)

grep -c 'record_battle_result' arena-server/logs/arena.txt
# 1                                       (arena handler fired only once)

grep -c '"name":"record_battle_result"' gateway/logs/audit.log
# 2                                       (gateway saw two calls)
```

**One row written. One handler call. Two audit lines.**

The two audit lines have identical `args_hash` and different `cache` fields (`miss`, then `hit`).

## What this state delivers

The fifth and final iteration of v3. You can now:
- Compose two MCP servers behind a typed gateway
- Audit every call across the fleet in one JSONL file
- See contract changes propagate immediately
- Dedupe LLM retries at the fleet edge, leaving underlying Tools naïve

**Principle landed:** *Idempotency is a gateway concern, not a server concern. The Tool stays naïve. The gateway holds the dedupe table.*

> *"The Tool didn't know it was being retried. The DB didn't know it was being retried. The gateway knew. That's the whole pattern."*

→ Back to: [`4.4-idempotency.md`](../../4.4-idempotency.md) — and onward to Module 05 (the vocabulary closing).
