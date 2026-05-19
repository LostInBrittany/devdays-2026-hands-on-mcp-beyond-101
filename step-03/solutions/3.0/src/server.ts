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

registerSearchMonstersByCategory(server);
registerGetMonsterDetails(server);
registerListCategories(server);

registerMonstersCategoriesResource(server);

registerAnalyzeMonsterPrompt(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[ragmonsters-server] connected, ready");
