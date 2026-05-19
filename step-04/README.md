# Step 04 — v3 scales: "When MCP servers don't stay in their perimeter"

> Same v2 server. **Don't touch it.** Compose it with a second server behind a gateway you build.

**Time:** ~65 minutes of coding (after a 12-minute conceptual teaser)
**Maturity rung:** v3 — *MCP scales*
**Goal:** take the v2 catalog from step-03/solutions/3.8/, mount it unchanged, add a second stateless server (arena), and build a typed MCP gateway in front of both that handles namespacing, audit, and idempotency. **The catalog's source code is never edited in this module — that's the point.**

## How this step is structured

We build **incrementally, in five iterations.** Each iteration is a single architectural decision, named for the principle it teaches.

| Phase | What lands | Principle | Time | Walkthrough |
|---|---|---|---|---|
| **4.0** | Arena server (stateless, second MCP), no gateway yet | *Composition happens at the agent layer. The LLM is the conductor.* | 10 min | [`4.0-add-arena.md`](./4.0-add-arena.md) |
| **4.1** | (observation pass — no code) | *Nothing here is broken. Everything here scales badly.* | 5 min | [`4.1-where-this-hurts.md`](./4.1-where-this-hurts.md) |
| **4.2** | TypeScript MCP gateway — merge, route, audit | *Cross-cutting concerns belong in one place.* | 20 min | [`4.2-build-gateway.md`](./4.2-build-gateway.md) |
| **4.3** | Live rename of a catalog tool — watch the contract break | *Your tool schemas are your public API.* | 10 min | [`4.3-tools-are-contracts.md`](./4.3-tools-are-contracts.md) |
| **4.4** | Idempotency dedupe table in the gateway | *Idempotency is a gateway concern, not a server concern.* | 15 min | [`4.4-idempotency.md`](./4.4-idempotency.md) |

**Work the phases in order.** Each one is small; the build accumulates. Walkthroughs are self-contained — read top-to-bottom, type, observe.

## Architecture (after 4.2)

```
                       Claude Code
                            │
                            ▼ (stdio, MCP)
                ┌───────────────────────┐
                │     mcp-gateway       │  ← you build this (4.2)
                │  - mergeManifests()   │
                │  - routeToolCall()    │
                │  - auditLine()        │  → gateway/logs/audit.log
                │  - idempotency table  │  ← extended in 4.4
                └───────┬───────────┬───┘
                        │           │     (stdio, MCP, child of gateway)
                        ▼           ▼
              catalog-server    arena-server
                  │                   │
                  ▼                   ▼
              PGlite             arena-server/data/
            (127.0.0.1:5432)     (battle-log.jsonl)
              ▲
              │ (same PGlite as step-02 and step-03)
```

**The catalog-server is `step-03/solutions/3.8/` mounted unchanged.** Same database, same server source. What you build in this module is what surrounds it.

> **Single-connection limit:** PGlite-over-socket only accepts one TCP client at a time. The gateway spawns catalog-server as its child, which connects. **Close any other Claude Code session** (step-02 or step-03) before starting step-04 — only one MCP can hold the PGlite slot.

## Setup (do this once, before phase 4.0)

```bash
cd step-04
bun install
```

Three runtime dependencies (pinned in `package.json`, all old enough to satisfy the 10-day `minimumReleaseAge`):

- `@modelcontextprotocol/sdk` — for both the gateway's server-side and client-side halves
- `postgres` — the porsager client catalog uses for tagged-template SQL
- `zod` — schemas for arena's Tool inputs

## Make sure the shared database is running

```bash
# In pglite/ — leave alive across the whole workshop day
cd pglite
bun run start:pg
```

If you already booted it for step-02 or step-03, don't restart it. Step-04 connects to the same instance.

## The .mcp.json shape, by phase

| Phase | `.mcp.json` shape |
|---|---|
| 4.0 / 4.1 | **Two entries** — `catalog-server` and `arena-server` registered separately. Two `env` blocks. |
| 4.2 → 4.4 | **One entry** — `mcp-gateway` only. The gateway spawns catalog + arena internally. One `MCP_PRINCIPAL` env at the gateway. |

`step-04/.mcp.json` ships in the 4.0/4.1 shape. Iteration 4.2 collapses it to one entry; the walkthrough shows the exact new contents.

## Connect Claude Code

```bash
cd step-04
claude
```

In 4.0/4.1 you'll see **two** MCP approval prompts (catalog + arena). In 4.2+ you'll see **one** (gateway). Approve, then `/mcp` to verify.

## The rhythm of each phase

Same as step-03:
1. **Why** — the design gap and the principle. Read first.
2. **Files touched** — what you'll create or modify.
3. **The change / steps** — exact code or commands.
4. **Verify** — quick connectivity / state check.
5. **Observe** — a prompt to run, and what to watch in the logs.

## Reference solutions

`solutions/4.0/` … `solutions/4.4/` each contains the files that change at that iteration (cumulative). See [`solutions/README.md`](./solutions/README.md). Use them as comparison points, not copy targets — typing the gateway *is* the lesson.

## Land the thesis

When all five phases are done:

| Across the climb | v3 — what you can now do |
|---|---|
| Composition | Two servers, one orchestrating LLM, one prompt that hops cleanly across both |
| Gateway | One entry, one audit log, one place to add auth + rate-limit when the fleet grows |
| Contracts | Tool schemas are your public API — rename costs |
| Idempotency | LLM retries are deduped at the fleet edge; underlying Tools stay naïve |

**You never touched the v2 server. Not one line.** That's v3 — what lives *between* servers, not inside them.

## After this module

Module 05 is a 20–30 min vocabulary closing — *governed*. It names what we didn't have time to build:
- **Auth at scale** — OAuth 2.1 + RFC 8707 audience-bound tokens (what we did at the principal layer in 3.7, multiplied across the fleet)
- **Discovery + registries** — the pirate-clone story (when the LLM reaches for a well-known server name)
- **Circuit breakers + per-caller quotas** — the next step up from 4.4's idempotency
- **The lethal trifecta** — combining untrusted data + tool calls + exfiltration channels
- **OWASP MCP Top 10, mcp-scan, two-step commit, audit trail accountability**

And — name-only in 4C — the four OSS gateways that are the production version of what you just built: **Solo.io agentgateway**, **mcp-gateway-registry**, **mcp-proxy**, **Kong OSS MCP gateway**.

## Common gotchas

| Symptom | Likely cause | Fix |
|---|---|---|
| `bun install` blocked by `minimumReleaseAge` | A dep is younger than 10 days | Wait or add to `minimumReleaseAgeExcludes` after review |
| Gateway can't spawn child | `bun` not on `PATH` of the child env | The `children.ts` spawns with `process.env` merged — usually fine; check the child's stderr |
| `/mcp` shows neither catalog nor arena (4.0/4.1) | Didn't approve both prompts | Restart Claude Code; both prompts should appear |
| `/mcp` shows two tools with the same name | You're still in 4.0 or 4.1 without namespacing | That's expected pre-4.2; the gateway adds the prefix |
| `connection refused` on port 5432 | `pglite/`'s `start:pg` not running | Start it in the `pglite/` terminal |
| Audit log stays empty (4.2+) | `auditLine` still a TODO stub | Implement it as in 4.2 Step 2 |
| Dedupe doesn't fire (4.4) | `idempotency.ts` `check`/`record` still stubs, OR the LLM generated a different key on retry | Implement the table; for retries, instruct the LLM to reuse the explicit key |
| `pit_monsters` showing after revert (4.3) | Gateway not restarted | The gateway caches the child manifest on spawn — restart it |

---

**Ready?** → Open [`4.0-add-arena.md`](./4.0-add-arena.md).
