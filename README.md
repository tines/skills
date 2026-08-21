# Tines Agent Skills

A collection of [Agent Skills](https://agentskills.io/) for working with Tines products.

[![skills.sh](https://skills.sh/b/tines/skills)](https://skills.sh/tines/skills)

## Install

Install the collection with the skills CLI:

```bash
npx skills add tines/skills
```

Install one skill by name:

```bash
npx skills add tines/skills --skill workflow-discovery
```

## Available skills

Skills can target different Tines products. Check each skill’s `compatibility` frontmatter before loading it; all skills currently in this repository target Tines 3B.

### Build workflows

| Skill                                                      | Purpose                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`building-workflows`](skills/building-workflows/)         | Build and modify complete 3B workflows through Git, MCP, the CLI, or the in-product editor.   |
| [`building-agents`](skills/building-agents/)               | Build model calls, tool-using agents, conversations, and chat UIs into 3B workflows.          |
| [`mcp-builder`](skills/mcp-builder/)                       | Build MCP servers, including servers deployed as authenticated 3B workflow routes.            |
| [`mcp-client`](skills/mcp-client/)                         | Call remote MCP servers over streamable HTTP from a 3B workflow.                              |
| [`workflow-discovery`](skills/workflow-discovery/)         | Turn an automation idea into a clear workflow brief and practical design.                     |
| [`workflow-volume-design`](skills/workflow-volume-design/) | Design reliable filesystem state, named volumes, SQLite stores, and concurrent file handling. |

### Operate and improve workflows

| Skill                                                | Purpose                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [`workflow-operations`](skills/workflow-operations/) | Add schedules, triggers, notifications, retries, logging, and follow-on automation. |
| [`workflow-review`](skills/workflow-review/)         | Explain, test, simplify, and improve an existing workflow.                          |
| [`webapp-testing`](skills/webapp-testing/)           | Test web applications with Playwright from a code step.                             |

### Design interfaces

| Skill                                          | Purpose                                                   |
| ---------------------------------------------- | --------------------------------------------------------- |
| [`dashboard-design`](skills/dashboard-design/) | Build polished, interactive analytics dashboards.         |
| [`frontend-design`](skills/frontend-design/)   | Create distinctive, production-grade frontend interfaces. |

### Research and communication

| Skill                                                | Purpose                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`cross-tool-research`](skills/cross-tool-research/) | Find and correlate information across connectors.                                |
| [`daily-briefing`](skills/daily-briefing/)           | Build concise briefings from calendars, tasks, tickets, messages, and documents. |
| [`internal-comms`](skills/internal-comms/)           | Write clear internal updates, reports, FAQs, and newsletters.                    |
| [`status-update`](skills/status-update/)             | Draft evidence-based status updates from recent work.                            |

### Tines and agent development

| Skill                                              | Purpose                                                    |
| -------------------------------------------------- | ---------------------------------------------------------- |
| [`claude-api`](skills/claude-api/)                 | Build, debug, and optimize code that calls the Claude API. |
| [`skill-creator`](skills/skill-creator/)           | Write and improve 3B Agent Skills.                         |
| [`tines-cases`](skills/tines-cases/)               | Work with Tines Cases and Records from 3B.                 |
| [`tines-export-to-3b`](skills/tines-export-to-3b/) | Rebuild a Tines story export as a 3B workflow.             |

## Structure

Each directory under `skills/` is a self-contained skill with a required `SKILL.md` and any agent-readable scripts, references, or assets it needs. Optional product-specific client metadata lives under `agents/`, such as OpenAI interface metadata in `agents/openai.yaml`; clients that do not support it can ignore it.

## License

Apache-2.0. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
