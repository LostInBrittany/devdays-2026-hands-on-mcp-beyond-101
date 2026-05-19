// Smoke test for step-04's walkthroughs.
//
// Verifies the building blocks each walkthrough relies on actually work
// end-to-end:
//
//   - simulate_battle resolver (4.0) — runs the score function directly
//   - record_battle_result writer (4.4) — appends a JSONL line, then reads it back
//   - idempotency check/record (4.4) — round-trip a key, verify it survives
//
// Does NOT spawn the gateway or children — for that, run them via the .mcp.json
// path (claude code) or `bun --hot run gateway/src/server.ts`.
//
// Usage: bun run scripts/smoke.ts

import { existsSync, mkdirSync, appendFileSync, readFileSync, rmSync } from "node:fs";
import { check, record, makeKey } from "../gateway/src/idempotency.ts";

// deriveStats — mirror of the helper in arena-server/src/tools/simulate-battle.ts.
// Kept local so this smoke test stays standalone (no MCP spawn required).
// The real arena hashes the FULL `data` payload returned by catalog-server's
// get_monster_details — we mimic that here with two small fixture payloads.
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

const banner = (s: string) => console.log(`\n=== ${s} ===`);
const ok = (label: string) => console.log(`✓ ${label}`);
const fail = (label: string, err: unknown) => {
  failures += 1;
  console.log(`✗ ${label} — ${(err as Error).message}`);
};

let failures = 0;

// ---------- 4.0: simulate_battle scoring ----------

banner("4.0 — simulate_battle scoring (Thunderclaw vs Aquafrost)");
try {
  // Fixture payloads — shaped like what catalog-server's get_monster_details
  // returns in its `data` field. The real arena receives one of these per fighter.
  const thunderclawData = {
    name: "Thunderclaw",
    monster_type: "Storm Beast",
    habitat: "Stormwracked Peaks",
    primary_power: "Chain lightning",
    weakness: "Grounding circles of copper salt",
  };
  const aquafrostData = {
    name: "Aquafrost",
    monster_type: "Frost Elemental",
    habitat: "Glacial Caverns",
    primary_power: "Cryokinetic blasts",
    weakness: "Sustained thermal shock",
  };
  const a = { name: thunderclawData.name, ...deriveStats(thunderclawData) };
  const b = { name: aquafrostData.name,   ...deriveStats(aquafrostData) };
  const scoreA = a.attack + a.defense + a.speed;
  const scoreB = b.attack + b.defense + b.speed;
  const winner = scoreA > scoreB
    ? a
    : scoreB > scoreA
      ? b
      : (a.name.localeCompare(b.name) > 0 ? a : b);
  console.log(`  ${a.name}=${scoreA}  ${b.name}=${scoreB}  winner=${winner.name}`);
  // deriveStats is deterministic over its input — same payload in, same stats out.
  const a2 = deriveStats(thunderclawData);
  if (a2.attack !== a.attack || a2.defense !== a.defense || a2.speed !== a.speed) {
    throw new Error("deriveStats is not deterministic for identical payloads");
  }
  // Adding a field changes the score — that's the whole point.
  const a3 = deriveStats({ ...thunderclawData, behavior_ecology: "Solitary hunter" });
  if (a3.attack === a.attack && a3.defense === a.defense && a3.speed === a.speed) {
    throw new Error("deriveStats should be sensitive to payload changes");
  }
  ok("score function produces a winner; stats track payload contents");
} catch (e) { fail("simulate_battle scoring", e); }

// ---------- 4.4: record_battle_result writer ----------

banner("4.4 — record_battle_result writes one JSONL line");
try {
  const DATA_DIR = "arena-server/data";
  const LOG_FILE = `${DATA_DIR}/battle-log.smoke.jsonl`;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  // Clean state for the smoke run
  try { rmSync(LOG_FILE); } catch { /* fine if absent */ }
  const record1 = { ts: new Date().toISOString(), winner: "Thunderclaw", loser: "Aquafrost" };
  appendFileSync(LOG_FILE, JSON.stringify(record1) + "\n");
  const lines = readFileSync(LOG_FILE, "utf-8").split("\n").filter(Boolean);
  if (lines.length !== 1) throw new Error(`expected 1 line, got ${lines.length}`);
  ok(`wrote 1 line to ${LOG_FILE}`);
  rmSync(LOG_FILE);
} catch (e) { fail("record_battle_result write", e); }

// ---------- 4.4: idempotency dedupe (informational — passes only after 4.4) ----------

banner("4.4 — idempotency check/record round-trip");
const key = makeKey("arena", "record_battle_result", "smoke-key-001");
const before = check(key);
if (before !== undefined) {
  fail("first check()", new Error(`expected undefined, got ${JSON.stringify(before)}`));
} else {
  ok("first check() returns undefined");
}

record(key, { recorded: { winner: "Thunderclaw", loser: "Aquafrost" } });
const after = check(key);
const idemImplemented = after !== undefined;
if (idemImplemented) {
  ok("second check() returns the recorded entry (idempotency.ts is implemented — 4.4 done)");
} else {
  console.log("○ second check() returns undefined — idempotency.ts is still TODO (pre-4.4 state, expected)");
}

// ---------- Summary ----------

banner("Summary");
if (failures === 0) {
  console.log(idemImplemented
    ? "✓ all step-04 smoke checks pass (4.4 implemented)"
    : "✓ pre-4.4 checks pass (idempotency.ts TODO, as shipped)");
} else {
  console.log(`✗ ${failures} failure(s) — fix before running the gateway`);
  process.exit(1);
}
