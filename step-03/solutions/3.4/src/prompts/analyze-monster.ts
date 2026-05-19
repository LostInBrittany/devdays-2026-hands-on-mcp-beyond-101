import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { logCall } from "../log.ts";

export function registerAnalyzeMonsterPrompt(server: McpServer) {
  server.registerPrompt(
    "analyze_monster",
    {
      description:
        "Structured weakness-and-matchup analysis for a given monster. The LLM follows the template instead of inventing one each time.",
      argsSchema: {
        monster_name: z.string().min(1),
      },
    },
    async ({ monster_name }) => {
      logCall("prompt", "analyze_monster", { monster_name });

      const text = `Analyse the monster called "${monster_name}".

Use the ragmonsters-server Tools. Cover these points:
1. Profile (category, type, habitat, rarity)
2. Powers (primary, secondary, special)
3. Weakness
4. One sentence on how you'd fight it`;

      return {
        messages: [{
          role: "user" as const,
          content: { type: "text" as const, text },
        }],
      };
    },
  );
}
