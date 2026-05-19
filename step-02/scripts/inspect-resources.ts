// Quick prep-time inspector: how many resources does the deprecated pg-mcp
// auto-expose for the full RAGmonsters schema, and how big is each one?
// Useful for tuning the README's "token bloat" prompt expectations.

import { spawn } from "bun";

const PG_URL = "postgres://postgres:any@127.0.0.1:5432/postgres?sslmode=disable";

const proc = spawn({
  cmd: ["bunx", "--bun", "@modelcontextprotocol/server-postgres@0.6.2", PG_URL],
  stdin: "pipe",
  stdout: "pipe",
  stderr: "inherit",
});

const reader = proc.stdout.getReader();
const decoder = new TextDecoder();
let buffer = "";

async function readMessage(): Promise<any> {
  while (true) {
    const idx = buffer.indexOf("\n");
    if (idx >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.trim()) return JSON.parse(line);
    }
    const { value, done } = await reader.read();
    if (done) throw new Error("server closed stdout");
    buffer += decoder.decode(value, { stream: true });
  }
}

async function send(msg: unknown): Promise<void> {
  await proc.stdin.write(JSON.stringify(msg) + "\n");
}

let id = 0;
async function rpc(method: string, params: unknown): Promise<any> {
  const reqId = ++id;
  await send({ jsonrpc: "2.0", id: reqId, method, params });
  while (true) {
    const m: any = await readMessage();
    if (m.id === reqId) return m;
  }
}

await rpc("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "inspector", version: "0.0.1" },
});
await send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });

const list = await rpc("resources/list", {});
const resources = list.result?.resources ?? [];
console.error(`\n=== ${resources.length} resources auto-exposed ===`);
for (const r of resources) {
  console.error(`  ${r.name}  (${r.uri})`);
}

console.error(`\n=== Token-bloat estimate: read every resource ===`);
let total = 0;
for (const r of resources) {
  const got = await rpc("resources/read", { uri: r.uri });
  const text = got.result?.contents?.[0]?.text ?? "";
  total += text.length;
  console.error(`  ${r.name}  →  ${text.length} chars`);
}
console.error(`\nTOTAL auto-injected schema bytes: ${total}  (≈ ${Math.round(total / 4)} tokens)`);

proc.kill();
await proc.exited;
process.exit(0);
