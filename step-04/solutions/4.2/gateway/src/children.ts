// gateway/src/children.ts
//
// Spawns the two child MCP servers (catalog + arena) as stdio subprocesses
// and exposes an SDK `Client` instance for each. This file is provided —
// participants don't write the SDK plumbing from zero, only the routing
// logic in src/server.ts.
//
// Each child gets MCP_PRINCIPAL forwarded so per-tool auth still works
// downstream (built in step-03/3.7). The gateway is the *fleet's*
// principal entry point; children are the enforcers.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export type ChildName = "catalog" | "arena";

export interface ChildClient {
  name: ChildName;
  client: Client;
}

const PRINCIPAL = process.env.MCP_PRINCIPAL ?? "guest";

const CHILDREN: Array<{
  name: ChildName;
  command: string;
  args: string[];
  env: Record<string, string>;
}> = [
  {
    name: "catalog",
    command: "bun",
    args: ["run", "catalog-server/src/server.ts"],
    env: {
      DATABASE_URL: "postgres://postgres:any@127.0.0.1:5432/postgres?sslmode=disable",
      MCP_PRINCIPAL: PRINCIPAL,
    },
  },
  {
    name: "arena",
    command: "bun",
    args: ["run", "arena-server/src/server.ts"],
    env: {
      MCP_PRINCIPAL: PRINCIPAL,
    },
  },
];

export async function spawnChildren(): Promise<ChildClient[]> {
  const out: ChildClient[] = [];
  for (const cfg of CHILDREN) {
    // Filter out undefined env values to satisfy StdioClientTransport's
    // Record<string, string> expectation.
    const env: Record<string, string> = { ...cfg.env };
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === "string") env[k] = v;
    }
    Object.assign(env, cfg.env); // child config wins over process env on conflicts

    const transport = new StdioClientTransport({
      command: cfg.command,
      args: cfg.args,
      env,
    });
    const client = new Client(
      { name: `gateway-client-${cfg.name}`, version: "0.1.0" },
      { capabilities: {} },
    );
    await client.connect(transport);
    console.error(`[gateway] child '${cfg.name}' connected`);
    out.push({ name: cfg.name, client });
  }
  return out;
}
