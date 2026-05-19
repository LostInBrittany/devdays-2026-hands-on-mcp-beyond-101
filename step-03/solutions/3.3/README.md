# Solution — Phase 3.3 (Pre-cache Resources)

3.2 plus a startup cache for bounded, slow-changing data. The `monsters://categories` Resource and `list_categories` Tool now read from memory; no SQL fires per call. Each read logs `cache=hit`.

## What changed from 3.2

- **New file:** `src/cache.ts` — module-level cache, populated once at startup, with `initializeCache()` and `getCachedCategories()` / `getCachedSubcategories()` accessors.
- **Modified:** `src/server.ts` — imports `initializeCache` and `await`s it before `server.connect()`.
- **Modified:** `src/resources/monsters-categories.ts` — reads from `getCachedCategories()` instead of running SQL. Result log says `cache=hit`.
- **Modified:** `src/tools/list-categories.ts` — also reads from the cache. Same `cache=hit` marker.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.3/src/* src/
```

**Cold restart your dev terminal** (Ctrl-C + re-run `bun --hot run src/server.ts`). Hot reload doesn't re-run the startup `initializeCache()` call.

You should see two new log lines on startup:

```
[ragmonsters-server] initializing cache...
[ragmonsters-server] cached 6 categories, 12 subcategories
[ragmonsters-server] connected, ready
```

## What this state delivers

Resources actually live up to the "cacheable" label. The categories cache loads once; further reads are instant memory access. Every read shows `cache=hit` in `logs/server.log` — the speed-up is visible.

**Principle landed:** *If you say cacheable, make it cacheable.*

→ Next: [`3.4-compare-monsters.md`](../../3.4-compare-monsters.md) — add a Tool the LLM has been asking for.
