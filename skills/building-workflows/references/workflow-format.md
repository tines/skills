# 3B workflow format

## Layout

```text
README.md
<Step name>/
  README.md
  config.toml
  Dockerfile
  ...
```

Within a workflow checkout, each top-level directory is a uniquely named step. Keep a `README.md` at the root and in every step. The UI already displays the workflow or step name, so do not repeat it as the opening heading.

The workflow README should explain its business purpose, triggers, flow, boundary inputs and outputs, external services, side effects, useful operational notes, and where to make common changes. A step README should identify its trigger and explain its behavior, non-obvious input and output shapes, external endpoints, and connectors. Link to workflow files with relative Markdown paths, wrapping paths containing spaces in angle brackets. Update a README when behavior or structure changes materially, but not for a behavior-preserving refactor.

A cloned 3B space adds one directory per workflow:

```text
<Workflow name>/
  workflow.toml
  README.md
  <Step name>/
    ...
```

`workflow.toml` identifies an existing workflow. Preserve its `id`, and never copy it into another workflow directory. In a 3B-hosted space clone, pushing a new top-level directory without `workflow.toml` creates that workflow as a draft from a non-`main` branch or in Live from `main`; 3B writes the identity file back.

## Step templates

Templates map to `shell` → `script.sh`, `python` → `script.py`, `typescript` → `script.ts` on Bun, `react` → `App.tsx` with React and Tailwind, and `agent` → `agent.ts`. React templates set `output = true`.

Copy the closest template available through the current interface. In a Git checkout without interface-provided templates, copy the matching directory from [assets/templates](../assets/templates) into the workflow and rename it for the step. A step may contain and import additional source files; the template entry point is the command the runtime invokes. Add Python dependencies to `requirements.txt` and TypeScript or React dependencies to `package.json`; preserve the template’s install and cache layers instead of adding ad hoc installs to the Dockerfile.

For React, default to one step for one application. Do not place the UI downstream of a data step: render it immediately and fetch data from route steps.

## `config.toml`

All fields are optional at runtime, and a missing `color` defaults to `sky`. Set a color in authored steps, and omit unused fields rather than writing empty values.

```toml
color = "sky"
output = true
route = "/document-summary"
route_auth = "space"
route_type = "api"
title = "Document summary"
cron = "0 * * * *"
email_address = "support"
timeout = 60
retry_seconds = [1, 2, 3]
links = ["Store result", "Notify"]
connectors = [{ name = "slack", type = "slack" }]
pinned = true
```

- Colors: `pink`, `purple`, `teal`, `green`, `orange`, `red`, or `sky`.
- `output`: makes stdout the HTTP response.
- `route`: assigns an HTTP path. Live routes must be unique among workflows that share a public host. `/` is that host’s catch-all and should be used only for an explicitly requested homepage.
- `route_auth`: defaults to `space`.
- `route_type`: exposes the route on the Links page as `webpage`, `api`, `webhook`, or `other`.
- `title`: names a route exposed on the Links page; set it whenever `route_type` is present.
- `cron`: schedules the published step; drafts do not run schedules.
- `email_address`: gives the step an inbound email trigger; the raw message becomes stdin.
- `timeout`: accepts 1–300 seconds and defaults to 45.
- `retry_seconds`: accepts at most 10 whole-second delays from 1–1,800. Each value schedules another whole-step attempt after a runtime command exits nonzero, so `[1, 2, 3]` permits four attempts. It does not retry builds, step tests, timeouts, out-of-memory failures, or missing commands. Use it only when replaying side effects is safe.
- `links`: names downstream step directories. Do not list the same target twice.
- `connectors`: is managed by connector tooling, never by hand.
- `pinned`: places a typed route first on the Links page; the UI normally manages it.

## Process and link semantics

Each step is an isolated process. Its raw stdout becomes stdin for every linked downstream step. Fan-out runs in parallel. With multiple upstream steps, the most recent successful upstream output is used.

Zero-byte stdout suppresses downstream execution. A step reports failure only through a nonzero exit status. Do not catch an error, log it, and continue unless success is intentional. 3B retains at most 10 KiB of stderr as its diagnostic output; stdout is the workflow data channel.

A step with no trigger receives empty stdin. A route step receives a complete RFC 7230 HTTP request. An email step receives the raw RFC 822 message.

## HTTP routes

The responding step needs `output = true` and must emit a complete HTTP response with `\r\n` line endings and a `\r\n\r\n` separator before the body. Without a reachable output step, 3B returns `202 Accepted` with no body.

| `route_auth`  | Access                                                    |
| ------------- | --------------------------------------------------------- |
| `space`       | Members of the workflow’s space; the default              |
| `tenant`      | Any authenticated tenant member                           |
| `sso`         | External users authenticated by the tenant’s SSO provider |
| `external_id` | Anyone holding the route’s unguessable ID                 |
| `connector`   | Workflows using a workflow-backed connector               |
| `public`      | Unauthenticated internet access                           |

For a webhook or callback, write `route_auth = "external_id"` without an `:id` suffix; 3B mints and persists the ID. Call the route with that value in the `external_id` query parameter. Never invent it. Use `public` only when explicitly requested. Draft routes configured as `public`, `external_id`, `sso`, or `tenant` are still floored to space-private access until published.

Every routed workflow needs at least one `route_type`. Give each typed route a `title`, type every externally callable API endpoint as `api`, and leave internal callbacks and helpers untyped.

An API route intended for callers should include `api.json`: a nonempty object keyed by lowercase HTTP method whose values are OpenAPI 3.1 Operation Objects. 3B derives the path and security, so omit `paths`, `servers`, and `security`. Inline schemas instead of using component references. An `api.json` file is rejected unless its step has a non-root route with `route_type = "api"`.

`space` and `tenant` routes accept a browser session, a 3B API key, or a 3B OAuth access token. `sso` authenticates external users through the tenant’s configured SAML or OIDC provider without creating a 3B account. Successful `space`, `tenant`, and `sso` authentication adds a spoof-proof `x-3b-authenticated-email` header. 3B strips its bearer token before invoking step code. A `connector` route is called only through a workflow-backed connector; the proxy supplies its authentication header.

When code embeds one of its workflow’s own route URLs, prefix the path with `/__3b/branch/${process.env._3B_BRANCH_ID}` on a draft. Use the plain path when `_3B_BRANCH_ID` is empty. Never persist a branch ID in source.

Cookies are pinned to the serving host. 3B strips `Domain`, changes `SameSite=None` to `SameSite=Lax`, signs `HttpOnly` values for the space, and forces `Secure` on HTTPS responses. Prefer `__Host-` cookie names with `Path=/`, `Secure`, and `HttpOnly`; omit `HttpOnly` only when browser JavaScript must read the cookie.

## Other runtime contracts

`email_address` is a lowercase local-part of letters, digits, and internal dashes, up to 64 characters; it must begin and end with a letter or digit and be unique in the deployment’s configured inbound-email scope. The full address is deployment-specific.

Each running step is limited to 1 vCPU, 2 GiB of memory with no swap, and 25,000,000 bytes per second of network ingress and egress independently, each with a 1 MiB burst. Stream or batch large data and split resource-intensive work across steps. An out-of-memory execution is killed; do not retry the same workload unchanged.

## Connectors

Use connectors whenever a step or build-time investigation needs authenticated access to another service. When the workflow depends on the service at runtime, write ordinary requests without `Authorization` headers, API keys, or credential placeholders, then attach the connector to that step through the current interface’s connector tooling. When the service is only a build aid, connect it to the chat or execution context if the interface supports that, and do not modify a step. Prefer an exact literal target URL, including the scheme, hostname, and representative path, when known; otherwise search by service name. Follow only the environment variables and usage notes returned by the connector’s AI context.

Never ask a user to paste a key, token, password, username, or other credential into chat. If a credential appears anyway, do not put it in files or commands; use a connector and tell the user to rotate the exposed credential. Disconnect with connector tooling rather than editing `config.toml`.

## Dockerfile

`FROM 3b/base` is the only supported base and must be the first instruction. Preserve the template’s existing lines. 3B supports `RUN <command>`, `COPY <sources...> .`, `CMD <command>`, `LABEL`, and `VOLUME`; unsupported Dockerfile instructions are ignored rather than providing normal Docker semantics. `RUN` supports line continuations and quoted heredocs. Labels other than the checkpoint opt-in below do not affect execution.

Cache mounts use `RUN --mount=type=cache,target=<name>`, where `<name>` is one work-directory-relative segment containing letters, digits, `.`, `_`, or `-`. Do not use an absolute cache path. Add npm dependencies to `package.json` so the template’s existing Bun install layer can cache them.

`LABEL io.3b.exec.checkpoint.v2=true` opts into application-defined checkpoint and restore. Do not add it by default. Use it only when the user asks to reuse expensive initialized memory: initialize repeatably, call `/opt/3b/next` to define the checkpoint boundary, parse its `{ execId, env }` JSON after restore, and read execution input and access volumes only after that boundary. Each restored sandbox is single-use, and anything that must be fresh belongs after `next`.

Volumes mount below `/storage`. Load `workflow-volume-design` before declaring one; it defines 3B’s lifetime, access, branch-isolation, and writer-concurrency semantics.
