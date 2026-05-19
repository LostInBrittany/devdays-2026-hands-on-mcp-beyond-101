// Postgres connection helper.
//
// Connects to whatever PG server `DATABASE_URL` points at. In the workshop
// that is the shared PGlite-over-socket (in pglite/) on 127.0.0.1:5432 — same database,
// different server. That's the v2 narrative in one sentence.
//
// We use `postgres` (porsager/postgres) because its tagged template literals
// parameterise SQL by default. v1 forwarded arbitrary SQL strings; v2 never
// concatenates user input into a query. The choice of client is part of the
// design lesson.
//
// PGlite quirks (the database lives in pglite/):
//   - `:any` password — PGlite-over-socket fakes auth but requires *some* password
//   - `?sslmode=disable` — PGlite-over-socket does not speak SSL negotiation
//   - single TCP connection — only one client at a time can hold the slot

import postgres from "postgres";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:any@127.0.0.1:5432/postgres?sslmode=disable";

export const sql = postgres(DATABASE_URL, {
  ssl: false,
  max: 1,
});
