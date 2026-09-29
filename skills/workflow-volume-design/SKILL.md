---
name: workflow-volume-design
description: Design reliable 3B workflows that use named volumes or filesystem state. Use this whenever a workflow stores files, shares files between steps, persists state across runs, uses SQLite or cache files, handles uploads or generated artifacts, receives many concurrent inputs, runs parallel workers, builds reporting data, or needs temporary per-run files, even if the user does not mention volumes, scope, concurrency, exclusive writers, or filesystems.
license: Apache-2.0
compatibility: Tines 3B
---

Use this skill before creating or changing steps that use named volumes or filesystem-backed state.

Users usually describe the product they want, not the storage primitive. Infer the volume shape and file format from the workflow’s data lifetime, write pattern, read pattern, and correctness needs. Choose the storage implementation yourself. Do not ask users to choose a database, file format, `scope`, `concurrency`, exclusive writers, branch state, or volume names. Ask product questions only when the answer changes the design.

Good questions are:

1. Should this data still be there for later Live runs, or only for this workflow run?
2. Can each delivery, job, customer, worker, or batch own its own folder, or does everyone need to update the same shared record?
3. Does any report, index, counter, or summary need to update immediately, or is a short delay acceptable?

Use user-facing names for steps, such as "Receive input", "Store files", "Generate artifacts", "Update reports", and "Read dashboard data". Explain persistence, concurrency, and conflict behavior in product terms. Translate independent product ownership into unique directories, and translate shared records into one writer path. Mention `scope`, `concurrency`, and exclusive writers only when the user is technical or the distinction changes behavior they asked about.

## Core model

A volume is a named POSIX directory mounted at `/storage/<name>`. A step can open, read, write, rename, delete, and list files there just like a local filesystem. The name selects the storage; options on the `VOLUME` declaration independently control lifetime, access, and writer scheduling.

Follow the [secret-storage prohibition and cleanup guidance](../building-workflows/SKILL.md#volumes) when choosing what to persist.

1. Lifetime: In Live, a volume belongs to the space and is selected by name. Every workflow in the space that declares the same name mounts the same committed files. Draft branches have isolated files for that name. `scope=run` gives one workflow run its own volume; every step in that run that declares the same name with `scope=run` mounts it.
2. Access: `:ro` mounts the volume read-only. A mount is writable when `:ro` is absent.
3. Writer scheduling: Writable mounts allow overlapping writers unless they declare `concurrency=exclusive`.

A step writes into a private view while it runs. Other steps see the last committed version, never half-written files. If the step’s code fails, its changes are discarded. After a successful step, each volume publishes separately. Keep files that must be saved together in one volume.

Use a volume when code needs filesystem behavior, many related files, random access, or a tool that expects paths. Use stdin and stdout for small handoffs between adjacent steps, such as a request body, JSON payload, or primary result.

## Capacity and data shape

The limit applies to the total logical bytes of files in one volume, not to each file. A step can write in its private view, but publishing growth beyond the limit fails when the step finishes. Estimate retained bytes from item size, expected item count, and retention period. Include source files, derived files, indexes, and database sidecars that remain at publication. Leave room for normal updates.

Use the current deployment’s per-volume limit supplied in the in-product agent context. The standard limits are 100,000,000 bytes on free multitenant, 1,000,000,000 bytes on paid multitenant, and 2,000,000,000 bytes on paid dedicated. These are decimal MB and GB, not MiB and GiB. Workflow steps do not receive the limit as an environment variable. In other authoring interfaces, establish the deployment limit if expected data could approach it.

Start with what the workflow needs to retain and how it will be read. When the source supports it, inspect metadata first, filter or query there, and fetch only the files needed for the result. Use pagination, change feeds, or range reads to retrieve data incrementally. Process a large input as a stream or batches when the result does not require a full local copy. If the full collection is required, plan incremental ingestion, retention, and recovery from interruption. Do not download everything into a volume and wait for a size failure. Do not silently discard, sample, or degrade required data to meet the quota; explain a real capacity mismatch and choose a design that preserves the requested behavior.

Volumes are POSIX filesystems, so steps can use the file formats and embedded databases their tools support. Choose a representation for the required reads, updates, and queries. These are examples, not prescribed choices:

- Plain files suit independent records and direct path access. Give each owner a stable directory and avoid a shared mutable index unless readers need one.
- SQLite suits mutable keyed records, transactions, indexes, and point lookups. Keep the database and its sidecars in one volume.
- DuckDB suits batch analysis and aggregations over tabular data. Use it when those queries justify a local analytical store, and account for its database and working files.

More volumes help when data has a clear, bounded ownership boundary or a stable shard key. Declare the required names, route writes and reads by the same key, and account for the space’s volume-count limit. Splitting one logical database or file group across volumes does not solve its consistency needs. Prefer a remote query or object source when the workflow only needs selected data and the source can serve it reliably.

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

Use `scope=run` for temporary downloads, extracted archives, intermediate files, temporary databases, and handoff between steps when future Live runs do not need the files. Parallel steps in the run can share it when they write distinct paths.

Every step that needs the same run-scoped store must declare `scope=run`. To read run-scoped `work`, declare `VOLUME ["work:scope=run,ro"]`; `VOLUME ["work:ro"]` reads the `work` volume that persists across runs.

Scope answers how long and where the data lives. It does not decide whether writers can overlap. `scope=run` is about lifetime, not automatically about “more concurrency”.

## Access

Use `:ro` for readers. Dashboards, report APIs, export steps, validators, and summarizers should use read-only mounts unless they actually publish files.

```Dockerfile
VOLUME ["state:ro"]
VOLUME ["work:scope=run,ro"]
```

Use writable mounts only in the smallest step that publishes changes.

## Writer semantics

Writable mounts use concurrent writer scheduling by default. Keep it when each run owns different files or directories, even if the runs execute the same step. Two spaces have different files for the same volume name.

```Dockerfile
VOLUME ["incoming_files"]
```

Concurrent writers can publish to the same volume. Changes to different paths survive. If they change the same files, one may fail when it tries to save. Give each delivery, customer, or job its own path when possible.

Most workflows should not need `concurrency=exclusive`. First give each job its own files so jobs can run together. Use it only when jobs really must update the same shared files, such as one database and its companion files. A shared index, journal, package cache, counter, or cursor can have the same need. Keep files that must stay consistent in one volume. Concurrent writers do not make updates to one database safe.

```Dockerfile
VOLUME ["state:concurrency=exclusive"]
```

The exclusive mount stays locked for the whole step, including downloads, network calls, and model work. Do that work before the small writer step when possible. If workers need unique assignments, reserve each assignment in a short exclusive step and let the workers continue concurrently. `scope=run` changes lifetime, not this scheduling decision.

## Common shapes

For independent work, give each delivery, job, customer, or worker its own directory in a writable volume. Runs can write those directories concurrently.

```Dockerfile
# Receiver or worker
VOLUME ["incoming"]

# Importer, report updater, or dashboard
VOLUME ["incoming:ro"]
```

The owner directory comes from the product domain. A delivery might own `/storage/incoming/<delivery-id>/`; a worker might own `/storage/artifacts/<worker-id>/`. Expensive workers can publish separate results concurrently. If readers can use those paths directly, no merge step is needed. Otherwise, a small updater can validate finished results and update a shared report or index. Apply the writer rule above if updater executions can change the same file group.

Link the receiver to the updater when reports must update immediately; schedule the updater when a short delay is acceptable. Keep expensive work outside an exclusive writer when one is needed. A dashboard or API that only reads the result uses `:ro`.

For a cache where missed or overwritten entries are acceptable, write entries as independent files under source-keyed or content-addressed paths.

```Dockerfile
VOLUME ["cache"]
```

If cache correctness matters, treat it like shared mutable state and apply the writer rule above.

## Anti-patterns

Avoid routing every delivery through one exclusive writer when independent directories and later aggregation meet the product need.

Avoid a dashboard or report API with a writable mount when it only reads. Use `:ro`.

Avoid overlapping writes to the same database or index path under default concurrent scheduling.

Avoid many writers appending to one file. Give each input, job, or worker its own directory and batch it later.

Avoid one volume called `state` for unrelated cursors, caches, uploaded files, and reports. Separate them when their ownership, lifetime, or update patterns differ so one writer does not block unrelated work.

Avoid asking “Should this be durable or run-scoped?” Ask what should happen to the data.

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

For steps that import independent directories into a database, report, or index, make the import idempotent. Track processed directory names in the derived state so rerunning after a failure does not double-count inputs.

When explaining the finished workflow, describe the product behavior. “The receiver accepts bursts quickly, and the reporting step batches new files into dashboard data.” Mention database or volume details only when the user asks or they affect the product’s behavior.
