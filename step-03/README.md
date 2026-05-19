# Step 03 — v2 shaped: "Build the shape, all of it"

> Same database. Different server. **One we wrote.**

**Time:** ~100 minutes of coding (after a 20-minute conceptual preview before the morning break)
**Maturity rung:** v2 — *MCP is shaped*
**Goal:** rebuild RAGmonsters as a server that is **fit to ship** — three primitives used deliberately, every input validated, every output sanitised, every call authorised, every tool sequence testable. Then re-run Module 1's four disaster prompts and watch what doesn't happen.

## How this step is structured

We build **incrementally, in nine phases.** Each phase is a single design decision, named for the principle it teaches. Phases 3.0 → 3.5 are the *primitives* track (Devoxx UK lesson 1). Phases 3.6 → 3.8 are the *fit-to-ship* track — validation, auth, behaviour testing (Devoxx UK lessons 2, 3, 4).

| Phase | What lands | Principle | Time | Walkthrough |
|---|---|---|---|---|
| **3.0** | Baseline — 3 Tools, 1 Resource, 1 Prompt **plus a logger** | *Schema is the contract; what the LLM does is observable.* | 38 min | [`3.0-baseline.md`](./3.0-baseline.md) |
| **3.1** | Curated `monsters://schema` Resource | *Expose intent, not structure.* | 6 min | [`3.1-curated-schema.md`](./3.1-curated-schema.md) |
| **3.2** | `next` hypermedia + pagination | *Tell the LLM what to do next.* | 12 min | [`3.2-next-hypermedia.md`](./3.2-next-hypermedia.md) |
| **3.3** | Pre-cached Resources at server init | *If you say cacheable, make it cacheable.* | 8 min | [`3.3-precache-resources.md`](./3.3-precache-resources.md) |
| **3.4** | `compare_monsters` as a 4th Tool | *Add a verb when the use case demands it.* | 10 min | [`3.4-compare-monsters.md`](./3.4-compare-monsters.md) |
| **3.5** | Prompt rewritten as a multi-step recipe | *A Prompt is a workflow, not a question.* | 6 min | [`3.5-prompt-as-recipe.md`](./3.5-prompt-as-recipe.md) |
| **3.6** | Output sanitisation + output schemas | *Outputs are inputs. Treat them as untrusted.* | 12 min | [`3.6-validate-and-sanitize.md`](./3.6-validate-and-sanitize.md) |
| **3.7** | Tool-level authorisation (`MCP_PRINCIPAL`) | *Auth is not optional — even over stdio.* | 8 min | [`3.7-auth.md`](./3.7-auth.md) |
| **3.8** | Golden-task harness | *Test what the LLM actually does.* | 12 min | [`3.8-golden-tasks.md`](./3.8-golden-tasks.md) |

**Work the phases in order.** Each one builds on the previous one's design surface. The walkthrough files are self-contained — read them top to bottom and you can complete each phase without other context.

**Logging is threaded through every phase.** 3.0 introduces `src/log.ts`; every handler from 3.0 onwards calls `logCall`/`logResult`. Each iteration's "Observe" step asks you to watch `logs/server.log` — that's where you see what the LLM is actually doing.

## Architecture (same database as step-02, different server)

```
Terminal 1 (in pglite/)               Terminal 2 (in this step)
┌──────────────────────┐               ┌──────────────────────┐
│ bun run start:pg     │               │ claude               │
│  (in pglite/)        │               │  (in step-03/)       │
│                      │               │                      │
│ PGlite (WASM)        │               │ reads .mcp.json      │
│   +                  │               │   ↓ spawns           │
│ PGLiteSocketServer   │ ◄──── pg ─────┤ ragmonsters-server   │
│ on 127.0.0.1:5432    │   protocol    │   (bun run src/      │
│                      │   (postgres   │      server.ts)      │
│ 30 monsters seeded   │    porsager)  │                      │
└──────────────────────┘               └──────────────────────┘
```

**Same PGlite as Module 1** — the database lives in [`pglite/`](../pglite/) and is shared across every PG-touching step. The data hasn't changed; what changed is the server in front of it. **That's the lesson.**

> **Single-connection limit:** PGlite-over-socket only accepts one TCP client at a time. **Close your Module 1 Claude Code session** (the one in `step-02/`) before you start this one, or step-03's server won't be able to connect.

## Setup (do this once, before phase 3.0)

This step is a fully self-contained mini-project. From this folder:

```bash
bun install
```

Three runtime dependencies install (pinned versions in `package.json`, all old enough to satisfy the 10-day `minimumReleaseAge` gate):

- `@modelcontextprotocol/sdk` — the official MCP SDK (high-level `McpServer` class with `registerTool`/`registerResource`/`registerPrompt`)
- `postgres` (porsager/postgres) — tagged-template-literal Postgres client. Parameterised queries by default.
- `zod` — schema validator. Every Tool's input shape is a Zod schema. From 3.6 onwards, output shapes are Zod schemas too.

## Make sure the shared database is running

```bash
# In pglite/ — leave this terminal alive across the whole workshop day
cd pglite
bun run start:pg
```

Expected output:
```
[pg] seeded — monsters table has 30 row(s)
[pg] PGLiteSocketServer listening on 127.0.0.1:5432
```

If you already booted it for step-02, **don't restart it** — same database, the schema you destroyed in step-02 carries forward into step-03 (that's part of the v2 lesson).

## Connect Claude Code

This step ships a project-scoped `.mcp.json`. In a **new terminal** (the `pglite/` `start:pg` keeps running):

```bash
cd step-03
claude
```

Approve the *"Allow this project's MCP server 'ragmonsters-server'?"* prompt. Then:

```
/mcp
```

You should see `ragmonsters-server` connected with three Tools, one Resource, and one Prompt listed. **The handlers return TODO stub responses right now** — that's by design. The scaffold compiles and connects so you can verify the wiring before writing any logic.

## Running the server during the build

Two env vars matter as you progress:

| Env var | When you'll set it | What it does |
|---|---|---|
| `MCP_PRINCIPAL` | From phase 3.7 onwards | Sets the principal (`guest` default; `developer` unlocks `compare_monsters`) |
| `GOLDEN_LOG` | In phase 3.8 OBSERVE | When `1`, every primitive call also appends a JSON line to `logs/golden.jsonl` for the test harness |

A typical "everything on" launch line by phase 3.8:

```bash
GOLDEN_LOG=1 MCP_PRINCIPAL=developer bun --hot run src/server.ts
```

## The rhythm of each phase

Every phase walkthrough follows the same shape:

1. **Why** — the design gap the previous phase left, and the principle that closes it. Read this **before** touching code.
2. **Files touched** — a one-line list of what you'll create or modify.
3. **The change** — exact code to add or replace. Hot-reload (`bun --hot`) picks it up automatically.
4. **Verify** — three quick checks: dev terminal compiles, `/mcp` shows the new state, then run the OBSERVE prompt.
5. **Observe** — a specific prompt to send Claude Code, and **what to watch for in `logs/server.log`.**

Skip step 1 and you'll type code without learning the lesson. Skip step 5 and you'll miss the point — every iteration's value lives in the *Observe* beat.

## Land the thesis

When all nine phases are done, re-run Module 1's four disaster prompts against your final 3.8 server. Watch what doesn't happen.

```
            v1 (Module 1)                          v2 (you built this)
            ────────────────                       ────────────────────
Prompt 1 →  Token bloat, schema dump               Bounded, typed Tools (3.0)
Prompt 2 →  Schema-dance + guessing                Deterministic Tool: server returns the joined matchup data, LLM writes the verdict (3.4)
Prompt 3 →  Write succeeds silently                No write Tool exists (3.0)
Prompt 4 →  ALTER TABLE bypass succeeds            No DDL Tool exists (3.0)
            ────────────────                       ────────────────────
NEW v2 cases:
Adversarial output       n/a (would reach the LLM) Redacted before return (3.6)
Privilege escalation     n/a (no auth concept)     Tool-level deny + log (3.7)
LLM behaviour regression invisible                 Golden tasks catch it (3.8)
```

**Nothing in v2 patched v1's vulnerabilities. v2 simply didn't expose the attack surface in the first place.** And the three new rows — output sanitisation, tool-level auth, behaviour testing — are the difference between *"this MCP works"* and *"this MCP is fit to ship."*

That's the thesis. You'll build it.

## Reference solutions

If you fall behind: `solutions/3.0/` … `solutions/3.8/` each contains a complete drop-in `src/` tree at that phase's completion. See [`solutions/README.md`](./solutions/README.md). Use them as comparison points, not copy targets — **the build *is* the lesson.**

## Common gotchas (across all phases)

| Symptom | Likely cause | Fix |
|---|---|---|
| `bun install` blocked by `minimumReleaseAge` | A dep is younger than 10 days | Wait, or add the package to `minimumReleaseAgeExcludes` after reviewing |
| `/mcp` doesn't show `ragmonsters-server` | Not launched from `step-03/`, or didn't approve the prompt | `cd step-03 && claude` — `.mcp.json` is project-scoped |
| Tools return errors when called | DB connection failing — PGlite not running or held by another client | Check `pglite/`'s `bun run start:pg` is still alive; close any other Claude Code session |
| `connection refused` on port 5432 | `pglite/`'s `start:pg` not running | Open the `pglite/` terminal, `bun run start:pg` |
| Zod validation rejects valid input | Case-sensitivity mismatch (`"elemental"` vs. `"Elemental"`) | Enum values match `categories.category_name` exactly |
| Server breaks on first request with cryptic JSON-RPC error | `console.log` somewhere instead of `console.error` | stdout is the JSON-RPC channel — all logging uses `console.error` (see `src/log.ts`) |
| Dev terminal shows nothing when the LLM acts | Looking at the wrong terminal | `console.error` goes to *the Bun process's stderr* — that's the terminal you ran `bun --hot run` in |
| Hot reload doesn't pick up Tool changes | Claude Code caches the tool list at handshake | `/mcp` to force a re-list, or restart Claude Code |
| Hot reload doesn't reinitialize the cache (3.3+) | `bun --hot` doesn't re-run top-level code | Cold restart: Ctrl-C + re-run `bun --hot run src/server.ts` |
| `auth_denied` even though it shouldn't be (3.7+) | `MCP_PRINCIPAL` env var didn't propagate | Restart the server with `MCP_PRINCIPAL=developer bun --hot run src/server.ts` |
| `logs/golden.jsonl` is empty (3.8) | `GOLDEN_LOG=1` not set | Restart server with `GOLDEN_LOG=1 bun --hot run src/server.ts` |

Phase-specific gotchas are inside each walkthrough file.

## After the workshop

This step is the foundation for Module 04 (v3 — scales). Keep your `ragmonsters-server` working — we'll extend it with composition patterns, gateways, and contracts. **Same codebase, what changes is what surrounds it.**

The fit-to-ship pieces you built in 3.6–3.8 don't go away in v3 — v3 layers more on top.

---

**Ready?** → Open [`3.0-baseline.md`](./3.0-baseline.md).
