// gateway/src/idempotency.ts
//
// Built in iteration 4.4.
//
// In-memory dedupe table keyed by `${childName}/${toolName}:${idempotencyKey}`.
// Entries TTL after 5 minutes. The gateway's routeCall checks this map BEFORE
// forwarding any tool call whose args include `idempotency_key`.
//
// Why in-memory? Because this is workshop-grade. Real production gateways
// back the dedupe table with Redis or a database. The architecture is the
// same — the storage tier is the only thing that changes.
//
// Why the gateway and not the Tool? Because v3's thesis is that cross-cutting
// concerns belong in one place. Idempotency is a cross-cutting concern. The
// underlying record_battle_result Tool stays naïve.
//
// TODO (4.4): fill this file in.

export interface DedupeEntry {
  result: unknown;
  ts: number;
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

const table = new Map<string, DedupeEntry>();

export function makeKey(childName: string, toolName: string, idempotencyKey: string): string {
  return `${childName}/${toolName}:${idempotencyKey}`;
}

export function check(key: string): DedupeEntry | undefined {
  // TODO (4.4): look up `key` in `table`. If the entry exists and is
  // younger than TTL_MS, return it. If it's older, delete it and return
  // undefined. If absent, return undefined.
  void key;
  return undefined;
}

export function record(key: string, result: unknown): void {
  // TODO (4.4): write `{ result, ts: Date.now() }` into `table` under `key`.
  void key;
  void result;
}

// Optional: a sweeper to prevent the table growing forever in long-running
// sessions. Not strictly needed for the 80-min workshop.
export function sweep(): void {
  const now = Date.now();
  for (const [k, entry] of table.entries()) {
    if (now - entry.ts > TTL_MS) table.delete(k);
  }
}
