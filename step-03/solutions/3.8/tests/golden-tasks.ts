// Golden tasks for ragmonsters-server.
//
// Each task names a prompt and the tool sequence we expect the LLM to use.
// `args_match` is a regex over the JSON-stringified args — keep it loose
// enough that minor LLM variation passes, tight enough that wrong-tool or
// wrong-args fails.

export type ExpectedCall = {
  primitive: "tool" | "resource" | "prompt";
  name: string;
  args_match?: RegExp;
};

export type GoldenTask = {
  name: string;
  prompt: string;
  expected_calls: ExpectedCall[];
};

export const TASKS: GoldenTask[] = [
  {
    name: "list elementals",
    prompt: "List Elemental monsters.",
    expected_calls: [
      {
        primitive: "tool",
        name: "search_monsters_by_category",
        args_match: /"category"\s*:\s*"Elemental"/,
      },
    ],
  },
  {
    name: "compare two monsters",
    prompt: "Who would win — Thunderclaw or Aquafrost?",
    expected_calls: [
      {
        primitive: "tool",
        name: "compare_monsters",
        args_match: /Thunderclaw.*Aquafrost|Aquafrost.*Thunderclaw/,
      },
    ],
  },
  {
    name: "fetch one monster's details",
    prompt: "Tell me everything about Cinderwing.",
    expected_calls: [
      {
        primitive: "tool",
        name: "get_monster_details",
        args_match: /"name"\s*:\s*"Cinderwing"/i,
      },
    ],
  },
];
