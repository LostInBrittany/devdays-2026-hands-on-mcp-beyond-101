import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";
import { logCall, logResult } from "../log.ts";

export function registerGetMonsterDetails(server: McpServer) {
  server.registerTool(
    "get_monster_details",
    {
      description:
        "Full details for a single monster — appearance, powers (primary, secondary, special), weakness, behaviour, notable specimens. Lookup by name, case-insensitive.",
      inputSchema: {
        name: z.string().min(1),
      },
    },
    async ({ name }) => {
      const start = Date.now();
      logCall("tool", "get_monster_details", { name });

      // 3.2 evolution: keep every field 3.0/3.1 returned, *add* category_name
      // via JOIN, and wrap the response in a hypermedia envelope. Nothing
      // gets dropped — features accumulate across iterations.
      const rows = await sql<
        {
          name: string; monster_type: string; habitat: string; biome: string;
          rarity: string; height: string; weight: string; appearance: string;
          primary_power: string; secondary_power: string; special_ability: string;
          weakness: string; behavior_ecology: string; notable_specimens: string;
          category_name: string;
        }[]
      >`
        SELECT
          m.name, m.monster_type, m.habitat, m.biome, m.rarity,
          m.height, m.weight, m.appearance,
          m.primary_power, m.secondary_power, m.special_ability,
          m.weakness, m.behavior_ecology, m.notable_specimens,
          c.category_name
        FROM monsters m
        JOIN subcategories s ON s.subcategory_id = m.subcategory_id
        JOIN categories c ON c.category_id = s.category_id
        WHERE LOWER(m.name) = LOWER(${name})
        LIMIT 1
      `;

      if (rows.length === 0) {
        logResult(
          "get_monster_details",
          `not_found name="${name}"`,
          Date.now() - start,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                error: `Monster "${name}" not found.`,
                source: "RAGmonsters DB · ragmonsters-server 3.4",
                next: [`list_categories({})`],
              },
              null,
              2,
            ),
          }],
        };
      }

      const m = rows[0]!;
      logResult(
        "get_monster_details",
        `found name="${m.name}"`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            {
              data: m,
              summary: `${m.name} — ${m.rarity} ${m.monster_type} from ${m.habitat} (${m.category_name}).`,
              source: "RAGmonsters DB · ragmonsters-server 3.4",
              next: [
                `search_monsters_by_category({ category: "${m.category_name}", limit: 10 })`,
              ],
            },
            null,
            2,
          ),
        }],
      };
    },
  );
}
