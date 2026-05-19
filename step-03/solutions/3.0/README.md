# Solution — Phase 3.0 (Baseline)

The scaffold's five TODO handler bodies, filled in.

## What's here

```
src/
├── categories.ts                            (unchanged)
├── db.ts                                    (unchanged)
├── server.ts                                (unchanged — registers all 5 primitives)
├── tools/
│   ├── search-monsters-by-category.ts       ← handler body filled in
│   ├── get-monster-details.ts               ← handler body filled in
│   └── list-categories.ts                   ← handler body filled in
├── resources/
│   └── monsters-categories.ts               ← handler body filled in
└── prompts/
    └── analyze-monster.ts                   ← handler body filled in
```

## How to use this solution

If you're behind or want to verify your work:

```bash
# from step-03/
cp -r solutions/3.0/src/* src/
```

Then restart your dev terminal (`bun --hot run src/server.ts`).

## What this state delivers

Three Tools, one Resource, one Prompt — all with real bodies, all wired up. The server genuinely answers questions about RAGmonsters: parameterised SQL through the `postgres` tagged template, Zod-validated input on every Tool, no schema dump, no injection surface.

**Principle landed:** *Schema is the contract.*

→ Next: [`3.1-curated-schema.md`](../../3.1-curated-schema.md) — add a hand-written `monsters://schema` Resource.
