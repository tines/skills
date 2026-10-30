---
name: building-workflows
description: Build and modify Tines 3B workflows from a workflow or space Git checkout, the 3B MCP server, the 3B CLI, or the in-product editor. Use whenever an agent works with workflow.toml, step directories, config.toml, FROM 3b/base Dockerfiles, workflow routes, links, triggers, connectors, step tests, or needs to create, inspect, run, debug, commit, or publish a 3B workflow.
license: Apache-2.0
compatibility: Tines 3B
---

# Build 3B workflows

- Read [references/interfaces.md](references/interfaces.md) when choosing or using an editing interface.
- Read [references/testing.md](references/testing.md) before running a step or creating, updating, or running step tests.
- Read [references/routes.md](references/routes.md) before adding or changing a step with `route`: authentication modes, `api.json`, identity and consent headers, cookies, long-running requests, and route URLs.
- Read [references/connectors.md](references/connectors.md) before searching for, attaching, or calling a connector, or when a visitor-mode connector answers `403`.
- Read [references/tunnels.md](references/tunnels.md) when a step must reach a private network or on-premises service.
- Read [references/dockerfile.md](references/dockerfile.md) before changing a step’s Dockerfile, dependencies, build layers, or cache mounts, or when asked for checkpoint and restore.
- Read [references/volumes.md](references/volumes.md) before a step writes to a volume: concurrency, draft storage set-up, and publish semantics.

## Layout

```text
README.md
<Step name>/
  README.md
  config.toml
  Dockerfile
  ...
```

Within a workflow checkout, each top-level directory is a uniquely named step. Keep a `README.md` at the root and in every step describing purpose, trigger, and behavior; the UI already displays the workflow or step name, so do not repeat it as the opening heading.

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

Copy the closest template available through the current interface. Default to TypeScript for data processing when the user has not requested another language. In a Git checkout without interface-provided templates, copy the matching directory from [assets/templates](assets/templates) into the workflow and rename it for the step. A step may contain and import additional source files; the template entry point is the command the runtime invokes. A step builds from its own folder only, so it can’t import files from the workflow root or another step: copy a shared helper into each step that uses it. Add Python dependencies to `requirements.txt` and TypeScript or React dependencies to `package.json`; preserve the template’s install and cache layers instead of adding ad hoc installs to the Dockerfile.

For React, default to one step for one application. Do not place the UI downstream of a data step: render it immediately and fetch data from route steps. For multi-page applications, use `BrowserRouter` with `basename={window.__ROUTE_PATH__}` and relative route paths; the template computes the branch-aware base path. Use Tailwind’s built-in palette and spacing scale, and avoid adding browser dependencies without a concrete need. Render a descriptive `<title>` for every page.

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
- `output`: makes stdout the HTTP response, which must be a complete HTTP response with `\r\n` line endings and a `\r\n\r\n` separator before the body. Without a reachable output step, 3B returns `202 Accepted` with no body.
- `route`: assigns an HTTP path. Live routes must be unique among workflows that share an edge host. `/` is that host’s catch-all and should be used only for an explicitly requested homepage.
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

Triggers compose with links. A step with `route` can also be a downstream target or link to itself. An external invocation supplies a complete HTTP request on stdin, while a linked invocation supplies the upstream step’s raw stdout, so code reached both ways must handle both input shapes.

Zero-byte stdout suppresses downstream execution. A step reports failure only through a nonzero exit status. Do not catch an error, log it, and continue unless success is intentional. 3B retains at most 10 KiB of stderr as its diagnostic output; stdout is the workflow data channel.

A step with no trigger receives empty stdin. A route step receives a complete RFC 7230 HTTP request. An email step receives the raw RFC 822 message.

## Other runtime contracts

`email_address` is a lowercase local-part of letters, digits, and internal dashes, up to 64 characters; it must begin and end with a letter or digit and be unique in the deployment’s configured inbound-email scope. The full address is deployment-specific.

Each running step is limited to 1 vCPU, 2 GiB of memory with no swap, and 25,000,000 bytes per second of network ingress and egress independently, each with a 1 MiB burst. Stream or batch large data and split resource-intensive work across steps. An out-of-memory execution is killed; do not retry the same workload unchanged.

## Connectors

Use a connector whenever a step needs authenticated access to another service: write ordinary requests without `Authorization` headers, API keys, or credential placeholders, then attach the connector to the step through the current interface’s connector tooling, and detach it the same way. Never ask a user to paste a key, token, password, username, or other credential into chat. If a credential appears anyway, do not put it in files or commands; use a connector and tell the user to rotate the exposed credential. If a connector cannot support the required authentication, explain the limitation. Do not build credential-entry forms or routes as a workaround: workflow request bodies are retained as execution inputs.

## Volumes

Volumes are named POSIX directories mounted below `/storage`. Names contain 1–63 lowercase letters, digits, dashes, or underscores and begin with a letter or digit. Declare each mount with its own `VOLUME` instruction: a list such as `VOLUME ["notes", "drafts"]` is rejected.

- `VOLUME ["state:ro"]` mounts `state` read-only.
- `VOLUME ["state"]` allows overlapping writers; give concurrent runs distinct paths.
- `VOLUME ["scratch:scope=run"]` gives one workflow run isolated writable storage shared by steps in that run.

In Live, a volume belongs to the space and is selected by name, so workflows in the same space share a named volume. Draft branches have isolated files that start empty and are discarded with the draft. For any named volume or filesystem-backed state, use `workflow-volume-design` before choosing mounts or file layout.

Never store passwords, API keys, OAuth tokens, private keys, or reusable session credentials in volumes, even when the user requests it.
