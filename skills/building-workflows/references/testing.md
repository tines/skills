# Testing 3B workflow steps

Run every changed step with representative input before committing or publishing. Read-only steps may run immediately. Get the user’s approval before a normal test run that sends messages, creates or changes external records, charges money, or has another side effect. A route step’s test input is an HTTP request; use the interface’s mock-request support when available.

If a run fails, inspect that execution’s full logs, fix the cause, and rerun it. For downstream steps, use a real upstream output when possible. Use custom input only when the scenario needs data that the last upstream execution does not provide.

## Step tests

A step test stores one successful run’s input and expected output under `<Step>/tests/step-tests/`. Replays are hermetic, have no network egress, and compare output byte-for-byte except for trailing newlines. HTTP tests compare the complete response. Add tests only for deterministic behavior: do not capture output that depends on live data, the wall clock, or an unreplayable external effect.

When an edit reports existing step tests, run them after finishing the step. Run these tests without asking even if the normal step has side effects, because external requests are replayed and writable volumes are isolated. Never finish with a test failure unresolved.

Treat a failure according to its cause:

- If the edit introduced a bug, fix the code and rerun the tests.
- If intended behavior changed the expected output, show the user the expected-versus-actual result. Update the test to the new output only after the user confirms the new behavior.
- Remove a test only when the user explicitly asks to remove that specific test.

## Volume and request fixtures

For a volume test, provide only the initial files needed before the step runs. 3B captures the expected final stdout and writable volume state and verifies that read-only volumes remain unchanged. Use UTF-8 for text, `sqlite-dump` with SQL statements for SQLite, and base64 only for other binary files. SQLite is compared logically.

For another binary store whose bytes can vary despite equivalent content, add a deterministic POSIX `tests/serialize` script. It receives the volume name as its first argument and prints a stable, sorted text representation of `/storage/<volume>`.

Adding a step test records external requests and their responses for replay. If a request contains a timestamp, UUID, nonce, or another volatile field, add a deterministic POSIX `tests/serialize-request` script. It reads `{method, url, headers, body, bodyEncoding}` JSON from stdin, with `body` base64-encoded, and prints the stable key used to match that request during replay.
