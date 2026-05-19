# Hands-on MCP Servers Beyond 101

> Good Practices, Design Choices and Their Consequences

A 6-hour hands-on workshop in which you build **one MCP server** and climb it through four rungs of the maturity ladder. By the end of the day you'll have one codebase you understand at every layer — and a real feel for what each rung buys you.

**Event:** DevDays Europe 2026, Vilnius — 2026-05-19
**Instructor:** [Horacio Gonzalez](https://github.com/LostInBrittany) ([@LostInBrittany](https://twitter.com/LostInBrittany)) — Head of DevRel, [Clever Cloud](https://www.clever-cloud.com)

## Why this workshop exists

Anyone in the room can build a quick-and-dirty MCP server. The SDK lets you ship one in five lines of TypeScript — you'll do exactly that in step 01.

The uncomfortable thing: **a quick-and-dirty MCP server is more dangerous than a quick-and-dirty API.** A quick-and-dirty API has a human deciding whether to call it. A quick-and-dirty MCP has a non-deterministic language model that just *did*.

When chatbots hallucinate, you laugh. When agents hallucinate, they `DROP DATABASE`.

This workshop is about climbing past "it works."

## The maturity ladder

One server (RAGmonsters — a fictional monster database), four rungs:

| Rung | Lesson |
|---|---|
| **v1 — MCP works** | A generic server "works" and is dangerous |
| **v2 — MCP is shaped** | Tools + Resources + Prompts, designed with intent |
| **v3 — MCP scales** | Auth, retries, idempotency, errors the LLM can act on |
| **v4 — MCP is governed** | Safety, audit, two-step commit, risk tiers |

## Prerequisites

- **Bun** 1.1+ ([install instructions](https://bun.sh/docs/installation)) — runtime, package manager, and TypeScript runner in one
- **Git** — for cloning this repo
- An **agentic coding assistant** — [Claude Code](https://claude.com/claude-code), [GitHub Copilot](https://github.com/features/copilot), [OpenAI Codex](https://openai.com/codex), [Google Antigravity](https://antigravity.google/), or equivalent
- Comfort with: HTTP/APIs, basic TypeScript/JavaScript, the terminal

No prior MCP experience required.

### Why Bun and not Node

Two reasons:
1. **Speed.** Bun installs in seconds, runs TypeScript natively (no transpile step), and ships with a built-in test runner.
2. **Security.** Bun supports `minimumReleaseAge` in `bunfig.toml`. We use it to refuse any dependency version published less than **10 days ago**. After the Shai-Hulud wave of fast-publish npm supply-chain attacks, "the latest version" is no longer a safe default. We want versions that have had time to be scrutinized.

Every step ships its own `bunfig.toml` with that defense baked in — see `step-01-opening/bunfig.toml`.

## Setup

```bash
# Clone the workshop repo
git clone https://github.com/LostInBrittany/devdays-2026-hands-on-mcp-beyond-101.git

# Enter the first step (each step is a self-contained mini-project)
cd devdays-2026-hands-on-mcp-beyond-101/step-01-opening

# Install dependencies (Bun will respect the 10-day minimum age gate)
bun install

# Run the Weather Tool — your soft landing
bun run dev
```

If `bun install` reports it can't find a version satisfying the age gate, that means a dependency is too new. Either wait a day, or add the package to `minimumReleaseAgeExcludes` in `bunfig.toml` (only after you've reviewed the change).

## Workshop structure

Each step is a **fully self-contained mini-project** with its own `package.json`, `bunfig.toml`, `tsconfig.json`, `README.md`, and `src/`. Work through them in order:

```bash
cd step-NN-... && bun install && bun run dev
```

Why per-step instead of one shared install? Because **dependencies grow with maturity**. Step 01 has just `@modelcontextprotocol/sdk` and `zod`. Later steps add a Postgres driver, then OAuth helpers, then audit-log infrastructure. The dependency creep from v1 → v4 is itself part of the lesson — peek at each `package.json` to see what each rung costs.

| # | Step | Maturity rung | Time |
|---|---|---|---|
| 01 | [Opening: Welcome & soft landing](./step-01/) | — | 20 min |
| 02 | [Module 1 — v1: "It works" (PG MCP disaster)](./step-02/) | v1 | 80 min |
| 03 | [Module 2 — v2: "It's shaped" (rebuild with primitives)](./step-03/) | v2 | 80 min |
| 04 | Module 3 — v3: "It scales" (auth, errors, idempotency) | v3 | 70 min |
| 05 | Module 4 — v4: "It's governed" (risk, audit, two-step commit) | v4 | 60 min |
| 06 | Closing & recap | — | 20 min |

Steps 02–06 are scaffolded as the workshop is built. Each step folder will appear here.

## Pair programming

Working in pairs is strongly encouraged. One person drives, the other navigates. Switch when you want.

## Reference solutions

For each step, a worked solution lives in a separate branch (`solution/step-NN`). Use it if you fall behind or want to compare your work after the fact.

## License & credits

MIT licensed. RAGmonsters is a fictional monster database created for this workshop and inspired by the long Pokemon-clone tradition.

This workshop is adapted from the 3-hour Devoxx France 2026 deep dive ([Paris, 2026-04-24](https://www.devoxx.fr)) and the shorter Devoxx UK version. The talk slides are not redistributed here.
