import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";


import { checkAuthPrompt } from "../auth.ts";
import { logCall } from "../log.ts";

export function registerAnalyzeMonsterPrompt(server: McpServer) {
  server.registerPrompt(
    "analyze_monster",
    {
      description:
        "Structured weakness-and-matchup analysis for a given monster. The LLM follows the template instead of inventing one each time.",
      argsSchema: {
        monster_name: z.string().min(1),
      },
    },
    async ({ monster_name }) => {
      const denied = checkAuthPrompt("analyze_monster");
      if (denied) return denied;

      logCall("prompt", "analyze_monster", { monster_name });

      const text = `Analyse the monster called "${monster_name}" using the ragmonsters-server.

Follow this workflow exactly — do not skip steps or invent your own ordering:

**Step 1 — Profile.**
Call \`get_monster_details({ name: "${monster_name}" })\`. Read the response carefully.
Note the category, monster_type, habitat, rarity, and primary_power.

**Step 2 — Peers.**
Using the category from Step 1, call \`search_monsters_by_category({ category: "<category-from-step-1>", limit: 5 })\`.
This returns up to five peers in the same category.

**Step 3 — Matchup.**
Pick the most contrasting peer (different monster_type, or different habitat).
Call \`compare_monsters({ name_a: "${monster_name}", name_b: "<peer-name>" })\`.
Read the \`summary\` field of the response and the \`augments\`/\`hindrances\`
arrays for each combatant. The server returns the structured matchup data;
the verdict is yours to write — that's the point of the design.

**Step 4 — Output.**
Write your final answer in exactly these four sections, in this order, with these headings:

### Profile
A two-sentence summary of "${monster_name}". Include category, type, habitat, rarity.

### Affinities
List the monster's augments (strong against) and hindrances (weak against) from Step 1.

### Matchup
A one-sentence verdict ("X has the edge because…") based on the augments
and hindrances from Step 3. The server gave you the structured matchup;
the judgement is yours.

### Strategy
Two bullet points: one tactic that plays to "${monster_name}"'s strengths, one
tactic to watch out for in fights against it.

Do not add other sections. Do not write a preamble. Begin with the "### Profile" heading.`;

      return {
        messages: [{
          role: "user" as const,
          content: { type: "text" as const, text },
        }],
      };
    },
  );
}
