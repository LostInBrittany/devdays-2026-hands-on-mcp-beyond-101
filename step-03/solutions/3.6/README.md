# Solution — Phase 3.6 (Validate input + sanitize output)

3.5 plus output sanitisation (free-text scrubbing) and an output schema on `get_monster_details`. The LLM no longer reads raw DB strings — every free-text field goes through a redaction gate first.

## What changed from 3.5

- **New file:** `src/sanitize.ts` — `sanitizeText(text, fieldName)` runs each string through 5 regex patterns (ignore-previous, role-prefix, chat-template, inst-tags, prompt-leak). Hits are replaced with `[REDACTED]` and logged via `logCall("tool", "sanitize", ...)`.
- **Modified:** `src/tools/get-monster-details.ts` — defines a strict Zod output schema; sanitises the four free-text fields (appearance, weakness, behavior_ecology, notable_specimens) before parse+return.
- **Modified:** `src/tools/compare-monsters.ts` — sanitises `target_name` strings on augments and hindrances arrays before constructing the comparison response.

## How to use this solution

```bash
# from step-03/
cp -r solutions/3.6/src/* src/
```

Cold restart your dev terminal so the cache re-initializes.

## What this state delivers

Outputs are treated as untrusted data. Free-text fields scrubbed before they reach the LLM. The output schema documents the `get_monster_details` contract and catches schema drift. Every redaction event is logged.

To see the redaction land, inject a poisoned row via the prep-time script:

```bash
bun run scripts/poison-thunderclaw.ts          # poison
# ...ask the LLM about Thunderclaw, watch `logs/server.log`...
bun run scripts/poison-thunderclaw.ts --restore # clean up
```

**Principle landed:** *Validate every input. Sanitize every output.*

→ Next: [`3.7-auth.md`](../../3.7-auth.md) — tool-level authorisation.
