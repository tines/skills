---
name: workflow-volume-design
description: Design reliable 3B workflows that use named volumes or filesystem state. Use this whenever a workflow stores files, shares files between steps, persists state across runs, uses SQLite or cache files, handles uploads or generated artifacts, receives many concurrent inputs, runs parallel workers, builds reporting data, or needs temporary per-run files, even if the user does not mention volumes, scope, concurrency, exclusive writers, or filesystems.
license: Apache-2.0
compatibility: Tines 3B
---

Use this skill before creating or changing steps that use named volumes or filesystem-backed state.

Users usually describe the product they want, not the storage primitive. Infer the volume shape from the workflow's data lifetime, write pattern, read pattern, and correctness needs. Do not ask nontechnical users to choose `scope`, `concurrency`, exclusive writers, branch state, or volume names. Ask product questions only when the answer changes the design.

Good questions are:

1. Should this data still be there for later Live runs, or only for this workflow run?
2. Can each delivery, job, customer, worker, or batch own its own folder, or does everyone need to update the same shared record?
3. Does any report, index, counter, or summary need to update immediately, or is a short delay acceptable?

Use user-facing names for steps, such as "Receive input", "Store files", "Generate artifacts", "Update reports", and "Read dashboard data". Explain persistence, concurrency, and conflict behavior in product terms. Translate independent product ownership into unique directories, and translate shared records into one writer path. Mention `scope`, `concurrency`, and exclusive writers only when the user is technical or the distinction changes behavior they asked about.

## Core model

A volume is a named POSIX directory mounted at `/storage/<name>`. A step can open, read, write, rename, delete, and list files there just like a local filesystem. The name selects the storage; options on the `VOLUME` declaration independently control lifetime, access, and writer scheduling.

1. Lifetime: In Live, a volume belongs to the space and is selected by name. Every workflow in the space that declares the same name mounts the same committed files. Draft branches have isolated files for that name. `scope=run` gives one workflow run its own volume; every step in that run that declares the same name with `scope=run` mounts it.
2. Access: `:ro` mounts the volume read-only. A mount is writable when `:ro` is absent.
3. Writer scheduling: Writable mounts allow overlapping writers unless they declare `concurrency=exclusive`.

A step writes into a private view while it runs. Other steps see the last committed version, never half-written files. When the step succeeds, its changed files publish. If it fails, it publishes nothing.

Map the product answer to the volume primitive.

1. Files that should be visible to later Live runs use `VOLUME ["<name>"]`. Files that only matter inside one workflow run add `scope=run`.
2. Steps that only inspect files use `:ro`. The smallest step that creates or updates files gets the writable mount.
3. Writers that own separate directories may run concurrently. Writers that update the same record, index, database path, or file group use one exclusive writer.

Workflow runs can overlap, so decide how they may write by looking at the files each run changes. Runs are independent when each one writes to its own file or directory, even when they all execute the same step.

An exclusive volume stays locked for the entire step, not just while the code writes a file. A model call, API request, or download inside that step makes every other writer wait for the slow work to finish. Unless the product requires each run to happen one at a time, complete the slow work concurrently and pass the finished result to a small step that only updates the shared files. When workers need unique assignments, use a small exclusive step to reserve an item for each worker, then let the workers continue concurrently.

Use volumes when code needs filesystem behavior, many related files, random access, downloaded artifacts, extracted archives, SQLite, or third-party tools that expect paths. Use stdin and stdout for small normal handoff between adjacent steps, such as request bodies, JSON payloads, generated text, and the primary result consumed by the next step.

## Lifetime

Use `VOLUME ["state"]` when files should survive and be visible to later Live workflow runs. In Live, the volume belongs to the space, and any workflow in that space mounts the same files by declaring `state`. Declaring the name is the complete sharing mechanism. Draft branches have isolated files for the same name, and draft volume data is discarded rather than promoted to Live.

```Dockerfile
VOLUME ["state"]
VOLUME ["state:ro"]
```

Volumes that persist across Live runs are good for uploads, durable reports, dashboards, cache entries, cursors, logs users need later, app state, and generated artifacts that future Live runs should reuse.

Use run scope when files are only useful inside one workflow run.

```Dockerfile
VOLUME ["work:scope=run"]
VOLUME ["work:scope=run,ro"]
```

Run scope is good for downloads, extracted archives, generated intermediate files, temporary SQLite databases, per-run working sets, and handoff between steps in one run.

Every step that needs the same run-scoped store must declare `scope=run`. To read run-scoped `work`, declare `VOLUME ["work:scope=run,ro"]`; `VOLUME ["work:ro"]` reads the `work` volume that persists across runs.

Scope answers how long and where the data lives. It does not decide whether writers can overlap. `scope=run` is about lifetime, not automatically about "more concurrency".

## Access

Use `:ro` for readers. Dashboards, report APIs, export steps, validators, and summarizers should use read-only mounts unless they actually publish files.

```Dockerfile
VOLUME ["state:ro"]
VOLUME ["work:scope=run,ro"]
```

Use writable mounts only in the smallest step that publishes changes.

## Writer semantics

Writable mounts use concurrent writer scheduling unless they declare `concurrency=exclusive`. Writer scheduling does not change which files a volume contains: two spaces have different files for the same volume name.

```Dockerfile
VOLUME ["incoming_files"]
```

Concurrent writers can publish to the same volume. If writers touch different paths, all paths survive. If writers touch the same path or logical file group, the release fails with a conflict instead of last-write-wins.

Allow concurrent writers when each writer owns a distinct path or directory. Pick the ownership boundary from the product domain, not from a generic template.

Use exclusive writes for logical read-modify-write state.

```Dockerfile
VOLUME ["state:concurrency=exclusive"]
```

Choose exclusive writes for counters, cursors, ledgers, sessions, single append files, package caches, lock files, journals, one database path that many runs update, one JSON file that many runs update, and any state where overlapping writers could touch the same file group.

Any multi-file state that must stay consistent should be treated as one logical file group. That includes databases with sidecars, package stores, journals, indexes, and similar state. Writers may run concurrently when each owns a directory. If multiple writers update the same group, use one exclusive writer with read-only readers.

Concurrent publication protects files, not application-level transactions. It does not make overlapping writes to one database safe.

Concurrency answers whether multiple writable executions can publish at the same time. It is separate from scope. Writers on a volume that persists across Live runs may run concurrently when they create disjoint paths, and a run-scoped volume can still need exclusive scheduling if parallel steps update the same file group.

## Common shapes

For independent work, give each item, job, customer, shard, or worker its own directory in a writable volume with concurrent writers.

```Dockerfile
# Receiver or worker
VOLUME ["incoming"]

# Importer, report updater, or dashboard
VOLUME ["incoming:ro"]
```

The owner directory comes from the product domain. A delivery might own `/storage/incoming/<delivery-id>/`. A worker might own `/storage/artifacts/<worker-id>/`. Files under that directory can be any format. If a later step builds a shared report, index, database, or summary from those directories, put that derived state behind one writer.

```Dockerfile
VOLUME ["incoming:ro"]
VOLUME ["reports:concurrency=exclusive"]
```

If derived state must update immediately, link the receiver to an updater step. If a short delay is fine, make the updater scheduled.

For one shared record, index, database path, counter, cursor, ledger, or summary, use one exclusive writer and read-only readers.

```Dockerfile
# Writer step
VOLUME ["state:concurrency=exclusive"]

# Report, dashboard, or API step
VOLUME ["state:ro"]
```

If unrelated shared records can update independently, split them into separate volume names so one writer does not serialize everything.

When independent work is expensive but its results update shared state, let the workers run concurrently and give each one its own result. A small writer step can then validate each finished result and add it to the shared state. If every result already has its own path, the workers can write their results directly to the volume instead.

For per-run scratch space, use run scope.

```Dockerfile
VOLUME ["work:scope=run"]
VOLUME ["work:scope=run,ro"]
```

Parallel steps inside the same run can share the same run-scoped volume as long as they write distinct paths.

```Dockerfile
VOLUME ["work:scope=run"]
```

Use `scope=run` for temporary downloads, extracted archives, or intermediate files that future Live runs do not need.

For a best-effort cache where missed or overwritten entries are acceptable, write entries as independent files.

```Dockerfile
VOLUME ["cache"]
```

Use content-addressed or source-keyed paths. If cache correctness matters, treat it like a shared record or index and use one writer.

## Anti-patterns

Avoid a high-concurrency route step that puts every delivery into one exclusive writer unless the product really needs immediate shared-state updates. Prefer owned directories on the hot path and compact later.

Avoid a dashboard or report API with a writable mount when it only reads. Use `:ro`.

Avoid `VOLUME ["db"]` for overlapping writers that update the same database or index path. Concurrent writer scheduling is not a transaction layer for application data structures.

Avoid many writers appending to one file. Give each input, job, or worker its own directory and batch it later.

Avoid one volume called `state` for unrelated cursors, caches, uploaded files, and reports. Split independent state so unrelated writers do not block each other.

Avoid asking "Should this be durable or run-scoped?" Ask what should happen to the data.

## Implementation notes

For TypeScript steps that write into an owned directory:

```typescript
import { mkdir } from "node:fs/promises";

const id = crypto.randomUUID();
const day = new Date().toISOString().slice(0, 10);
const ownerDir = `/storage/incoming_files/${day}/${id}`;
const path = `${ownerDir}/payload.json`;

await mkdir(ownerDir, { recursive: true });
await Bun.write(path, JSON.stringify(record) + "\n");
```

For steps that import independent directories into a database, report, or index, make the import idempotent. Track processed directory names in the derived state, or move processed directories to a `processed/` directory in the same exclusive updater step. If the updater crashes, rerunning should not double-count inputs.

When explaining the finished workflow, describe the product behavior. "The receiver accepts bursts quickly, and the reporting step batches new files into dashboard data." Do not lead with internal volume terminology unless the user needs it.
