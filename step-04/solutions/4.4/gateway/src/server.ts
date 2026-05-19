// Solution for 4.2 — gateway with mergeManifests + auditLine implemented.
// The idempotency hook is still wired (from the skeleton) but does nothing
// useful because idempotency.ts is still a stub. That's what 4.4 fills in.
//
// The gateway proxies child manifests via the low-level Server API. We use
// setRequestHandler for ListTools/CallTool so each child's JSON Schema can be
// forwarded VERBATIM — McpServer.registerTool would force us to recreate a
// Zod schema for every tool, dropping descriptions and enum constraints.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";

import { spawnChildren, type ChildClient } from "./children.ts";
import { check, record, makeKey } from "./idempotency.ts";

const PRINCIPAL = process.env.MCP_PRINCIPAL ?? "guest";

const LOG_DIR = "gateway/logs";
const AUDIT_FILE = `${LOG_DIR}/audit.log`;
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

interface AuditEntry {
  ts: string;
  principal: string;
  child: string;
  primitive: "tool" | "resource" | "prompt";
  name: string;
  args_hash: string;
  status: "ok" | "error";
  cache?: "hit" | "miss";
  duration_ms: number;
}

function hashArgs(args: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(args ?? {}))
    .digest("hex")
    .slice(0, 12);
}

export function auditLine(entry: AuditEntry): void {
  const line = JSON.stringify(entry);
  console.error(line);
  try {
    appendFileSync(AUDIT_FILE, line + "\n");
  } catch {
    // logging must never break the server
  }
}

const server = new McpServer(
  {
    name: "mcp-gateway",
    version: "0.1.0",
  },
  {
    instructions: [
      "MCP gateway. Routes namespaced tool calls to two backend servers (catalog, arena).",
      "All names are prefixed with the child name: 'catalog.get_monster_details', 'arena.simulate_battle', etc.",
      "Audit log: gateway/logs/audit.log",
    ].join("\n"),
  },
);

interface MergedTool {
  child: ChildClient;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
}

const mergedTools = new Map<string, MergedTool>();

async function mergeManifests(children: ChildClient[]): Promise<void> {
  for (const child of children) {
    const { tools } = await child.client.listTools();

    for (const tool of tools) {
      const namespacedName = `${child.name}.${tool.name}`;
      mergedTools.set(namespacedName, {
        child,
        originalName: tool.name,
        namespacedName,
        description: `[via ${child.name}] ${tool.description ?? ""}`.trim(),
        inputSchema: tool.inputSchema,
      });
    }

    console.error(`[gateway] merged ${tools.length} tools from ${child.name}`);
  }
}

server.server.registerCapabilities({ tools: { listChanged: false } });

server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: Array.from(mergedTools.values()).map((t) => ({
    name: t.namespacedName,
    description: t.description,
    inputSchema: t.inputSchema as Record<string, unknown>,
  })),
}));

server.server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const merged = mergedTools.get(req.params.name);
  if (!merged) {
    throw new Error(`Unknown tool: ${req.params.name}`);
  }
  return routeToolCall(
    merged.child,
    merged.originalName,
    (req.params.arguments ?? {}) as Record<string, unknown>,
  );
});

async function routeToolCall(
  child: ChildClient,
  originalName: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const start = Date.now();
  const argsHash = hashArgs(args);

  const idemKey =
    typeof args["idempotency_key"] === "string"
      ? (args["idempotency_key"] as string)
      : undefined;

  if (idemKey) {
    const key = makeKey(child.name, originalName, idemKey);
    const hit = check(key);
    if (hit) {
      auditLine({
        ts: new Date().toISOString(),
        principal: PRINCIPAL,
        child: child.name,
        primitive: "tool",
        name: originalName,
        args_hash: argsHash,
        status: "ok",
        cache: "hit",
        duration_ms: Date.now() - start,
      });
      return hit.result as { content: Array<{ type: "text"; text: string }> };
    }
  }

  try {
    const result = (await child.client.callTool({
      name: originalName,
      arguments: args,
    })) as { content: Array<{ type: "text"; text: string }> };

    if (idemKey) {
      record(makeKey(child.name, originalName, idemKey), result);
    }

    auditLine({
      ts: new Date().toISOString(),
      principal: PRINCIPAL,
      child: child.name,
      primitive: "tool",
      name: originalName,
      args_hash: argsHash,
      status: "ok",
      cache: idemKey ? "miss" : undefined,
      duration_ms: Date.now() - start,
    });
    return result;
  } catch (err) {
    auditLine({
      ts: new Date().toISOString(),
      principal: PRINCIPAL,
      child: child.name,
      primitive: "tool",
      name: originalName,
      args_hash: argsHash,
      status: "error",
      duration_ms: Date.now() - start,
    });
    throw err;
  }
}

const children = await spawnChildren();
await mergeManifests(children);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(
  `[gateway] connected, principal=${PRINCIPAL}, children=${children
    .map((c) => c.name)
    .join(",")}`,
);

export { routeToolCall };
