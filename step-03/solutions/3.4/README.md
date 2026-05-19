# Solution — Phase 3.4 (`compare_monsters` Tool)

3.3 plus a fourth Tool — `compare_monsters` — added in response to observed LLM behaviour. The use case asked for it; v2 grants it. Logs include the truncated verdict.

## What changed from 3.3

- **New file:** `src/tools/compare-monsters.ts` — `compare_monsters(name_a, name_b)`. Fetches both monsters in one query, pulls augments and hindrances in parallel, computes a deterministic server-side verdict, returns a structured comparison envelope. Logs `logCall` on entry and `logResult` with the verdict summary on completion.
- **Modified:** `src/server.ts` — imports and registers `compare_monsters` alongside the other Tools.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.4/src/* src/
```

Cold restart your dev terminal so the cache re-initializes.

## What this state delivers

The LLM now answers "who would win — X vs. Y?" in **one** Tool call, with a deterministic verdict. The `next` hints from 3.2's `search_monsters_by_category` that mentioned `compare_monsters` are now live — no code change needed in those Tools; they were already forward-compatible.

**Principle landed:** *Add a verb when the use case demands it.*

→ Next: [`3.5-prompt-as-recipe.md`](../../3.5-prompt-as-recipe.md) — the Prompt becomes a multi-step recipe.
