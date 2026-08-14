---
name: workflow-operations
description: Add production operating behavior to a workflow. Use for schedules and event triggers, completion or failure notifications, targeted retries, operational logging, and follow-on automation.
license: Apache-2.0
compatibility: Tines 3B
---

# Workflow operations

Add operating behavior from the workflow’s real reliability requirements:

- Choose a schedule or event trigger that matches when the source data becomes ready.
- Notify only people who can act, and include the workflow, run, outcome, and next action.
- Retry transient operations with bounded attempts; surface permanent or exhausted failures.
- Log stable identifiers and decisions needed to trace a run without recording secrets or redundant payloads.
- Build follow-on automation as another composable workflow when it has an independent trigger, owner, or lifecycle.

Run the workflow with representative input after changing its operating behavior.
