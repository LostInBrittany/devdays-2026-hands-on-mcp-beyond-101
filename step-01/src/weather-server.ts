import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "weather-server",
  version: "0.1.0",
});

server.registerTool(
  "get_weather",
  {
    title: "Get Weather",
    description: "Get the current weather for a city.",
    inputSchema: {
      city: z.string().describe("City name, e.g. Vilnius"),
    },
  },
  async ({ city }) => ({
    content: [
      {
        type: "text",
        text: `Weather in ${city}: sunny, 22°C.`,
      },
    ],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[weather-server] listening on stdio");
