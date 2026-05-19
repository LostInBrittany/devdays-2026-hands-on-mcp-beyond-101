import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { CATEGORIES } from "../categories.ts";
import { sql } from "../db.ts";
import { logCall, logResult } from "../log.ts";

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
      const start = Date.now();
      logCall("tool", "search_monsters_by_category", { category, limit });

      const rows = await sql`
        SELECT m.name, m.monster_type, m.habitat, m.rarity
        FROM monsters m
        JOIN subcategories s ON s.subcategory_id = m.subcategory_id
        JOIN categories c ON c.category_id = s.category_id
        WHERE c.category_name = ${category}
        ORDER BY m.name
        LIMIT ${limit}
      `;

      if (rows.length === 0) {
        logResult("search_monsters_by_category", "found=0", Date.now() - start);
        return {
          content: [{
            type: "text",
            text: `No monsters found in category "${category}".`,
          }],
        };
      }

      const lines = rows.map(
        (m) => `- **${m.name}** — ${m.monster_type} · ${m.habitat} · ${m.rarity}`,
      );

      logResult(
        "search_monsters_by_category",
        `found=${rows.length}`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: `Found ${rows.length} monsters in category "${category}":\n\n${lines.join("\n")}`,
        }],
      };
    },
  );
}
