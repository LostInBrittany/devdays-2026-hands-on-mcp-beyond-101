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
        offset: z.number().int().min(0).optional().default(0),
      },
    },
    async ({ category, limit, offset }) => {
      const start = Date.now();
      logCall("tool", "search_monsters_by_category", { category, limit, offset });

      const rows = await sql<
        { name: string; monster_type: string; habitat: string; rarity: string }[]
      >`
        SELECT m.name, m.monster_type, m.habitat, m.rarity
        FROM monsters m
        JOIN subcategories s ON s.subcategory_id = m.subcategory_id
        JOIN categories c ON c.category_id = s.category_id
        WHERE c.category_name = ${category}
        ORDER BY m.name
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [{ total }] = await sql<{ total: number }[]>`
        SELECT count(*)::int AS total
        FROM monsters m
        JOIN subcategories s ON s.subcategory_id = m.subcategory_id
        JOIN categories c ON c.category_id = s.category_id
        WHERE c.category_name = ${category}
      `;

      const hasMore = offset + rows.length < total;
      const next: string[] = [];

      if (hasMore) {
        next.push(
          `search_monsters_by_category({ category: "${category}", limit: ${limit}, offset: ${offset + limit} })`,
        );
      }

      if (rows.length > 0) {
        next.push(`get_monster_details({ name: "${rows[0]!.name}" })`);
      }

      if (rows.length >= 2) {
        next.push(
          `compare_monsters({ name_a: "${rows[0]!.name}", name_b: "${rows[1]!.name}" })`,
        );
      }

      logResult(
        "search_monsters_by_category",
        `found=${rows.length}/${total} next=${next.length}`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            {
              data: rows,
              summary: `Found ${rows.length} of ${total} monsters in category "${category}"${hasMore ? " (more available — see `next`)" : ""}.`,
              source: "RAGmonsters DB · ragmonsters-server 3.6",
              next,
            },
            null,
            2,
          ),
        }],
      };
    },
  );
}
