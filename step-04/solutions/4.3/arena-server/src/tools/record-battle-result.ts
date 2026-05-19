import { z } from "zod";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { logCall, logResult } from "../log.ts";

// TODO (4.4): implement the write Tool.
//
// This Tool persists a battle outcome to arena-server/data/battle-log.jsonl.
// It accepts an `idempotency_key` argument and IGNORES it inside this handler.
// The dedupe logic lives in the gateway — that's the whole point of 4.4.
//
// The Tool stays naïve. The gateway does the work.

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

      // TODO (4.4): replace the stub below with the actual write.
      //   1. Ensure DATA_DIR exists (mkdirSync recursive).
      //   2. Build the record: { ts: new Date().toISOString(), winner, loser }
      //   3. appendFileSync(LOG_FILE, JSON.stringify(record) + "\n")
      //   4. Call `logResult("record_battle_result", "wrote winner=X loser=Y", Date.now() - start)`.
      //   5. Return the record in a JSON envelope.
      //
      // Note: idempotency_key is in the signature so the LLM can pass it,
      // but this handler does NOT check or remember it. Dedupe is the
      // gateway's job. From the Tool's perspective, two retries with the
      // same key would write two lines. The gateway prevents the second
      // call from ever reaching this handler.
      //
      // That means: when dedupe fires in 4.4, you'll see ONE line in
      // arena.txt for this Tool — even though the gateway audit log shows
      // two calls. That asymmetry IS the lesson.

      // Stub response so the scaffold is wired before 4.4:
      void idempotency_key;
      logResult("record_battle_result", "not_implemented", Date.now() - start);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "record_battle_result not implemented yet — see arena-server/src/tools/record-battle-result.ts",
            winner,
            loser,
          }, null, 2),
        }],
      };

      // Hint for the 4.4 implementation:
      //
      //   if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      //   const record = { ts: new Date().toISOString(), winner, loser };
      //   appendFileSync(LOG_FILE, JSON.stringify(record) + "\n");
      //   return {
      //     content: [{
      //       type: "text",
      //       text: JSON.stringify({ recorded: record, source: "arena-server" }, null, 2),
      //     }],
      //   };
    },
  );
}

// Re-export the constants so 4.4's solution can verify it's appending
// to the right file from a test harness if needed.
export { DATA_DIR, LOG_FILE };
