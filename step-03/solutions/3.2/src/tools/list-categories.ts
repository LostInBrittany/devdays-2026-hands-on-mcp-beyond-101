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

      const rows = await sql<{ category_name: string; description: string }[]>`
        SELECT category_name, description FROM categories ORDER BY category_name
      `;

      logResult("list_categories", `count=${rows.length}`, Date.now() - start);

      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            {
              data: rows,
              summary: `${rows.length} categories available.`,
              source: "RAGmonsters DB · ragmonsters-server 3.2",
              next: rows.map(
                (r) => `search_monsters_by_category({ category: "${r.category_name}" })`,
              ),
            },
            null,
            2,
          ),
        }],
      };
    },
  );
}
