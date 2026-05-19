import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { logCall, logResult } from "../log.ts";

// Derive combat stats from a monster's FULL detail payload (the `data`
// object returned by catalog-server's `get_monster_details`). The hash
// is taken over the entire payload, so the verdict depends on every
// field the catalog returned — name, monster_type, habitat, primary
// power, weakness, behaviour, etc.
//
// Why hash the whole payload? Because we want the catalog call to be
// LOAD-BEARING. If the LLM tried to call simulate_battle with just a
// name, deriveStats would still run but the score would degenerate to
// a hash over { name } only — every monster would land in a tiny
// equivalence class and the lesson "fetch lore first, then resolve"
// would die. With the full payload, the verdict literally cannot be
// reached without the catalog. That's what makes 4.0 a composition
// lesson and not a single-server demo.
//
// Determinism: deriveStats is deterministic over its input. Across
// runs, the LLM may marshal the catalog payload slightly differently
// (truncation, field reordering, paraphrased free-text), so the SAME
// pair of monsters may produce different scores on different runs.
// That's fine — the workshop wants composition, not reproducibility.
function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function deriveStats(details: Record<string, unknown>) {
  const keys = Object.keys(details).sort();
  const serialised = JSON.stringify(keys.map(k => [k, details[k]]));
  const h = hashString(serialised);
  return {
    attack:  3 + ((h        & 0xff) % 10),
    defense: 3 + (((h >>> 8)  & 0xff) % 10),
    speed:   3 + (((h >>> 16) & 0xff) % 10),
  };
}

const monsterDetailsInput = z.object({
  name: z.string().min(1),
  monster_type:      z.string().optional(),
  habitat:           z.string().optional(),
  biome:             z.string().optional(),
  rarity:            z.string().optional(),
  height:            z.string().optional(),
  weight:            z.string().optional(),
  appearance:        z.string().optional(),
  primary_power:     z.string().optional(),
  secondary_power:   z.string().optional(),
  special_ability:   z.string().optional(),
  weakness:          z.string().optional(),
  behavior_ecology:  z.string().optional(),
  notable_specimens: z.string().optional(),
  category_name:     z.string().optional(),
}).passthrough();

export function registerSimulateBattle(server: McpServer) {
  server.registerTool(
    "simulate_battle",
    {
      description:
        "Resolve a battle between two monsters. PREREQUISITE: call catalog-server's `get_monster_details` for each monster first and pass the `data` object from each response as `monster_a` and `monster_b` — the arena derives combat stats from the full lore payload, so calling this Tool with just names is NOT supported. Returns winner, loser, reason, and the derived stats. Higher (attack+defense+speed) wins; ties broken by alphabetically larger name.",
      inputSchema: {
        monster_a: monsterDetailsInput.describe(
          "Full details for fighter A. Pass the `data` object from catalog-server's get_monster_details response — must include `name`; the more fields you include, the more grounded the verdict.",
        ),
        monster_b: monsterDetailsInput.describe(
          "Full details for fighter B — same shape as monster_a.",
        ),
      },
    },
    async ({ monster_a, monster_b }) => {
      const start = Date.now();
      logCall("simulate_battle", { a: monster_a.name, b: monster_b.name });

      const a = { name: monster_a.name as string, ...deriveStats(monster_a) };
      const b = { name: monster_b.name as string, ...deriveStats(monster_b) };

      const scoreA = a.attack + a.defense + a.speed;
      const scoreB = b.attack + b.defense + b.speed;

      let winner: typeof a;
      let loser: typeof a;
      let winnerScore: number;
      let loserScore: number;
      if (scoreA > scoreB) {
        winner = a; loser = b; winnerScore = scoreA; loserScore = scoreB;
      } else if (scoreB > scoreA) {
        winner = b; loser = a; winnerScore = scoreB; loserScore = scoreA;
      } else {
        // tie — alphabetically larger name wins
        if (a.name.localeCompare(b.name) > 0) {
          winner = a; loser = b;
        } else {
          winner = b; loser = a;
        }
        winnerScore = loserScore = scoreA;
      }

      logResult(
        "simulate_battle",
        `winner=${winner.name} (${winnerScore}) loser=${loser.name} (${loserScore})`,
        Date.now() - start,
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            winner: winner.name,
            loser:  loser.name,
            reason: `${winner.name} (score=${winnerScore}) beat ${loser.name} (score=${loserScore})`,
            stats:  { [a.name]: { ...a }, [b.name]: { ...b } },
            source: "arena-server",
          }, null, 2),
        }],
      };
    },
  );
}
