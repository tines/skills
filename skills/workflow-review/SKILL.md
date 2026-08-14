---
name: workflow-review
description: Explain, test, simplify, and improve an existing workflow. Use when reviewing behavior, finding edge cases or failure points, validating sample data, or improving reliability, clarity, and performance.
license: Apache-2.0
compatibility: Tines 3B
---

# Workflow review

Read the workflow files and recent execution evidence before proposing changes.

Review the workflow as one program:

1. Explain its trigger, data flow, side effects, and result.
2. Test representative success, empty, malformed, duplicate, and dependency-failure inputs.
3. Identify failures that can be handled locally and failures that must remain visible.
4. Remove redundant work and simplify boundaries before adding retries or branches.
5. Run affected steps and tests after changes.

Prioritize concrete issues supported by code or execution results. Preserve intentional behavior, and do not add logging, retries, or abstractions without a specific failure they address.
