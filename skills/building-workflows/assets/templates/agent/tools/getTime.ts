import { tool } from "ai";
import { z } from "zod";

// The canonical tool shape: a one-line description, a typed input schema, and an
// execute that returns structured JSON (not prose). The second argument carries
// `experimental_context` — whatever `buildInput` in agent.ts put on `context` —
// so a tool can read the previous step's output. Copy this file per tool; the
// loop discovers every file under tools/ by name.
export default tool({
  description: "Get the current date and time as an ISO 8601 string (UTC).",
  inputSchema: z.object({}),
  execute: async () => ({ now: new Date().toISOString() }),
});
