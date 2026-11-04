# Volumes

A step writes through a private view and publishes its changes only when it succeeds. `VOLUME ["state"]` allows overlapping writers: give concurrent runs distinct paths, because when two overlapping runs change the same file, the one that publishes second fails with a conflict. Keep frequent request steps to the files they need, give concurrent inputs unique paths, and move shared database updates and cleanup to bounded background work when the product allows it.

## Draft storage

- In Live, a volume belongs to the space and is selected by name, so workflows in the same space share a named volume. Draft branches have isolated files that are discarded with the draft.
- When live, or the branch a draft was forked from, already holds data for a volume the workflow uses, the workflow context says the draft’s stored data is not set up yet. Settle it with `seedBranchStorage` (start empty, copy live’s data, or copy the fork source’s data) before running any step that mounts the volume.
- A step that runs before storage is settled makes the orchestrator copy live’s data into the draft on a best-effort basis for the branch-scoped volumes it mounts, even when the draft was forked from another draft. The draft usually starts on a copy of live’s data, but it starts empty if the copy can’t finish in time, and volumes only the fork source holds start empty.
- Either way, that run settles the draft’s storage: the workflow context stops saying it is not set up, and a plain `seedBranchStorage` call fails. To choose again, call `seedBranchStorage` with `replaceExisting: true`, which clears everything the draft has stored and seeds it from the chosen source; this can be repeated as often as needed. The user can also reset the draft’s stored data from the storage browser, after which the draft is undecided again and should be settled before its next run.
- Never rely on the implicit copy. When a step depends on live’s data being present, settle storage with `seedBranchStorage` (copy live’s data) before running it, and settle it first too when the draft should start empty or use the fork source’s data.
- A run-scoped mount (`:scope=run`) does not copy live’s data and settles the draft on empty storage for that volume, so when a step needs live’s data, settle storage with `seedBranchStorage` before any run-scoped step that mounts that volume, too.
- When pushing live, the user can also seed live volumes that have no data yet from the draft.

## Secrets

Never store passwords, API keys, OAuth tokens, private keys, or reusable session credentials in volumes, even when the user requests it. File permissions and calling a file “session state” do not make it a secret store. When replacing existing secret storage, tell the user to rotate exposed credentials and account for existing volume files and retained execution inputs; changing the code does not remove those copies.
