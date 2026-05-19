// Tool: list_categories
//
// Returns the bounded list of valid categories with their descriptions.
//
// Plant for the Resources discussion that comes next: you just wrote this
// as a Tool — every turn the LLM wants the list, it has to call your tool.
// Wouldn't a cacheable Resource be cleaner? (Spoiler: yes. We'll do both.
// Tools and Resources serve different purposes.)

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";

export function registerListCategories(server: McpServer) {
  server.registerTool(
    "list_categories",
    {
      description:
        "List all valid monster categories with their descriptions. Six entries — bounded, doesn't change.",
      // No inputSchema — this Tool takes no arguments.
    },
    async () => {
      // TODO — fill in the handler body.
      //
      // 1. Query the `categories` table for category_name and description.
      //
      //    Example:
      //      const rows = await sql`
      //        SELECT category_name, description FROM categories ORDER BY category_name
      //      `;
      //
      // 2. Format as text. Each line: "**<name>** — <description>".
      //
      // 3. Return shape:
      //      { content: [{ type: "text", text: "..." }] }
      //
      // Note: in src/resources/monsters-categories.ts you'll expose this same
      // data as a Resource. Think about why we want both. (Hint: who decides
      // when to fetch — the LLM, or the client?)

      return {
        content: [
          {
            type: "text",
            text: "TODO: list_categories — not yet implemented",
          },
        ],
      };
    },
  );
}
