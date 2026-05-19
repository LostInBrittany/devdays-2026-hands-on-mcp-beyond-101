// Tool: get_monster_details
//
// Single-resource fetch by monster name. Pair this with search_monsters_by_category:
// search returns a short list, this returns the deep details for one of them.
//
// Why a separate Tool? Because "show me everything about this monster" and
// "find monsters matching a category" are different actions. v2 names them
// separately so the LLM can reach for the right one.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";

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
      // TODO — fill in the handler body.
      //
      // 1. Query the `monsters` table by name, case-insensitive (ILIKE or LOWER()).
      //    Useful columns: name, monster_type, habitat, biome, rarity, height, weight,
      //    appearance, primary_power, secondary_power, special_ability, weakness,
      //    behavior_ecology, notable_specimens.
      //
      //    Example:
      //      const rows = await sql`
      //        SELECT * FROM monsters WHERE LOWER(name) = LOWER(${name}) LIMIT 1
      //      `;
      //
      // 2. Handle the "not found" case explicitly — return a clear error message
      //    in the response. Don't throw; the LLM needs a typed response it can act on.
      //
      // 3. Return shape:
      //      { content: [{ type: "text", text: "..." }] }
      //
      //    Format the monster's details as readable text. Headed sections work well:
      //    "## Appearance\n...\n## Powers\n...\n## Weakness\n..."

      return {
        content: [
          {
            type: "text",
            text: `TODO: get_monster_details(name=${name}) — not yet implemented`,
          },
        ],
      };
    },
  );
}
