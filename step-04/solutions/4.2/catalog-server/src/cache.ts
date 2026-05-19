// Module-level cache for bounded, slow-changing Resource data.
//
// 3.3 design choice — what to cache:
//   - `categories`     — 6 rows, hand-curated in seed, never changes during a session
//   - `subcategories`  — ~12 rows, same stability profile
//
// What we do NOT cache here:
//   - Per-monster details — change frequency unknown, treat as live
//   - Search results — depend on input parameters, not cacheable as a unit

import { sql } from "./db.ts";
import { logEvent } from "./log.ts";

type CategoryRow = { category_name: string; description: string };
type SubcategoryRow = { subcategory_name: string; category_name: string };

let cachedCategories: CategoryRow[] | null = null;
let cachedSubcategories: SubcategoryRow[] | null = null;

export async function initializeCache(): Promise<void> {
  const t0 = Date.now();
  logEvent("cache=init starting");

  cachedCategories = await sql<CategoryRow[]>`
    SELECT category_name, description
    FROM categories
    ORDER BY category_name
  `;

  cachedSubcategories = await sql<SubcategoryRow[]>`
    SELECT s.subcategory_name, c.category_name
    FROM subcategories s
    JOIN categories c ON c.category_id = s.category_id
    ORDER BY c.category_name, s.subcategory_name
  `;

  logEvent(
    `cache=init done categories=${cachedCategories.length} subcategories=${cachedSubcategories.length} ${Date.now() - t0}ms`,
  );
}

export function getCachedCategories(): CategoryRow[] {
  if (!cachedCategories) {
    throw new Error("Cache not initialized. Call initializeCache() before reading.");
  }
  return cachedCategories;
}

export function getCachedSubcategories(): SubcategoryRow[] {
  if (!cachedSubcategories) {
    throw new Error("Cache not initialized. Call initializeCache() before reading.");
  }
  return cachedSubcategories;
}
