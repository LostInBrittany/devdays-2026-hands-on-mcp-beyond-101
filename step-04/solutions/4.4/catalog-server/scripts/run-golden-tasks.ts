#!/usr/bin/env bun
//
// Manual golden-task harness for the workshop.
//
// Workflow:
//   1. For each task, the harness clears logs/golden.jsonl.
//   2. It prints the prompt to copy into Claude Code.
//   3. You run that prompt; when Claude Code finishes, you press Enter.
//   4. The harness reads logs/golden.jsonl and validates the captured
//      call sequence against the expected one.
//
// The server must be running with `GOLDEN_LOG=1` so it writes to the
// JSONL file the harness reads.

import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from "node:fs";
import { createInterface } from "node:readline/promises";

import { TASKS, type ExpectedCall, type GoldenTask } from "../tests/golden-tasks.ts";

const LOG_FILE = "logs/golden.jsonl";

type LogEntry =
  | { kind: "call"; primitive: "tool" | "resource" | "prompt"; name: string; args: unknown }
  | { kind: "result"; name: string; summary: string; durationMs: number };

function readCalls(): LogEntry[] {
  if (!existsSync(LOG_FILE)) return [];
  const text = readFileSync(LOG_FILE, "utf-8");
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

function findMatchingCall(
  expected: ExpectedCall,
  captured: LogEntry[],
  startAt: number,
): number {
  for (let i = startAt; i < captured.length; i++) {
    const entry = captured[i]!;
    if (entry.kind !== "call") continue;
    if (entry.primitive !== expected.primitive) continue;
    if (entry.name !== expected.name) continue;
    if (expected.args_match) {
      const argsStr = JSON.stringify(entry.args);
      if (!expected.args_match.test(argsStr)) continue;
    }
    return i;
  }
  return -1;
}

function assertSequence(
  captured: LogEntry[],
  expected: ExpectedCall[],
): { pass: true } | { pass: false; reason: string } {
  let cursor = 0;
  for (const exp of expected) {
    const idx = findMatchingCall(exp, captured, cursor);
    if (idx < 0) {
      const visible = captured
        .filter((e): e is Extract<LogEntry, { kind: "call" }> =>
          e.kind === "call" && e.name !== "auth" && e.name !== "sanitize",
        )
        .map((e) => `${e.primitive}=${e.name}`);
      return {
        pass: false,
        reason:
          `Expected ${exp.primitive}=${exp.name}` +
          (exp.args_match ? ` matching ${exp.args_match}` : "") +
          `. Captured (filtered): [${visible.join(", ")}]`,
      };
    }
    cursor = idx + 1;
  }
  return { pass: true };
}

async function runTask(
  task: GoldenTask,
  rl: ReturnType<typeof createInterface>,
): Promise<boolean> {
  console.log(`\n=== ${task.name} ===`);
  console.log(`Open Claude Code and ask:\n  "${task.prompt}"\n`);
  await rl.question("Press Enter once Claude Code has finished... ");

  const captured = readCalls();
  const result = assertSequence(captured, task.expected_calls);

  if (result.pass) {
    console.log(`  ✓ pass`);
    return true;
  } else {
    console.log(`  ✗ fail: ${result.reason}`);
    return false;
  }
}

async function main() {
  if (!existsSync("logs")) {
    mkdirSync("logs", { recursive: true });
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log(`Golden tasks — ${TASKS.length} tasks. Make sure your server runs with GOLDEN_LOG=1.\n`);

  let pass = 0, fail = 0;
  for (const task of TASKS) {
    writeFileSync(LOG_FILE, "");
    const ok = await runTask(task, rl);
    if (ok) pass++; else fail++;
  }

  rl.close();
  console.log(`\n────────────────────────────`);
  console.log(`${pass}/${TASKS.length} passed.`);
  process.exit(fail === 0 ? 0 : 1);
}

await main();
