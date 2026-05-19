// Smoke test for step-03's walkthroughs.
//
// Runs every SQL query the walkthrough files ask participants to write,
// against the seeded PGlite database, and prints what it sees. This is the
// instructor-side proof that the recipes in 2.0..2.5 actually work end-to-end.
//
// Prerequisite: `pglite/`'s `bun run start:pg` must be running on 127.0.0.1:5432.
//
// Usage: bun run scripts/smoke.ts

import { sql } from "../src/db.ts";
import { CATEGORIES } from "../src/categories.ts";

const banner = (s: string) => console.log(`\n=== ${s} ===`);
const ok = (label: string, count: number, sample?: unknown) => {
  const tag = count > 0 ? "✓" : "✗";
  console.log(`${tag} ${label}: ${count} row(s)`);
  if (sample !== undefined && count > 0) console.log(`  sample: ${JSON.stringify(sample)}`);
};

let failures = 0;
const fail = (label: string, err: unknown) => {
  failures += 1;
  console.log(`✗ ${label} — ${(err as Error).message}`);
};

try {
  // ---------- 2.0 BASELINE ----------

  banner("2.0 baseline — search_monsters_by_category('Elemental', 10)");
  try {
    const rows = await sql`
      SELECT m.name, m.monster_type, m.habitat, m.rarity
      FROM monsters m
      JOIN subcategories s ON s.subcategory_id = m.subcategory_id
      JOIN categories c ON c.category_id = s.category_id
      WHERE c.category_name = ${"Elemental"}
      ORDER BY m.name
      LIMIT ${10}
    `;
    ok("search_monsters_by_category", rows.length, rows[0]);
  } catch (e) { fail("search_monsters_by_category", e); }

  banner("2.0 baseline — get_monster_details('Thunderclaw')");
  try {
    const rows = await sql`
      SELECT
        m.name, m.monster_type, m.habitat, m.biome, m.rarity,
        m.height, m.weight, m.appearance,
        m.primary_power, m.secondary_power, m.special_ability,
        m.weakness, m.behavior_ecology, m.notable_specimens
      FROM monsters m
      WHERE LOWER(m.name) = LOWER(${"Thunderclaw"})
      LIMIT 1
    `;
    ok("get_monster_details", rows.length, rows[0] ? { name: rows[0].name, type: rows[0].monster_type } : null);
  } catch (e) { fail("get_monster_details", e); }

  banner("2.0 baseline — list_categories()");
  try {
    const rows = await sql`
      SELECT category_name, description FROM categories ORDER BY category_name
    `;
    ok("list_categories", rows.length, rows[0]);
    const names = rows.map((r) => r.category_name).sort();
    const expected = [...CATEGORIES].sort();
    const match = JSON.stringify(names) === JSON.stringify(expected);
    if (!match) {
      failures += 1;
      console.log(`✗ enum drift: code has ${JSON.stringify(expected)}, DB has ${JSON.stringify(names)}`);
    } else {
      console.log(`✓ enum matches DB exactly`);
    }
  } catch (e) { fail("list_categories", e); }

  // ---------- 2.2 NEXT HYPERMEDIA + PAGINATION ----------

  banner("2.2 pagination — count(*) for 'Elemental'");
  try {
    const rows = await sql<{ total: number }[]>`
      SELECT count(*)::int AS total
      FROM monsters m
      JOIN subcategories s ON s.subcategory_id = m.subcategory_id
      JOIN categories c ON c.category_id = s.category_id
      WHERE c.category_name = ${"Elemental"}
    `;
    ok("pagination total", rows[0] ? 1 : 0, rows[0]);
    const total = rows[0]!.total;
    console.log(`  → pagination hint will fire if total > limit (total=${total})`);
  } catch (e) { fail("pagination count", e); }

  // ---------- 2.3 CACHING (same queries — verifying the init payload) ----------

  banner("2.3 init cache — subcategories with parent");
  try {
    const rows = await sql`
      SELECT s.subcategory_name, c.category_name
      FROM subcategories s
      JOIN categories c ON c.category_id = s.category_id
      ORDER BY c.category_name, s.subcategory_name
    `;
    ok("subcategories join", rows.length, rows[0]);
  } catch (e) { fail("subcategories join", e); }

  // ---------- 2.4 COMPARE MONSTERS ----------

  banner("2.4 compare_monsters('Thunderclaw', 'Aquafrost')");
  try {
    const rows = await sql<
      { monster_id: number; name: string; monster_type: string; category_name: string }[]
    >`
      SELECT m.monster_id, m.name, m.monster_type, m.habitat, m.rarity,
             m.primary_power, c.category_name
      FROM monsters m
      JOIN subcategories s ON s.subcategory_id = m.subcategory_id
      JOIN categories c ON c.category_id = s.category_id
      WHERE LOWER(m.name) IN (LOWER(${"Thunderclaw"}), LOWER(${"Aquafrost"}))
    `;
    ok("compare_monsters main query", rows.length, rows.map((r) => r.name));

    if (rows.length === 2) {
      const a = rows[0]!;
      const b = rows[1]!;
      const [aAug, aHin, bAug, bHin] = await Promise.all([
        sql`SELECT target_name, modifier FROM augments WHERE monster_id = ${a.monster_id}`,
        sql`SELECT target_name, modifier FROM hindrances WHERE monster_id = ${a.monster_id}`,
        sql`SELECT target_name, modifier FROM augments WHERE monster_id = ${b.monster_id}`,
        sql`SELECT target_name, modifier FROM hindrances WHERE monster_id = ${b.monster_id}`,
      ]);
      console.log(`  ${a.name} augments: ${aAug.length}, hindrances: ${aHin.length}`);
      console.log(`  ${b.name} augments: ${bAug.length}, hindrances: ${bHin.length}`);
      if (aAug.length > 0) console.log(`  ${a.name} aug sample: ${JSON.stringify(aAug[0])}`);
    }
  } catch (e) { fail("compare_monsters", e); }

  // ---------- DATA HEALTH ----------

  banner("Data health — totals");
  try {
    const [{ count: monsterCount }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM monsters`;
    const [{ count: catCount }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM categories`;
    const [{ count: subCount }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM subcategories`;
    console.log(`  monsters:      ${monsterCount}`);
    console.log(`  categories:    ${catCount}`);
    console.log(`  subcategories: ${subCount}`);
  } catch (e) { fail("data health", e); }

  banner("Summary");
  if (failures === 0) {
    console.log("✓ all walkthrough queries pass against the seeded DB");
  } else {
    console.log(`✗ ${failures} failure(s) — fix walkthroughs before teaching`);
  }
} finally {
  await sql.end();
}
