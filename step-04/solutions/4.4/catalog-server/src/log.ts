// A small logger that grows across the module.
//
// Why log from 3.0? Every "Observe" beat — every time we ask the LLM
// a question — we want to *see* which primitive fired, with what args,
// in what order. Without that, we're guessing. With it, we're watching.
//
// We write to TWO sinks (THREE in 3.8 when GOLDEN_LOG=1):
//   1. logs/server.log — file you tail in a side terminal. This is the
//      workshop's observation surface, because Claude Code spawns its own
//      copy of the server (per .mcp.json) and you cannot see *its* stderr.
//      `tail -f logs/server.log` in a third terminal gives you the trace.
//   2. stderr (console.error) — visible when you run the server standalone
//      (smoke tests, manual debugging). stdout is the JSON-RPC channel —
//      NEVER log there or you break MCP.
//   3. (3.8 only) logs/golden.jsonl — structured one-JSON-object-per-line,
//      enabled by GOLDEN_LOG=1. The golden-task harness reads this file to
//      verify which primitives the LLM actually fired during each task.
//
// Paths are relative to process.cwd(). Claude Code launches the server with
// step-03/ as cwd (per .mcp.json), so logs land at step-03/logs/.

import { appendFileSync, existsSync, mkdirSync } from "node:fs";

type Primitive = "tool" | "resource" | "prompt";

const LOG_DIR = "logs";
const LOG_FILE = `${LOG_DIR}/server.log`;
const GOLDEN_LOG = process.env.GOLDEN_LOG === "1";
const GOLDEN_LOG_FILE = `${LOG_DIR}/golden.jsonl`;

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function emit(line: string): void {
  console.error(line);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // logging must never break the server
  }
}

function maybeAppendGoldenLog(entry: object): void {
  if (!GOLDEN_LOG) return;
  try {
    appendFileSync(GOLDEN_LOG_FILE, JSON.stringify(entry) + "\n");
  } catch {
    // logging must never break the server
  }
}

export function logCall(primitive: Primitive, name: string, args: unknown): void {
  const ts = new Date().toISOString();
  emit(`[${ts}] ${primitive}=${name} args=${JSON.stringify(args)}`);
  maybeAppendGoldenLog({ kind: "call", ts, primitive, name, args });
}

export function logResult(name: string, summary: string, durationMs: number): void {
  const ts = new Date().toISOString();
  emit(`[${ts}] result=${name} ${summary} ${durationMs}ms`);
  maybeAppendGoldenLog({ kind: "result", ts, name, summary, durationMs });
}

// Server-lifecycle events (cache init, future: cache reload, auth init, etc.).
// Not a primitive call — separate channel so traces stay legible.
// NOT mirrored to golden.jsonl: that file is for LLM-driven primitive traces only.
export function logEvent(message: string): void {
  const ts = new Date().toISOString();
  emit(`[${ts}] ${message}`);
}
