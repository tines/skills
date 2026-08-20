---
name: mcp-builder
description: Build high-quality MCP (Model Context Protocol) servers that let an AI interact with external services through well-designed tools. Use whenever you are building an MCP server to integrate an external API or service, in either Python (FastMCP) or TypeScript (MCP SDK). When the server is deployed as a 3B workflow, put it behind the built-in `space` or `tenant` route auth and let the platform authenticate clients instead of implementing the MCP OAuth handshake in the server.
license: Apache-2.0
compatibility: Tines 3B
---

# Building an MCP server

An MCP server exposes an external service to an AI as a set of tools. Its quality is measured by one thing: how reliably an AI can use those tools to accomplish real tasks. Build for the AI that will call it, not for human readers of the API.

## Phase 1 — Research and plan

- **Read the service’s API docs first.** Identify the key endpoints, the auth model, rate limits, and the core data shapes. Use web search and fetch the live docs rather than guessing.
- **Read the MCP spec and SDK docs.** Start from the sitemap at `https://modelcontextprotocol.io/sitemap.xml`, then fetch specific pages with a `.md` suffix. For the SDKs, fetch the TypeScript SDK README (`github.com/modelcontextprotocol/typescript-sdk`) or Python SDK README (`github.com/modelcontextprotocol/python-sdk`).
- **Decide coverage vs. workflow tools.** Comprehensive endpoint coverage gives the AI flexibility to compose operations; a few higher-level workflow tools are more convenient for common tasks. When unsure, prioritize comprehensive coverage and add workflow tools for the hot paths.

## Phase 2 — Implement

**Recommended stack:** TypeScript with the MCP SDK. Use streamable HTTP with stateless JSON for remote servers (simple to scale), and stdio for local servers.

Build shared infrastructure once: an authenticated API client, error-handling helpers, response formatting, and pagination.

For each tool:

- **Name it clearly and consistently.** Use an action-oriented, prefixed scheme — `github_create_issue`, `github_list_repos` — so the AI can find the right tool fast.
- **Define a strict input schema** with Zod (TypeScript) or Pydantic (Python). Add constraints, clear field descriptions, and examples in the descriptions.
- **Define an output schema** where possible and return structured content, not just text — it helps the client parse results.
- **Return focused data.** Support filtering and pagination so a single call can’t flood the context window.
- **Write actionable errors.** An error should tell the AI what went wrong and what to try next, not just echo a stack trace.
- **Set annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint` — so clients can reason about safety.

## Deploying on 3B — let the platform authenticate clients

When the server runs as a 3B workflow (a step with a `route`, `route_type = "api"`), do **not** implement the MCP authorization spec — discovery, dynamic client registration, consent, or token exchange — inside the server. Set `route_auth = "space"` (or `"tenant"`) on the route: the `space` and `tenant` bars accept an OAuth access token as one of their credentials, so 3B handles the entire client-facing OAuth 2.1 handshake at the platform boundary — it serves the protected-resource and authorization-server metadata, registers clients, runs the consent screen, issues and verifies access tokens, and enforces them on every request.

```toml
# Routes are unique per space — use a /<server-name>/mcp path, never a bare "/mcp"
route = "/github/mcp"
route_type = "api"
route_auth = "space"
output = true
```

Routes are unique within a space, and publishing a second workflow on a path that’s already live is rejected — so give the route a `/<server-name>/mcp` path (`/github/mcp`, `/slack/mcp`) rather than a bare `/mcp`. MCP clients connect to the full URL you hand them, so the path is just a name; there’s no requirement to serve at `/mcp`.

Your step then receives only authenticated requests, with the consenting user’s email in the `x-3b-authenticated-email` header and the bearer **stripped** before it reaches your code — so never read, require, or forward the `Authorization` header for the server’s own auth. Each token is bound to this one route, independently revocable, and gated on the caller’s access to the workflow’s space.

To serve an **external audience** — partner organizations or customers whose users are not 3B members — use `route_auth = "sso"`. When the tenant has its own SSO provider registered in SSO settings with a pinned email domain (the built-in 3B sign-in doesn’t count), the platform runs the same client-facing OAuth handshake, but consent authenticates the human against that provider instead of a 3B account: callers hold a valid token vouched for by the tenant’s provider and on its pinned domain, with no 3B user, membership, or space access involved, and `x-3b-authenticated-email` carries the email the IdP vouched for.

This is the auth model for the MCP server _itself_. It is separate from how your tools authenticate to the external service they wrap (Phase 1) — that still uses the service’s own credentials.

## Phase 3 — Review and test

Review for DRY code, consistent error handling, full type coverage, and clear tool descriptions. Build (`npm run build` / `python -m py_compile`), then exercise the server interactively with the MCP Inspector (`npx @modelcontextprotocol/inspector`).

## Phase 4 — Evaluate

Write ~10 evaluation questions that prove an AI can actually use the server. Each should be independent, read-only, realistic, and complex enough to need several tool calls, with a single verifiable answer that won’t drift over time. Solve each yourself first to confirm the answer. Run the questions against the server and fix the tools that make them hard.

---

_Adapted by 3B from Anthropic’s “mcp-builder” skill (github.com/anthropics/skills), © Anthropic PBC, licensed under Apache-2.0. Modified for 3B._
