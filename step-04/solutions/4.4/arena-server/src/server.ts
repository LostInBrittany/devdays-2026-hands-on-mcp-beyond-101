// Module 04 — arena-server.
//
// The second MCP server in the workshop. Stateless on purpose — no DB.
// Receives two FULL monster detail payloads as Tool arguments and
// derives combat stats internally from the lore. The LLM is responsible
// for fetching the details from catalog-server first and passing them
// here. That's orchestration at the agent layer, and it's the default
// composition pattern in MCP today.
//
// Two Tools:
//   - simulate_battle      — 4.0 (read-only; derives stats from catalog payloads)
//   - record_battle_result — 4.4 (write to a local JSONL file)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSimulateBattle } from "./tools/simulate-battle.ts";
import { registerRecordBattleResult } from "./tools/record-battle-result.ts";

const server = new McpServer(
  {
    name: "arena-server",
    version: "0.1.0",
  },
  {
    instructions: [
      "This server resolves monster battles. It does not know what monsters exist — the caller must supply the lore.",
      "",
      "Workflow: (1) call catalog-server's `get_monster_details` for each fighter, (2) pass the `data` object from each response to `simulate_battle` as `monster_a` and `monster_b`. The arena derives combat stats from the full payload, so calling with names alone is not supported. To persist an outcome, call `record_battle_result` with an `idempotency_key` you generate per logical battle.",
    ].join("\n"),
  },
);

registerSimulateBattle(server);
registerRecordBattleResult(server);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("[arena-server] connected, ready");
