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

      const rows = await sql`
        SELECT
          m.name, m.monster_type, m.habitat, m.biome, m.rarity,
          m.height, m.weight, m.appearance,
          m.primary_power, m.secondary_power, m.special_ability,
          m.weakness, m.behavior_ecology, m.notable_specimens
        FROM monsters m
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
            text: `No monster found with name "${name}". Try \`search_monsters_by_category\` to browse.`,
          }],
        };
      }

      const m = rows[0]!;
      const text = [
        `# ${m.name}`,
        ``,
        `**Type:** ${m.monster_type} · **Habitat:** ${m.habitat} (${m.biome}) · **Rarity:** ${m.rarity}`,
        `**Size:** ${m.height} · ${m.weight}`,
        ``,
        `## Appearance`,
        m.appearance,
        ``,
        `## Powers`,
        `- **Primary:** ${m.primary_power}`,
        `- **Secondary:** ${m.secondary_power}`,
        `- **Special:** ${m.special_ability}`,
        ``,
        `## Weakness`,
        m.weakness,
        ``,
        `## Behaviour`,
        m.behavior_ecology,
        ``,
        `## Notable specimens`,
        m.notable_specimens,
      ].join("\n");

      logResult(
        "get_monster_details",
        `found name="${m.name}"`,
        Date.now() - start,
      );

      return {
        content: [{ type: "text", text }],
      };
    },
  );
}
