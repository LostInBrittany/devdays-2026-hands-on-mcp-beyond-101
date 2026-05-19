import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";
import { logCall, logResult } from "../log.ts";

export function registerMonstersCategoriesResource(server: McpServer) {
  server.registerResource(
    "monsters-categories",
    "monsters://categories",
    {
      description: "All monster categories with their descriptions. Static-ish; cacheable.",
      mimeType: "application/json",
    },
    async (uri) => {
      const start = Date.now();
      logCall("resource", "monsters://categories", { uri: uri.href });

      const rows = await sql`
        SELECT category_name, description
        FROM categories
        ORDER BY category_name
      `;

      logResult(
        "monsters://categories",
        `count=${rows.length}`,
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
