// Tool: search_monsters_by_category
//
// The flagship demo of v2's design. Instead of letting the LLM write arbitrary
// SQL (v1 did exactly that and it bit us), we expose a typed Tool with a closed
// enum input. The LLM cannot ask for `category: "banana"` — Zod rejects it
// before this handler runs.
//
// What "shape" means, in code: the schema is the contract.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { CATEGORIES } from "../categories.ts";
import { sql } from "../db.ts";

export function registerSearchMonstersByCategory(server: McpServer) {
  server.registerTool(
    "search_monsters_by_category",
    {
      description:
        "Find monsters by their high-level category. Returns up to `limit` monsters with their names, monster types, habitats, and rarities.",
      inputSchema: {
        category: z.enum(CATEGORIES),
        limit: z.number().int().min(1).max(50).optional().default(10),
      },
    },
    async ({ category, limit }) => {
      // TODO — fill in the handler body.
      //
      // What you need to do:
      //
      // 1. Query Postgres using the `sql` tagged template (see src/db.ts).
      //    The relevant tables:
      //      monsters       (monster_id, name, monster_type, habitat, rarity, subcategory_id)
      //      subcategories  (subcategory_id, subcategory_name, category_id)
      //      categories     (category_id, category_name)
      //
      //    Filter monsters by joining through subcategories → categories
      //    and matching `categories.category_name = ${category}`.
      //
      //    Example:
      //      const rows = await sql`
      //        SELECT m.name, m.monster_type, m.habitat, m.rarity
      //        FROM monsters m
      //        JOIN subcategories s ON s.subcategory_id = m.subcategory_id
      //        JOIN categories c ON c.category_id = s.category_id
      //        WHERE c.category_name = ${category}
      //        ORDER BY m.name
      //        LIMIT ${limit}
      //      `;
      //
      // 2. Return shape:
      //      { content: [{ type: "text", text: "..." }] }
      //
      //    Keep the text tight. v1's flaw was dumping everything — don't repeat it.
      //    Name + monster_type + habitat + rarity per row is plenty.
      //
      // 3. Handle the "no matches" case explicitly. The LLM should know whether
      //    "no results" means "no monsters in that category" or "I broke something."

      return {
        content: [
          {
            type: "text",
            text: `TODO: search_monsters_by_category(category=${category}, limit=${limit}) — not yet implemented`,
          },
        ],
      };
    },
  );
}
