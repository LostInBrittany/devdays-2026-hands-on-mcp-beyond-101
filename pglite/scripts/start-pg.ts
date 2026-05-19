// Boot a PGlite instance and serve it over the Postgres wire protocol on :5432.
// The official pg-mcp server connects to it like any real Postgres.

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DATA_DIR = resolve(import.meta.dir, "..", "pgdata");
const SEED_PATH = resolve(import.meta.dir, "..", "db", "seed.sql");
const PORT = Number(process.env.PG_PORT ?? 5432);
const HOST = process.env.PG_HOST ?? "127.0.0.1";

console.error(`[pg] booting PGlite at ${DATA_DIR}`);
const db = new PGlite(DATA_DIR);
await db.waitReady;

console.error(`[pg] applying seed from ${SEED_PATH}`);
const seedSql = await readFile(SEED_PATH, "utf8");
await db.exec(seedSql);

const rows = await db.query<{ count: bigint }>("SELECT count(*)::bigint AS count FROM monsters");
console.error(`[pg] seeded — monsters table has ${rows.rows[0]?.count ?? "?"} row(s)`);

const server = new PGLiteSocketServer({ db, host: HOST, port: PORT });
await server.start();
console.error(`[pg] PGLiteSocketServer listening on ${HOST}:${PORT}`);
console.error(`[pg] connect with:  postgres://postgres@${HOST}:${PORT}/postgres`);

const shutdown = async (sig: string) => {
  console.error(`[pg] received ${sig}, shutting down`);
  await server.stop();
  await db.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
