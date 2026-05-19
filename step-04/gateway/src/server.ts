// gateway/src/server.ts
//
// The MCP gateway. Built in iteration 4.2; extended in 4.4 with idempotency.
//
// The gateway is BOTH an McpServer (talking to Claude Code over stdio) AND
// an MCP client (talking to spawned catalog + arena subprocesses through
// the SDK's Client class). It merges their manifests, namespaces tool
// names with the child's name as prefix, proxies calls, and writes one
// audit line per invocation.
//
// What's shipped:
//   - this file's skeleton with the SDK wiring
//   - children.ts (spawn helper, provided)
//   - idempotency.ts (empty stub, filled in 4.4)
//
// What you write in 4.2:
//   - mergeManifests()  — pull each child's tools and store them in the
//     mergedTools map under a `${child}.${tool}` namespaced name
//   - auditLine()  — append one JSONL line to gateway/logs/audit.log per call
//
// The low-level ListTools / CallTool handlers (below) read mergedTools and
// dispatch through routeToolCall — already wired, you don't have to touch them.
//
// What you extend in 4.4:
//   - routeCall, tool branch — check the dedupe table before forwarding when
//     args.idempotency_key is present

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

// ──────────────────────────────────────────────────────────────────────────
// Audit log — one JSONL line per call.
// ──────────────────────────────────────────────────────────────────────────

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
  // TODO (4.2): emit one JSONL line to AUDIT_FILE and mirror to stderr.
  // (Stub so the file compiles before 4.2.)
  void entry;
}

// ──────────────────────────────────────────────────────────────────────────
// Manifest merge + routing.
// ──────────────────────────────────────────────────────────────────────────

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

// The gateway's job is to PROXY child manifests, not to own its own tools.
// We use the low-level Server API (setRequestHandler) so we can forward each
// child's JSON Schema verbatim — McpServer.registerTool would force us to
// recreate a Zod schema for every tool, losing fidelity and description text.
//
// MCP tool names allow [A-Za-z0-9_.-]. We use '.' as the namespace separator.

interface MergedTool {
  child: ChildClient;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
}

const mergedTools = new Map<string, MergedTool>();

async function mergeManifests(children: ChildClient[]): Promise<void> {
  // TODO (4.2): for each child, list its tools and store a passthrough entry
  // in `mergedTools` keyed by the namespaced name `${child.name}.${tool.name}`.
  //
  //   for (const child of children) {
  //     const { tools } = await child.client.listTools();
  //     for (const tool of tools) {
  //       const namespacedName = `${child.name}.${tool.name}`;
  //       mergedTools.set(namespacedName, {
  //         child,
  //         originalName: tool.name,
  //         namespacedName,
  //         description: `[via ${child.name}] ${tool.description ?? ""}`.trim(),
  //         inputSchema: tool.inputSchema,
  //       });
  //     }
  //   }
  //
  // The low-level request handlers below read from `mergedTools`. Resources
  // and prompts are nice-to-have — tools carry 4.2's lesson on their own.
  void children;
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

  // ── 4.4 idempotency check ─────────────────────────────────────────────
  // If args carries idempotency_key, look up the dedupe table BEFORE forwarding.
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

  // ── Forward to the child via the SDK Client ───────────────────────────
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

// ──────────────────────────────────────────────────────────────────────────
// Bootstrap.
// ──────────────────────────────────────────────────────────────────────────

const children = await spawnChildren();
await mergeManifests(children);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(
  `[gateway] connected, principal=${PRINCIPAL}, children=${children
    .map((c) => c.name)
    .join(",")}`,
);

// Export the routing helper so 4.2's solution can wire it from mergeManifests.
export { routeToolCall };
