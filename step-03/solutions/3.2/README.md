# Solution — Phase 3.2 (Hypermedia + pagination)

3.1 plus structured response envelopes with `next` hints. All three Tools wrap their output in `{ data, summary, source, next }`. `search_monsters_by_category` also gains an `offset` input for pagination.

## What changed from 3.1

- **Modified:** `src/tools/search-monsters-by-category.ts` — `offset` input added; envelope output; `next` includes pagination, drill-down, and forward-compatible `compare_monsters` hints. Logs `next.length` in the result line.
- **Modified:** `src/tools/get-monster-details.ts` — envelope output; `next` suggests peers in the same category. Error path also returns an envelope with its own `next`.
- **Modified:** `src/tools/list-categories.ts` — envelope output; `next` is one suggestion per category.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.2/src/* src/
```

Restart your dev terminal.

## What this state delivers

The LLM no longer has to invent what to do after a Tool call — the server tells it. Pagination just works. `compare_monsters` is mentioned in `next` even though it doesn't exist yet (forward-compatible).

Dev terminal now shows `next=N` per result line — you can see hypermedia hints working.

**Principle landed:** *Tell the LLM what to do next.*

→ Next: [`3.3-precache-resources.md`](../../3.3-precache-resources.md) — actually cache the things you said were cacheable.
