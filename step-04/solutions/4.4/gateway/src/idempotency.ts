// Solution for 4.4 — the dedupe table implementation.
// In-memory Map, 5-minute TTL. Workshop-grade; production swaps to Redis.

export interface DedupeEntry {
  result: unknown;
  ts: number;
}

const TTL_MS = 5 * 60 * 1000;

const table = new Map<string, DedupeEntry>();

export function makeKey(childName: string, toolName: string, idempotencyKey: string): string {
  return `${childName}/${toolName}:${idempotencyKey}`;
}

export function check(key: string): DedupeEntry | undefined {
  const entry = table.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > TTL_MS) {
    table.delete(key);
    return undefined;
  }
  return entry;
}

export function record(key: string, result: unknown): void {
  table.set(key, { result, ts: Date.now() });
}

export function sweep(): void {
  const now = Date.now();
  for (const [k, entry] of table.entries()) {
    if (now - entry.ts > TTL_MS) table.delete(k);
  }
}
