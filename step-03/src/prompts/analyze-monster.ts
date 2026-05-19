// Prompt: analyze_monster
//
// A workflow template the server supplies. Without this, every conversation
// has to re-explain "first call get_monster_details, then check augments and
// hindrances for matchups, then summarise." Each re-explanation drifts a
// little — different word choices, different ordering, different output shape.
//
// Encoding the workflow once means consistent output across runs. The LLM
// is good at reasoning; it's bad at remembering *your* specific reasoning
// template. A Prompt is how the server hands it the template.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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
      // TODO — fill in the Prompt body.
      //
      // A Prompt returns a `messages` array. Each message is what would normally
      // be typed by the user — but here, the server supplies it. The LLM receives
      // it as if the user had asked, and answers accordingly.
      //
      // Build a single user-role message whose text encodes the workflow:
      //
      //   "I need you to analyse the monster called <monster_name>.
      //    Follow these steps in order:
      //      1. Call get_monster_details to fetch its profile.
      //      2. Identify the monster's category and elemental affinities.
      //      3. Look up its augments (creatures it's strong against) and
      //         hindrances (creatures it's weak against).
      //      4. Summarise the most exploitable weaknesses in plain language.
      //    Format your answer with headed sections: Profile, Affinities,
      //    Matchups, Weaknesses-To-Exploit."
      //
      // The exact wording is the design surface. Different templates produce
      // different outputs — that's the point.
      //
      // Return shape:
      //   { messages: [{ role: "user", content: { type: "text", text: "..." } }] }

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `TODO: analyze_monster prompt not yet implemented for monster "${monster_name}"`,
            },
          },
        ],
      };
    },
  );
}
