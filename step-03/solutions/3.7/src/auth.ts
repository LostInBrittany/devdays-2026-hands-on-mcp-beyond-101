// Principal + per-primitive permissions, set at server startup.
//
// The "principal" is the identity of the caller. In v2 over stdio it's an
// env var the server reads on launch. In v3 this becomes a token claim —
// same shape, different source.

import { logCall } from "./log.ts";

const PERMISSIONS = {
  guest: new Set([
    "search_monsters_by_category",
    "get_monster_details",
    "list_categories",
    "monsters://categories",
    "monsters://schema",
    "analyze_monster",
  ]),
  developer: new Set([
    "search_monsters_by_category",
    "get_monster_details",
    "list_categories",
    "compare_monsters",
    "monsters://categories",
    "monsters://schema",
    "analyze_monster",
  ]),
} as const;

export type Principal = keyof typeof PERMISSIONS;

export function principal(): Principal {
  const fromEnv = process.env.MCP_PRINCIPAL;
  if (fromEnv && fromEnv in PERMISSIONS) {
    return fromEnv as Principal;
  }
  return "guest";
}

export function checkAuth(name: string): {
  content: Array<{ type: "text"; text: string }>;
} | null {
  const p = principal();
  const allowed = PERMISSIONS[p].has(name);
  logCall("tool", "auth", { name, principal: p, decision: allowed ? "allow" : "deny" });

  if (allowed) return null;

  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        error: `auth_denied: principal "${p}" cannot access "${name}"`,
        source: "RAGmonsters DB · ragmonsters-server 3.7",
        next: [`list_categories({})`],
      }, null, 2),
    }],
  };
}

export function checkAuthResource(uri: string, name: string): {
  contents: Array<{ uri: string; mimeType: string; text: string }>;
} | null {
  const p = principal();
  const allowed = PERMISSIONS[p].has(name);
  logCall("resource", "auth", { name, principal: p, decision: allowed ? "allow" : "deny" });

  if (allowed) return null;

  return {
    contents: [{
      uri,
      mimeType: "application/json",
      text: JSON.stringify({
        error: `auth_denied: principal "${p}" cannot access "${name}"`,
      }, null, 2),
    }],
  };
}

export function checkAuthPrompt(name: string): {
  messages: Array<{ role: "user"; content: { type: "text"; text: string } }>;
} | null {
  const p = principal();
  const allowed = PERMISSIONS[p].has(name);
  logCall("prompt", "auth", { name, principal: p, decision: allowed ? "allow" : "deny" });

  if (allowed) return null;

  return {
    messages: [{
      role: "user" as const,
      content: {
        type: "text" as const,
        text: `auth_denied: principal "${p}" cannot access prompt "${name}".`,
      },
    }],
  };
}
