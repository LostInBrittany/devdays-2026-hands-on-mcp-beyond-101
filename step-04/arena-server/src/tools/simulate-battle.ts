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
//
// PROVIDED — you don't need to touch this helper. You'll call it from
// the resolver you write below.
function hashString(input: string): number {
  // FNV-1a-ish rolling hash.
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function deriveStats(details: Record<string, unknown>) {
  // Stable serialisation: sort top-level keys so reordering doesn't
  // shift the score on the same payload.
  const keys = Object.keys(details).sort();
  const serialised = JSON.stringify(keys.map(k => [k, details[k]]));
  const h = hashString(serialised);
  // Split into three 8-bit slices, map each into [3, 12].
  return {
    attack:  3 + ((h        & 0xff) % 10),
    defense: 3 + (((h >>> 8)  & 0xff) % 10),
    speed:   3 + (((h >>> 16) & 0xff) % 10),
  };
}

// The arena accepts the SHAPE of the `data` object returned by
// catalog-server's get_monster_details — `name` is required, every
// other catalog field is optional and passthrough'd. The richer the
// payload the LLM hands us, the more grounded (and more varied) the
// verdict.
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

// TODO (4.0): implement the battle resolver.
//
// Input: two monster detail objects — `monster_a`, `monster_b`. Each is
// the `data` payload returned by catalog-server's `get_monster_details`
// (you'll see it as a flat object with `name`, `primary_power`,
// `weakness`, etc.).
//
// Output: { winner, loser, reason, stats } envelope.
//
// Resolution rule:
//   stats(payload) = deriveStats(payload)    ← provided above
//   score(m)       = attack + defense + speed
//   higher score wins; tie broken by alphabetically larger name
//                       ("first in line is on the losing end").
//
// Why two FULL payloads (not just two names): the arena owns combat
// math, but the math is rooted in the catalog's lore. Forcing the LLM
// to pass full payloads means the LLM has to call `get_monster_details`
// on each fighter first — that's the composition lesson of 4.0.
// "Servers are flat; the LLM is the conductor; the conductor's job is
// to fetch the lore and hand it to the arena."

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

      // TODO (4.0): replace the stub below with the resolver implementation.
      //   1. Build `a` and `b` by spreading deriveStats() onto each payload's name:
      //        const a = { name: monster_a.name, ...deriveStats(monster_a) };
      //   2. Compute score = attack + defense + speed for each.
      //   3. Pick winner (higher score; if equal, alphabetically larger
      //      name wins — "first in line is on the losing end").
      //   4. Call `logResult("simulate_battle", <one-line summary>, Date.now() - start)`
      //      before return — that's what shows up in `arena-server/logs/arena.txt`.
      //   5. Return a `{ content: [{ type: "text", text: JSON.stringify({...}) }] }`
      //      envelope shaped like:
      //        { winner, loser, reason, stats: { [a.name]: a, [b.name]: b }, source: "arena-server" }
      //
      // Example reason: "Thunderclaw (score=22) beat Aquafrost (score=19)"
      // (Actual scores depend on what the LLM passes — payload-derived,
      //  so they vary across runs. That's by design.)

      logResult("simulate_battle", "not_implemented", Date.now() - start);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "simulate_battle not implemented yet — see arena-server/src/tools/simulate-battle.ts",
            monster_a: monster_a.name,
            monster_b: monster_b.name,
          }, null, 2),
        }],
      };
    },
  );
}
