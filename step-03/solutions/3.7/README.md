# Solution — Phase 3.7 (Auth is not optional)

3.6 plus tool-level authorisation. Every primitive checks a per-call permission before running. The principal comes from the `MCP_PRINCIPAL` env var (default `guest`).

## What changed from 3.6

- **New file:** `src/auth.ts` — defines `PERMISSIONS` (guest vs developer), exports `principal()`, and three helpers: `checkAuth` (Tools), `checkAuthResource` (Resources), `checkAuthPrompt` (Prompts). Each helper returns `null` if allowed or a properly-shaped denied envelope otherwise. Every decision logs.
- **Modified:** every handler — adds a `const denied = checkAuth*(...); if (denied) return denied;` guard at the top, before any other logic.

Files updated:
- `src/tools/search-monsters-by-category.ts`, `src/tools/get-monster-details.ts`, `src/tools/list-categories.ts`, `src/tools/compare-monsters.ts`
- `src/resources/monsters-categories.ts`, `src/resources/schema.ts`
- `src/prompts/analyze-monster.ts`

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.7/src/* src/
```

Cold restart your dev terminal. Try with the default principal (`guest`):

```bash
bun --hot run src/server.ts
```

Ask Claude Code: *"Compare Thunderclaw and Aquafrost."* — denied. Dev terminal shows `auth ... decision=deny`.

Restart with the developer principal:

```bash
MCP_PRINCIPAL=developer bun --hot run src/server.ts
```

Same prompt — allowed. Dev terminal shows `auth ... decision=allow` followed by the actual `compare_monsters` call.

## What this state delivers

Per-call authorization. Same code path; the principal decides what runs. The structure is exactly what v3's real OAuth-token auth will plug into.

**Principle landed:** *Auth is not optional — even over stdio.*

→ Next: [`3.8-golden-tasks.md`](../../3.8-golden-tasks.md) — test what the LLM actually does.
