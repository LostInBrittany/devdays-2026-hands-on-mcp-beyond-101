# Step 01 — Opening: Welcome & Soft Landing

> Your first working MCP server, before we go anywhere near the disaster.

**Time:** ~20 minutes
**Goal:** have a working MCP server in your terminal, connected to your agentic assistant, responding to a real prompt — before the workshop's real work begins.

## Why this step exists

The next step (`step-02`) drops you into a deliberately broken design: a generic Postgres MCP server that *works* but produces garbage. That lesson lands only if you've first felt a *real* MCP server respond. Otherwise you'd be debugging your own setup instead of seeing the design problem.

So: this step is the soft landing.

## What you'll build

A 30-line MCP server that exposes a single `get_weather` tool over stdio. Your agentic assistant will call it. It will respond.

Nothing more. We come back for the depth in step 02.

## Setup

This step is a fully self-contained mini-project. From this folder:

```bash
bun install
```

That installs `@modelcontextprotocol/sdk`, `zod`, and the Bun types — and that's it. Look at `package.json`: two dependencies. As the workshop progresses, each step's `package.json` grows. The dependency creep from v1 → v4 is part of the lesson.

Bun's `minimumReleaseAge` (configured in `bunfig.toml`) refuses to pull any version younger than **10 days**. The workshop's first design choice happens before you write any code: **don't trust the absolute latest**. We're paranoid about supply-chain attacks. Step 04 will give that paranoia a name.

## Run the server

```bash
bun run dev
```

You should see:

```
[weather-server] listening on stdio
```

That's the server running on **stdio** transport — it reads JSON-RPC from stdin and writes responses to stdout. Bun ran the TypeScript directly; there was no transpile step.

## Connect your agentic assistant

The server is running — but it's not yet *connected* to anything. We need to tell our agentic assistant about it.

**Key principle:** we register the server **scoped to this folder**, not to your global assistant config. After the workshop, you walk away from this folder and your assistant goes back to its normal state. No cleanup. No leftover servers. No global config polluted.

The configuration is per-assistant. Pick yours:

### Claude Code

This folder already ships a `.mcp.json` file at the step root:

```json
{
  "mcpServers": {
    "weather-server": {
      "command": "bun",
      "args": ["run", "src/weather-server.ts"],
      "env": {}
    }
  }
}
```

Claude Code auto-detects `.mcp.json` when launched from a project directory. To activate:

```bash
# from inside step-01-opening/
claude
```

The first time, Claude Code will prompt: **"Allow this project's MCP server 'weather-server'?"** — approve it once. Verify the server is connected by typing `/mcp` in Claude Code; you should see `weather-server` listed.

**Scope note:** `.mcp.json` is the **project scope** — it lives in this folder, ships in this folder, only activates when Claude Code is open here. If you ever want to reset the approval prompts: `claude mcp reset-project-choices`.

If you prefer the CLI to set it up explicitly instead of trusting the committed file:

```bash
claude mcp add --transport stdio weather-server --scope project -- bun run src/weather-server.ts
```

### Google Antigravity

Antigravity's agent settings include an MCP servers panel. Check whether Antigravity supports project-scoped config (look for an "MCP" or "Workspace" section). If it does, register `weather-server` there with:
- **Command:** `bun`
- **Args:** `["run", "src/weather-server.ts"]` (relative path — Antigravity should launch from this folder)

If Antigravity only supports a user-level config, use an absolute path:
- **Args:** `["run", "<absolute-path-to-this-folder>/src/weather-server.ts"]`
- **Note:** remember to remove the entry after the workshop to avoid leftover config.

### OpenAI Codex

Codex (CLI/desktop) reads MCP servers from its config file. Check Codex's docs for a project-local config option. If you must use the global config, use an absolute path and remember to clean up afterwards.

### Other assistants

Any MCP-aware host accepts a stdio server. Look for an "MCP servers" or "Tools" configuration. Prefer a **project-scoped** or **workspace-scoped** option whenever it exists — your future self thanks you. You need:
- The command: `bun`
- The args: `["run", "src/weather-server.ts"]` (relative, if the host launches from this folder) or `["run", "<absolute-path>/src/weather-server.ts"]` (if it doesn't)

## Try it

Once your assistant is connected, ask it:

> *What's the weather in Vilnius?*

Your assistant should:
1. Recognize the `get_weather` tool is available
2. Call it with `city: "Vilnius"`
3. Receive `"Weather in Vilnius: sunny, 22°C."`
4. Tell you the weather

If that worked: **you have just shipped a working MCP server.** Pair up with the person next to you if you haven't — you'll need them for the rest of the day.

## What's in the code

Look at `src/weather-server.ts`. About 30 lines, four moving parts:

1. **`McpServer`** — the high-level server class. Give it a name and a version.
2. **`registerTool`** — declare the tool. Title, description, **typed input schema** (zod), and a handler.
3. **`StdioServerTransport`** — the wire. Reads JSON-RPC from stdin, writes responses to stdout.
4. **`server.connect(transport)`** — wires the server to the transport, starts listening.

Notice what *isn't* there: no SQL, no `eval`, no `query()` wrapper that takes arbitrary strings. The tool's input is `{ city: z.string() }`. That's a contract. The LLM can guess what to pass, but it can't smuggle SQL through the city name.

**That's the workshop in microcosm.** Step 02 will show you a server that doesn't do this. Hold onto the feeling of *this* one.

## Common gotchas

| Symptom | Fix |
|---|---|
| `bun: command not found` | Install Bun: `curl -fsSL https://bun.sh/install \| bash` |
| `bun install` fails citing `minimumReleaseAge` | A dependency you need is younger than 10 days. Either wait, or add it to `minimumReleaseAgeExcludes` in `bunfig.toml` (only if you've reviewed the change) |
| Assistant doesn't see the `get_weather` tool | Restart the assistant after editing its MCP config. Make sure the path in `args` is absolute |
| Server starts but assistant says "I don't have weather data" | The tool description may be too vague for the model. Try a more direct prompt: *"Use the get_weather tool to tell me the weather in Vilnius."* |
| `permission denied` running `bun` from the assistant | Some assistants sandbox tool calls. Check the assistant's MCP/tool permissions; allow the new server |

## Try a few more prompts

If everything works, try:

- *"What's the weather in three cities — Vilnius, Madrid, and Tokyo — and which is warmest?"*

Watch the agent make three separate tool calls, then reason over the results. That's tool orchestration.

(The temperature is always 22°C because our server is stubbed — but the pattern is real.)

## What to read next

You're ready for **step 02** — where we set up a deliberately broken MCP server and watch it bite us.

Before moving on: notice that your Weather Tool was *typed*, *narrow*, and *intentional*. The next step's server will be none of those things. The contrast is the lesson.
