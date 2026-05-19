// Module 03 — v2 shaped: the RAGmonsters rebuild.
//
// One MCP server, three primitives, designed deliberately.
//
//   Tools     — actions the LLM can request    (POST/PUT/DELETE)
//   Resources — facts the LLM can read         (GET)
//   Prompts   — workflows the server supplies  (OpenAPI examples)
//
// Each primitive lives in its own file under src/. The wiring is below;
// the bodies are yours to fill in.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchMonstersByCategory } from "./tools/search-monsters-by-category.ts";
import { registerGetMonsterDetails } from "./tools/get-monster-details.ts";
import { registerListCategories } from "./tools/list-categories.ts";
import { registerMonstersCategoriesResource } from "./resources/monsters-categories.ts";
import { registerAnalyzeMonsterPrompt } from "./prompts/analyze-monster.ts";

const server = new McpServer({
  name: "ragmonsters-server",
  version: "0.1.0",
});

// Three Tools — the actions.
registerSearchMonstersByCategory(server);
registerGetMonsterDetails(server);
registerListCategories(server);

// One Resource — the cacheable facts.
registerMonstersCategoriesResource(server);

// One Prompt — the codified workflow.
registerAnalyzeMonsterPrompt(server);

// stdio transport — Claude Code spawns this process and talks to us over stdin/stdout.
// Anything we write to stdout *that isn't a JSON-RPC message* will break the protocol.
// Use console.error for logging.
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[ragmonsters-server] connected, ready");
