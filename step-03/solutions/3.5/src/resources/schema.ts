// Resource: monsters://schema
//
// A hand-written, intent-shaped description of the RAGmonsters database.
// Notice what this is NOT: it's not a dump of column names, types, indexes,
// or constraints. v1 did that and it bit us — 9 tables of raw schema burning
// the LLM's context budget before a single question.
//
// What this IS: a domain description. The LLM gets the model in English,
// not in DDL.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { logCall, logResult } from "../log.ts";

const SCHEMA_DESCRIPTION = `# RAGmonsters database overview

A catalogue of 30 fictional monsters used as a recurring teaching example.
The data lives across nine normalised tables, but you should reason about
it as a domain, not a relational schema.

## The domain in one paragraph

Every monster has a **name** (e.g. "Thunderclaw", "Aquafrost"), belongs to
a **category** (one of six: Elemental, Construct/Artificial, Anomaly/Phenomenon,
Nature/Organic, Celestial/Cosmic, Spirit/Ethereal) via a **subcategory**, and
lives in a **habitat** within a **biome**. It has narrative attributes
(appearance, weakness, behaviour, notable specimens) and a QuestWorlds stats
subtree (keywords, abilities, flaws). It also has typed **augments**
(creatures it's strong against) and **hindrances** (creatures it's weak
against) for matchup calculations.

## What the Tools give you

- \`search_monsters_by_category(category, limit?)\` — find monsters in one
  of the six bounded categories. Start here when the user asks "show me
  X-type monsters."
- \`get_monster_details(name)\` — full profile for one monster. Use after a
  search to drill down, or directly when the user names a monster.
- \`list_categories()\` — the six categories with descriptions. Use when
  the user asks "what kinds of monsters exist?" (Also available as the
  \`monsters://categories\` Resource — cacheable.)

## What we deliberately do NOT expose

- No raw SQL. The LLM cannot write queries against the underlying tables.
- No schema modification (no DDL). The LLM cannot add columns, drop tables,
  or change types. This is intentional — v2 is read-only.
- No bulk operations. The LLM cannot fetch all monsters at once.

If you find yourself wanting one of those, you've left the v2 design surface.
That's a signal to step back and decide whether the use case deserves a new
Tool — or whether the LLM should compose existing Tools instead.
`;

export function registerSchemaResource(server: McpServer) {
  server.registerResource(
    "monsters-schema",
    "monsters://schema",
    {
      description:
        "Hand-written domain overview of the RAGmonsters dataset. Read this first to understand what Tools to reach for.",
      mimeType: "text/markdown",
    },
    async (uri) => {
      const start = Date.now();
      logCall("resource", "monsters://schema", { uri: uri.href });

      logResult(
        "monsters://schema",
        `bytes=${SCHEMA_DESCRIPTION.length}`,
        Date.now() - start,
      );

      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/markdown",
          text: SCHEMA_DESCRIPTION,
        }],
      };
    },
  );
}
