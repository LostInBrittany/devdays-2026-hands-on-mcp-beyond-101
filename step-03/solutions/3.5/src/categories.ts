// The six monster categories in the RAGmonsters domain.
//
// These match the `categories.category_name` values seeded in step-02's
// db/seed.sql. We expose them here as a closed enum so the typed Tool
// (search_monsters_by_category) and the Resource (monsters://categories)
// agree on the same vocabulary.
//
// v2 design choice — the lesson behind this file:
//
//   v1 exposed `monsters.monster_type` as a free-form VARCHAR(100). The LLM
//   had to guess what valid values were. It guessed wrong, confidently.
//
//   v2 wraps the bounded categorisation at the API layer. The LLM literally
//   cannot ask for `category: "banana"` — Zod rejects it before any handler
//   runs. The schema is the contract.

export const CATEGORIES = [
  "Elemental",
  "Construct/Artificial",
  "Anomaly/Phenomenon",
  "Nature/Organic",
  "Celestial/Cosmic",
  "Spirit/Ethereal",
] as const;

export type Category = (typeof CATEGORIES)[number];
