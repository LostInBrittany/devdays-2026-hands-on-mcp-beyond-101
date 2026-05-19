// Solution for 4.4 — the write implementation.
// The handler IGNORES idempotency_key (intentional). Dedupe is the gateway's job.
//
// IMPORTANT OBSERVATION FOR THE 4.4 LESSON:
// arena-server/logs/arena.txt will show ONE call line for record_battle_result
// even when the LLM retries with the same idempotency_key. The dedupe happens
// in the gateway BEFORE this handler runs — so this handler logs only on
// cache-miss. That asymmetry (one arena log line, two gateway audit lines)
// IS the v3 thesis on screen.

import { z } from "zod";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { logCall, logResult } from "../log.ts";

const DATA_DIR = "arena-server/data";
const LOG_FILE = `${DATA_DIR}/battle-log.jsonl`;

export function registerRecordBattleResult(server: McpServer) {
  server.registerTool(
    "record_battle_result",
    {
      description:
        "Persist a battle outcome to the arena's log. Pass an idempotency_key per logical battle — repeat calls with the same key are deduplicated by the gateway. Returns the persisted record.",
      inputSchema: {
        winner: z.string().min(1),
        loser: z.string().min(1),
        idempotency_key: z.string().min(1),
      },
    },
    async ({ winner, loser, idempotency_key }) => {
      const start = Date.now();
      logCall("record_battle_result", { winner, loser, idempotency_key });
      void idempotency_key; // intentional: the gateway dedupes; this Tool stays naïve

      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      const record = { ts: new Date().toISOString(), winner, loser };
      appendFileSync(LOG_FILE, JSON.stringify(record) + "\n");

      logResult(
        "record_battle_result",
        `wrote winner=${winner} loser=${loser}`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            recorded: record,
            source: "arena-server",
          }, null, 2),
        }],
      };
    },
  );
}

export { DATA_DIR, LOG_FILE };
