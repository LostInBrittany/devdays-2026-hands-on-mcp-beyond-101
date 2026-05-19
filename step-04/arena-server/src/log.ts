// Tiny logger for arena-server.
//
// Same pattern as step-03's src/log.ts: write to a file AND mirror to stderr.
// Claude Code spawns this process via .mcp.json (or as a gateway child) and
// the spawned process's stderr is invisible to participants — so we tail the
// FILE in a side terminal.
//
// stdout is the JSON-RPC channel — NEVER log there or you break MCP.

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
