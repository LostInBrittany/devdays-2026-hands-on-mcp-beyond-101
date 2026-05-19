// Provided in the 4.0 scaffold. Same shape as step-03's src/log.ts.
// Writes one line per primitive call to arena-server/logs/arena.txt and
// mirrors to stderr. stdout is the JSON-RPC channel — never log there.

import { appendFileSync, existsSync, mkdirSync } from "node:fs";

const LOG_DIR = "arena-server/logs";
const LOG_FILE = `${LOG_DIR}/arena.txt`;

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function emit(line: string): void {
  console.error(line);
  try {
    appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // logging must never break the server
  }
}

export function logCall(toolName: string, args: unknown): void {
  const ts = new Date().toISOString();
  emit(`[${ts}] tool=${toolName} args=${JSON.stringify(args)}`);
}

export function logResult(toolName: string, summary: string, durationMs: number): void {
  const ts = new Date().toISOString();
  emit(`[${ts}] result=${toolName} ${summary} ${durationMs}ms`);
}
