# Solution — Phase 3.5 (Prompt as recipe)

3.4 plus a rewritten `analyze_monster` Prompt that names Tools, prescribes order, and locks the output structure.

## What changed from 3.4

- **Modified:** `src/prompts/analyze-monster.ts` — handler now returns a four-step recipe (`get_monster_details` → `search_monsters_by_category` → `compare_monsters` → write four headed sections). The Prompt references `compare_monsters`, which only exists from 3.4 onwards — *the Prompt evolves with the Tool surface.* The `logCall` line from 3.0 still fires per Prompt invocation.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.5/src/* src/
```

Cold restart your dev terminal so the cache re-initializes.

## What this state delivers

Running `analyze_monster` twice now produces the same three Tool calls in the same order and the same four-section output structure. The natural-language content varies; the structure does not. `logs/server.log` shows the consistent sequence both times.

**Principle landed:** *A Prompt is a workflow, not a question.*

→ Next: [`3.6-validate-and-sanitize.md`](../../3.6-validate-and-sanitize.md) — make outputs trustworthy.
