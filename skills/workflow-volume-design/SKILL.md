---
name: workflow-volume-design
description: Design reliable 3B workflows that use named volumes or filesystem state. Use whenever a workflow stores or shares files, persists state across runs, uses an embedded database, handles uploads, receives concurrent requests, builds reporting data, or needs temporary per-run files.
license: Apache-2.0
compatibility: Tines 3B
---

# Design workflows with volumes

Use this skill before creating or changing steps that use named volumes or filesystem-backed state. Discover the workflow tools available in the current interface. For an existing workflow, inspect its step graph, source, volume declarations, schedules, recent runs, and volume usage before changing the design. Separate measurements from assumptions.

Users describe the behavior they need, not a storage primitive. Choose file layouts, database formats, volume names, and mount options yourself. Ask only product questions that change the design, such as whether data must survive later Live runs, how fresh an answer must be, or how long records must be retained. Explain the resulting behavior in product terms.

## Core model

A volume is a named POSIX directory mounted at `/storage/<name>`. In Live, every workflow in a space that declares the same name mounts the same committed files. Draft branches have isolated files. `scope=run` gives one workflow run its own volume, shared by steps in that run that declare the same name and scope. A `:ro` mount is read-only.

Writable mounts do not serialize executions. Two runs of the same step, different steps, or different Live workflows in the same space can write the same named volume at the same time. Run-scoped volumes are shared only by steps in one run, so separate runs do not write the same run-scoped volume.

A step writes into a private view while it runs. Other steps see the last committed version, never its partial writes. A failed step discards its changes. A successful step publishes each volume separately, so files that must be committed together belong in one volume. Concurrent writers to different paths can both publish. Writers changing the same path can conflict. This does not make simultaneous updates to one embedded database safe.

Follow the [secret-storage prohibition](../building-workflows/SKILL.md#volumes). Use stdin and stdout for small handoffs between adjacent steps. Use volumes when steps need filesystem paths, many related files, random access, or data that survives a step.

## Shape the request path

Design the common request around the answer its caller needs. When possible, one entry step validates the request, reads only that subject’s current view, writes any necessary update to a unique path, and responds. Mount only the volumes it uses. A direct response should not also start downstream steps that merely decide there is no work. Keep connector calls, large scans, aggregation, and database updates off a frequent request path when the product permits a short delay.

For concurrent requests, give each delivery, device, customer, or job a distinct record path. Use stable subject keys for direct lookups, unique IDs for new immutable records, and idempotency keys that survive retries. Do not append from many runs to one shared file or update one shared embedded database from request steps. A small read-only file per subject often suffices for point lookups. Use an embedded database when its queries or transactions justify it. Keep lookup work proportional to the subject being requested, not to all retained records.

```text
request → validate → read views/<subject-id>.json
                   → write pending/<bucket>/<unique-id>.json → respond

scheduled work → apply bounded pending batch → refresh affected views → clean up applied input
```

Only create downstream executions for work that must follow this request. A scheduled or otherwise low-concurrency step can update derived state separately when a brief delay is acceptable. Preserve the required authentication, response signing, freshness, and failure behavior. If the caller needs an immediate result that cannot be computed from current and pending state, keep the necessary work on its response path.

## Give shared state an owner

Default to independent files under a writable volume. Runs writing distinct paths can overlap without serializing the whole step. Use read-only mounts for steps that only read.

```Dockerfile
VOLUME ["incoming"]
VOLUME ["views:ro"]
```

If an embedded database, report, or index must be updated, give each mutable file group one scheduled or otherwise low-concurrency writer. This applies to SQLite, DuckDB, and similar file-backed databases. Request steps may query a published database in read-only mode, but should write independent pending records instead of changing it. Ensure writer runs cannot overlap on the same database files. A short timeout alone does not guarantee this when starts are late or retries occur. If one writer cannot keep up, partition by a stable key into independently owned files, or use a store built for concurrent updates. Avoid a volume-wide exclusive mount on frequent request steps. When the same files truly require serialized updates, limit any exclusive mount to a short writer step and complete connector, model, and other network work before it starts.

Keep a database and its sidecars together. If pending records, derived state, and affected views are in the same volume, one successful writer step can publish their changes together. If input and derived state are in different volumes, their publications are separate. Record an idempotency key with the durable derived update and confirm it in a later run before deleting the input. Recheck state when applying delayed work and preserve rejected work or its outcome when the product needs it.

## Bound background work and storage

Move aggregation, database updates, view refreshes, and cleanup out of frequent entry steps when a short delay is acceptable. Give each run a fixed record and time budget, and prevent overlapping runs that update the same files. When a tick only triggers a scan of durable pending records, skip obsolete ticks instead of replaying them after a queue delay. Apply the bound before reading, parsing, or sorting a growing directory. Use direct paths or bounded time- or key-based buckets so selecting the next batch stays cheap. A schedule must drain sustained input faster than records arrive. Otherwise, its queue and volume usage grow even when each run succeeds.

Remove or compact applied files according to the required retention period. Keep necessary outcomes and idempotency information, but avoid retaining full payloads twice without a product need. Estimate retained logical bytes from input size, arrival rate, derived files, database sidecars, and retention time. Each deployment sets a per-volume logical-byte limit and a volume-count limit. Inspect the actual limits and usage when they may affect the design. A private write can succeed and still fail at publication when the volume exceeds its limit. Do not silently drop required data to fit.

For source data, inspect metadata and filter before downloading when possible. Fetch only needed files, and use pagination, change feeds, ranges, streams, or batches for larger inputs. If the complete collection is required, plan ingestion, retention, and recovery from interruption rather than relying on one large download.

Check representative requests, duplicates, and sustained traffic. Inspect request latency, waiting executions, background run duration, oldest pending age, pending files and bytes, and volume usage. A successful scheduled run is not enough. Pending work must repeatedly drain under the expected arrival rate.

## Lifetime and draft storage

Use `VOLUME ["state"]` when files should survive and be visible to later Live runs. A read-only step declares `VOLUME ["state:ro"]`. Every workflow in the space that declares `state` shares its Live files.

Draft branches start with isolated files for the same name. Whether a draft starts empty or carries data forward is decided per draft; when the workflow context describes that decision as pending, follow its instructions before running any step that mounts the volume. Draft files are discarded when the draft is pushed live.

Use `VOLUME ["work:scope=run"]` for files needed only within one workflow run. A reader declares `VOLUME ["work:scope=run,ro"]`. Every step sharing that run-scoped volume must declare `scope=run`. `VOLUME ["work:ro"]` names a different, persistent volume. Scope changes lifetime, not whether writers overlap within a run.

## Other useful shapes

- Independent uploads, generated artifacts, and cache entries can use one directory per job or source key. Readers can use those paths directly when no cross-job query is needed.
- SQLite suits indexed mutable state with one writer per database file. DuckDB suits batch analysis over tabular data. Other embedded databases can also work when their read and write behavior fits the workflow. Keep each database and its working files under one writer, and use a remote source when it can answer the required query without a local copy.
- Separate volumes when ownership, lifetime, or retention differs. Do not split files that require one atomic publication across volumes. More volumes and mounts also add work to every step that uses them.
- Read-only APIs and dashboards should mount read-only views. If a shared summary is needed, a bounded writer can update it from completed records.

When explaining the finished workflow, describe what the caller sees and when background work becomes visible. Mention storage details only when they affect the product’s behavior or the user asks.
