// The agent's entry point. An agent is its four config files — system.md
// (instructions), tools/ (one tool per file), model.json (provider, model,
// effort, limits), config.toml (connectors, and a `route` to be caller-invoked)
// — plus buildInput below, which you own. The runtime/ directory is ordinary
// code too, for when those aren't enough.
import { runAgent } from "./runtime/loop";
import {
  authenticatedPrincipal,
  isHttpRequest,
  requestBodyOrRaw,
} from "./runtime/request";
import { parsePriorRun } from "./runtime/selfLoop";
import { startResponse } from "./runtime/response";
import { transcriptPath } from "./runtime/transcript";

// Shape this workflow's trigger into the agent's input. The template can't know
// what the trigger emits, so replace the body of this function when you build
// the workflow. `body` is the raw trigger payload: the upstream step's stdout,
// or a routed agent's request body (the HTTP framing and auth headers are
// already stripped). Return the message the agent acts on, an optional context
// handed to every tool's execute as `options.experimental_context`, and — for a
// chat route whose callers continue threads — the conversationId to resume
// (omit it to start a fresh thread).
function buildInput(body: string): {
  message: string;
  context?: unknown;
  conversationId?: string;
} {
  return { message: body };
}

// Everything below is the template's mechanics, not this workflow's shape.

// Reduce a caller-supplied conversation id to a safe filename; mint a UUID when
// there is none.
function safeConversationId(id: string | undefined): string {
  const cleaned = id ? id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) : "";
  return cleaned || crypto.randomUUID();
}

const raw = await Bun.stdin.text();
// A run arriving as an HTTP request came through this step's own route, so a
// caller is watching the stream; anything else — an upstream step's output or a
// self-loop continuation — is async, and the loop makes exactly one model
// request per run and writes a single structured result instead of the stream.
const interactive = isHttpRequest(raw);
// A self-looped step receives its own previous run's structured result. Unless
// it reports the task still running, exit before writing anything: an empty
// stdout triggers no downstream step, which ends the loop. The HTTP guard
// doubles as a security check: a routed caller must never be able to forge a
// prior run.
const priorRun = interactive ? null : parsePriorRun(raw);
if (priorRun && priorRun.status !== "running") {
  console.error(
    `self-loop ended: previous run ${priorRun.status}${priorRun.error ? ` (${priorRun.error})` : ""}`
  );
  process.exit(0);
}

const out = startResponse(interactive);
// A continuation run sends no new user message — the transcript already ends
// with the pending tool results, and the model resumes from there.
let message: string | null = null;
let context: unknown;
let conversationId: string;
if (priorRun) {
  conversationId = priorRun.conversationId;
} else {
  const input = buildInput(requestBodyOrRaw(raw));
  message = input.message;
  context = input.context;
  conversationId = safeConversationId(input.conversationId);
}
// Scope the transcript to the authenticated caller so each user's threads are
// isolated; an unauthenticated route or a headless run has no verified caller, so
// it shares one namespace keyed only by the (unguessable) conversation id. A
// continuation run inherits the owner from the run that started the thread.
const owner = priorRun
  ? (priorRun.owner ?? "shared")
  : (authenticatedPrincipal(raw) ?? "shared");
out.event({ type: "conversation", conversationId, owner });
await runAgent({
  message,
  context,
  transcriptFile: transcriptPath(owner, conversationId),
  out,
  interactive,
});
process.exit(0);
