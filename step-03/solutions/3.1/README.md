# Solution — Phase 3.1 (Curated schema Resource)

3.0 plus a hand-written `monsters://schema` Resource.

## What changed from 3.0

- **New file:** `src/resources/schema.ts` — exposes a Markdown-ish domain description as `monsters://schema`. Logs the read via `logCall`/`logResult`.
- **Modified:** `src/server.ts` — imports `registerSchemaResource` and calls it alongside the existing Resource registration.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.1/src/* src/
```

Restart your dev terminal.

## What this state delivers

The LLM now reads one paragraph of intent before reaching for any Tool. Compare to v1, where it auto-loaded 9 tables of column metadata on connect. **Same token budget, dramatically higher information density.** And every read shows up in `logs/server.log`.

**Principle landed:** *Expose intent, not structure.*

→ Next: [`3.2-next-hypermedia.md`](../../3.2-next-hypermedia.md) — add `next` hypermedia and pagination.
