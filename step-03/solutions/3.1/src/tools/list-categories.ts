import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";
import { logCall, logResult } from "../log.ts";

export function registerListCategories(server: McpServer) {
  server.registerTool(
    "list_categories",
    {
      description:
        "List all valid monster categories with their descriptions. Six entries — bounded, doesn't change.",
    },
    async () => {
      const start = Date.now();
      logCall("tool", "list_categories", {});

      const rows = await sql`
        SELECT category_name, description
        FROM categories
        ORDER BY category_name
      `;

      const lines = rows.map(
        (c) => `- **${c.category_name}** — ${c.description}`,
      );

      logResult("list_categories", `count=${rows.length}`, Date.now() - start);

      return {
        content: [{
          type: "text",
          text: `Monster categories:\n\n${lines.join("\n")}`,
        }],
      };
    },
  );
}
