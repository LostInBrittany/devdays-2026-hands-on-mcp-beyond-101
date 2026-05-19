import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { checkAuth } from "../auth.ts";
import { getCachedCategories } from "../cache.ts";
import { logCall, logResult } from "../log.ts";

export function registerListCategories(server: McpServer) {
  server.registerTool(
    "list_categories",
    {
      description:
        "List all valid monster categories with their descriptions. Six entries — bounded, doesn't change.",
    },
    async () => {
      const denied = checkAuth("list_categories");
      if (denied) return denied;

      const start = Date.now();
      logCall("tool", "list_categories", {});

      const rows = getCachedCategories();

      logResult(
        "list_categories",
        `cache=hit count=${rows.length}`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            {
              data: rows,
              summary: `${rows.length} categories available.`,
              source: "RAGmonsters DB · ragmonsters-server 3.7",
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
