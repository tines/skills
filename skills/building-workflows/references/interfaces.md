# 3B workflow interfaces

## Git checkout

In a cloned 3B-hosted space, each top-level directory is a workflow. The `main` branch is Live: pushing to `main` publishes the affected workflows. Create and push a non-`main` branch for draft changes. Preserve existing `workflow.toml` IDs; create a workflow by adding a directory without copying an ID.

In a Git-synced space, merging to `main` moves Live. A local edit or 3B draft commit does not.

Workflow files are plain text without executable-mode metadata. Git pushes containing binary files, executable files, symlinks, or submodules are rejected. Put uploaded or generated binary artifacts in workflow storage rather than committing them as workflow source. Use MCP, the CLI, or the in-product editor to run the changed workflow before pushing.

## 3B MCP server

The MCP server lets external agents create, inspect, edit, run, commit, and publish workflows; manage connectors; read 3B skills; and collaborate with the in-product agent. Use MCP discovery for the current tools, descriptions, and schemas.

Open Settings → MCP at `<tenant-origin>/settings/mcp` to find the tenant’s MCP URL and client configuration. Connect with OAuth for the full interface; API keys provide a restricted set of tools.

## 3B CLI

The CLI lets people and external coding agents inspect and run workflows, inspect executions, chat with the in-product agent, and manage connectors from macOS or Linux. It runs outside workflow steps; use Git or MCP for direct file edits, commits, and publication.

Install it, then authenticate with the tenant host:

```bash
curl --proto '=https' --tlsv1.2 -fsSL https://sh.3b.dev/cli/install.sh | sh
3b auth login --host <tenant-host>
```

Login opens the tenant’s 3B UI for approval by default; pass `--no-browser` to print the approval URL instead. Use `3b --help` and each command’s `--help` to discover the current interface.

## In-product editor

The in-product editor presents one workflow as a filesystem and supplies the templates and workflow tools directly. Copy a template to create a step, read a file in the same turn before changing it with `editFile` or `writeFile`, attach connectors through connector tools, run every changed step, and run any pinned tests reported by an edit. Use the publish tool only when the user explicitly asks to push the draft Live; the confirmation happens in the tool’s UI.
