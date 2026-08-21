---
name: building-workflows
description: Build and modify Tines 3B workflows from a workflow or space Git checkout, the 3B MCP server, the 3B CLI, or the in-product editor. Use whenever an agent works with workflow.toml, step directories, config.toml, FROM 3b/base Dockerfiles, workflow routes, links, triggers, connectors, step tests, or needs to create, inspect, run, debug, commit, or publish a 3B workflow.
license: Apache-2.0
compatibility: Tines 3B
---

# Build 3B workflows

Read [references/workflow-format.md](references/workflow-format.md) before changing workflow files. Read [references/interfaces.md](references/interfaces.md) when choosing or using an editing interface. Read [references/testing.md](references/testing.md) before creating, updating, or running step tests.

3B workflows have a few nonstandard contracts:

- Each step is an isolated process. Links pipe an upstream step’s stdout to downstream stdin; zero-byte stdout suppresses downstream execution.
- A step reports failure only by exiting nonzero. Write workflow data to stdout and diagnostics to stderr.
- Create steps from 3B’s templates and preserve their `FROM 3b/base` Dockerfiles.
- Attach connectors with connector tooling; never edit `connectors` in `config.toml` by hand.
- Never put credentials or authorization headers in workflow code. A connector’s proxy injects authentication at runtime.
- Routes default to space-private. Use `route_auth = "public"` only when the user explicitly requests unauthenticated internet access.
- Run affected steps and existing tests with representative input before committing or publishing.
