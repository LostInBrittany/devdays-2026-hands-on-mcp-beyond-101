#!/usr/bin/env node
// Logging clone of @modelcontextprotocol/server-postgres@0.6.2 — the deprecated,
// archived official Postgres MCP server. Identical behaviour (including the
// COMMIT; bypass), but every incoming MCP request is appended to ./tmp/logs.txt
// so the room can see what the LLM actually asks the server. Responses are NOT
// logged — they're often huge, and the request stream is what teaches.
//
// Usage (from step-02/):
//   bun run src/mcp-pg-with-logs.js "postgres://postgres:any@127.0.0.1:5432/postgres?sslmode=disable"
//
// Tail the log in a third terminal:
//   tail -f tmp/logs.txt

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import pg from "pg";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// --- logging --------------------------------------------------------------
// We can't use console.log on a stdio MCP server — stdout is the JSON-RPC
// channel. Write straight to a file instead. Path is relative to the cwd
// the server is spawned from (step-02/ when launched via .mcp.json).
const LOG_PATH = resolve(process.cwd(), "tmp", "logs.txt");
mkdirSync(dirname(LOG_PATH), { recursive: true });

function log(method, detail) {
  const ts = new Date().toISOString();
  const line = detail ? `[${ts}] ${method} :: ${detail}\n` : `[${ts}] ${method}\n`;
  appendFileSync(LOG_PATH, line);
}

function oneLine(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

log("server/start", `pid=${process.pid} cwd=${process.cwd()}`);

// --- server ---------------------------------------------------------------
const server = new Server(
  { name: "example-servers/postgres-with-logs", version: "0.1.0" },
  { capabilities: { resources: {}, tools: {} } },
);

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide a database URL as a command-line argument");
  process.exit(1);
}

const databaseUrl = args[0];
const resourceBaseUrl = new URL(databaseUrl);
resourceBaseUrl.protocol = "postgres:";
resourceBaseUrl.password = "";

const pool = new pg.Pool({ connectionString: databaseUrl });

const SCHEMA_PATH = "schema";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  log("resources/list");
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    return {
      resources: result.rows.map((row) => ({
        uri: new URL(`${row.table_name}/${SCHEMA_PATH}`, resourceBaseUrl).href,
        mimeType: "application/json",
        name: `"${row.table_name}" database schema`,
      })),
    };
  } finally {
    client.release();
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  log("resources/read", `uri=${request.params.uri}`);
  const resourceUrl = new URL(request.params.uri);
  const pathComponents = resourceUrl.pathname.split("/");
  const schema = pathComponents.pop();
  const tableName = pathComponents.pop();

  if (schema !== SCHEMA_PATH) {
    throw new Error("Invalid resource URI");
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
      [tableName],
    );
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  } finally {
    client.release();
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  log("tools/list");
  return {
    tools: [
      {
        name: "query",
        description: "Run a read-only SQL query",
        inputSchema: {
          type: "object",
          properties: { sql: { type: "string" } },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  if (toolName === "query") {
    const sql = request.params.arguments?.sql;
    log("tools/call query", `sql=${oneLine(sql)}`);
    const client = await pool.connect();
    try {
      await client.query("BEGIN TRANSACTION READ ONLY");
      const result = await client.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }],
        isError: false,
      };
    } catch (error) {
      throw error;
    } finally {
      client
        .query("ROLLBACK")
        .catch((error) => console.warn("Could not roll back transaction:", error));
      client.release();
    }
  }
  log("tools/call unknown", `name=${toolName}`);
  throw new Error(`Unknown tool: ${toolName}`);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
