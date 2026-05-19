import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { getCachedCategories } from "../cache.ts";
import { logCall, logResult } from "../log.ts";

export function registerMonstersCategoriesResource(server: McpServer) {
  server.registerResource(
    "monsters-categories",
    "monsters://categories",
    {
      description: "All monster categories with descriptions. Cached at server init.",
      mimeType: "application/json",
    },
    async (uri) => {
      const start = Date.now();
      logCall("resource", "monsters://categories", { uri: uri.href });

      const rows = getCachedCategories();

      logResult(
        "monsters://categories",
        `cache=hit count=${rows.length}`,
        Date.now() - start,
      );

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(rows, null, 2),
        }],
      };
    },
  );
}
