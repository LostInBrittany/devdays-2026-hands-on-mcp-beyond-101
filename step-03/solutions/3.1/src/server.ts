import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchMonstersByCategory } from "./tools/search-monsters-by-category.ts";
import { registerGetMonsterDetails } from "./tools/get-monster-details.ts";
import { registerListCategories } from "./tools/list-categories.ts";
import { registerMonstersCategoriesResource } from "./resources/monsters-categories.ts";
import { registerSchemaResource } from "./resources/schema.ts";
import { registerAnalyzeMonsterPrompt } from "./prompts/analyze-monster.ts";

// The `instructions` field travels with the initialize handshake.
// MCP Resources are application-controlled: the host (Claude Code, Claude
// Desktop, etc.) decides whether and how to surface them to the LLM. Claude
// Code, for example, gates Resources behind ListMcpResourcesTool /
// ReadMcpResourceTool — the LLM only sees them if it chooses to call those
// tools. `instructions` is the one channel a server has to nudge the model:
// clients that respect this field inject the string into the LLM's context
// at session start. So we use it to point at the schema Resource we built
// in 3.1.
const server = new McpServer(
  {
    name: "ragmonsters-server",
    version: "0.1.0",
  },
  {
    instructions: [
      "This server exposes a small catalogue of fictional monsters (the RAGmonsters dataset).",
      "",
      "Before using any Tool for the first time in a conversation, read the `monsters://schema` Resource. It describes the domain (six monster categories, what each Tool does, what is deliberately not exposed) and will save you from guessing category names or Tool semantics.",
      "",
      "Quick map:",
      "- `monsters://schema` — hand-written domain overview. Read first.",
      "- `monsters://categories` — the six valid category names with descriptions.",
      "- Tools: `search_monsters_by_category`, `get_monster_details`, `list_categories`.",
    ].join("\n"),
  },
);

registerSearchMonstersByCategory(server);
registerGetMonsterDetails(server);
registerListCategories(server);

registerMonstersCategoriesResource(server);
registerSchemaResource(server);

registerAnalyzeMonsterPrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[ragmonsters-server] connected, ready");
