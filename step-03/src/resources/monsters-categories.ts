// Resource: monsters://categories
//
// The same data as list_categories(), but exposed as a Resource — a fact the
// LLM can fetch once and cache, rather than calling a Tool every turn.
//
// The "guessing problem" callback (Devoxx slide 112): in v1 the LLM had to
// guess what valid types existed because nothing exposed the bounded set.
// In v2, this Resource is the bounded set. The Tool (list_categories) and
// the Resource (monsters://categories) are two ways of exposing the same fact,
// for two different access patterns:
//
//   Tool      — "I want this now, as part of doing something"
//   Resource  — "I want to know this, possibly subscribe to changes, cache it"
//
// Different verbs (call vs. read). Different cardinality (per-turn vs. once).
// Different cost. That's why we have both.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { sql } from "../db.ts";

export function registerMonstersCategoriesResource(server: McpServer) {
  server.registerResource(
    "monsters-categories",
    "monsters://categories",
    {
      description: "All monster categories with their descriptions. Static-ish; cacheable.",
      mimeType: "application/json",
    },
    async (uri) => {
      // TODO — fill in the handler body.
      //
      // 1. Query the `categories` table — same query as list_categories.
      //
      //    Example:
      //      const rows = await sql`
      //        SELECT category_name, description FROM categories ORDER BY category_name
      //      `;
      //
      // 2. Return shape:
      //      {
      //        contents: [{
      //          uri: uri.href,
      //          mimeType: "application/json",
      //          text: JSON.stringify(rows)
      //        }]
      //      }
      //
      //    Note: Resources return a `contents` array (plural), whereas Tools
      //    return a `content` array. They're different shapes for different
      //    semantics. The plural is intentional — a Resource can be made of
      //    multiple parts (think: a document with embedded images).

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ todo: "monsters://categories not yet implemented" }),
          },
        ],
      };
    },
  );
}
