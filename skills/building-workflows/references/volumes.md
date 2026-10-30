# Volumes

A step writes through a private view and publishes its changes only when it succeeds. `VOLUME ["state"]` allows overlapping writers: give concurrent runs distinct paths, because when two overlapping runs change the same file, the one that publishes second fails with a conflict. Keep frequent request steps to the files they need, give concurrent inputs unique paths, and move shared database updates and cleanup to bounded background work when the product allows it.

## Draft storage

In Live, a volume belongs to the space and is selected by name, so workflows in the same space share a named volume. Draft branches have isolated files that start empty and are discarded with the draft. When live, or the branch a draft was forked from, already holds data for a volume the workflow uses, the workflow context says the draft’s stored data is not set up yet. Settle it with `seedBranchStorage` (start empty, copy live’s data, or copy the fork source’s data) before running any step that mounts the volume; the first run on undecided storage settles the draft on empty storage. The user can also reset a draft’s stored data from the storage browser, and when pushing live can seed live volumes that have no data yet from the draft.

## Secrets

Never store passwords, API keys, OAuth tokens, private keys, or reusable session credentials in volumes, even when the user requests it. File permissions and calling a file “session state” do not make it a secret store. When replacing existing secret storage, tell the user to rotate exposed credentials and account for existing volume files and retained execution inputs; changing the code does not remove those copies.
