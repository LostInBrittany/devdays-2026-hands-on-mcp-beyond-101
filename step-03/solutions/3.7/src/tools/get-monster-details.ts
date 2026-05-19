import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";
import { logCall, logResult } from "../log.ts";
import { checkAuth } from "../auth.ts";
import { sanitizeText } from "../sanitize.ts";

// 3.6 additions on top of 3.5:
//   - Sanitize the four free-text columns before they leave the server
//   - Validate the response envelope through a Zod output schema
//
// Nothing dropped from 3.5: same wide SELECT, same JOIN to categories,
// same JSON envelope with summary + source + next.

const monsterDetailsOutput = z.object({
  data: z.object({
    name: z.string(),
    monster_type: z.string(),
    habitat: z.string(),
    biome: z.string(),
    rarity: z.string(),
    height: z.string(),
    weight: z.string(),
    appearance: z.string(),
    primary_power: z.string(),
    secondary_power: z.string(),
    special_ability: z.string(),
    weakness: z.string(),
    behavior_ecology: z.string(),
    notable_specimens: z.string(),
    category_name: z.string(),
  }).strict(),
  summary: z.string(),
  source: z.string(),
  next: z.array(z.string()),
}).strict();

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
      const denied = checkAuth("get_monster_details");
      if (denied) return denied;

      const start = Date.now();
      logCall("tool", "get_monster_details", { name });

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
                source: "RAGmonsters DB · ragmonsters-server 3.7",
                next: [`list_categories({})`],
              },
              null,
              2,
            ),
          }],
        };
      }

      const m = rows[0]!;

      // Sanitize the four free-text fields before they hit the LLM.
      // Bounded enum-ish fields (monster_type, category_name, habitat,
      // biome, rarity, height, weight) don't need sanitisation — their
      // values are constrained by the data model.
      const sanitized = {
        ...m,
        appearance:        sanitizeText(m.appearance,        "appearance"),
        weakness:          sanitizeText(m.weakness,          "weakness"),
        behavior_ecology:  sanitizeText(m.behavior_ecology,  "behavior_ecology"),
        notable_specimens: sanitizeText(m.notable_specimens, "notable_specimens"),
      };

      // Build the envelope first, then validate it as a whole. If the DB
      // ever returns something off-shape (schema migration drift, NULL
      // sneaking through a NOT NULL gap, etc.), we'd rather return an
      // error than confuse the LLM with malformed JSON.
      const envelope = {
        data: sanitized,
        summary: `${sanitized.name} — ${sanitized.rarity} ${sanitized.monster_type} from ${sanitized.habitat} (${sanitized.category_name}).`,
        source: "RAGmonsters DB · ragmonsters-server 3.7",
        next: [
          `search_monsters_by_category({ category: "${sanitized.category_name}", limit: 10 })`,
        ],
      };

      const parsed = monsterDetailsOutput.safeParse(envelope);
      if (!parsed.success) {
        logResult(
          "get_monster_details",
          `output_validation_fail name="${m.name}"`,
          Date.now() - start,
        );
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: "Server response did not match expected schema.",
              source: "RAGmonsters DB · ragmonsters-server 3.7",
              next: [`search_monsters_by_category({ category: "Elemental" })`],
            }, null, 2),
          }],
        };
      }

      logResult(
        "get_monster_details",
        `found name="${m.name}"`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify(parsed.data, null, 2),
        }],
      };
    },
  );
}
