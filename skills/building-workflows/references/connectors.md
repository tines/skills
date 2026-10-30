# Connectors

Use connectors whenever a step or build-time investigation needs authenticated access to another service. When the workflow depends on the service at runtime, write ordinary requests without `Authorization` headers, API keys, or credential placeholders, then attach the connector to that step through the current interface’s connector tooling. When the service is only a build aid, connect it to the chat or execution context if the interface supports that, and do not modify a step. Prefer an exact literal target URL, including the scheme, hostname, and representative path, when known; otherwise search by service name. Follow only the environment variables and usage notes returned by the connector’s AI context. To detach a connector from a step, use connector tooling rather than editing `config.toml`.

A connector in visitor mode uses the caller’s own account, and when the caller has none connected 3B answers the request with `403` and a `connector_not_connected` JSON body carrying a `connect_url`; surface that link to the caller instead of failing (the mcp-builder skill documents the body).

For SSO-only visitors, an app can disconnect the current visitor’s authorization with a same-origin POST to `/__3b/connectors/grant/disconnect?app=<connector-id>&route=<published-input-route>` using their browser session; `204` means disconnected (including already disconnected), and `401` means sign in again. Use the connector ID from connector tooling and the published input route that uses it, and explain before confirmation: “Disconnecting removes this account’s authorization for this connector across the apps in this space that use it.”

## Connect screens

3B doesn’t put a connect page in front of routes, except non-`webpage` routes on workflows created before 31 October 2026, which still send a visitor with a missing connector to 3B’s connector list before the step runs. Whenever the workflow uses a visitor-mode connector, add connect UI by default to every step its visitors open in a browser, driven by the `x-3b-connectors` request header. 3B sends it on a signed-in visitor’s top-level page load when it wants a screen from the step: on a `webpage` route only while one of the workflow’s visitor-mode connectors isn’t connected, so the app shows once all are; on other route types whenever the workflow uses one, because a visitor sent there by a tool’s `connect_url` has nowhere else to land. Decide from the entries, not the header’s presence: while a connector this visitor needs isn’t connected, draw the connect screen; otherwise serve your normal response, except on a route with nothing to show a browser (such as an MCP endpoint), where you confirm everything is connected and tell them to go back to their client. Return any screen drawn for 3B as HTML with the response header `x-3b-consent: rendered`, or 3B shows it as plain text on non-`webpage` routes. The header looks like this:

```json
[
  {
    "id": "JlJutfeL1elZ",
    "name": "Slack",
    "connected": false,
    "failed": false,
    "connectUrl": "https://…/__3b/connectors/grant/connect?app=…&route=…&return_url=…"
  }
]
```

It lists every visitor-mode connector the workflow uses: `id` is the connector ID, `failed` means the visitor’s last attempt to connect failed or their connection stopped working, and `connectUrl` is `null` once `connected` is `true`. A workflow can serve different people, such as a requester and an admin, so link only the connectors this page’s visitor needs: up front, when a feature first needs one, or not at all. Link each one to its `connectUrl` with a plain link (“Connect”, or “Retry” when `failed`). HTML-escape `name`, and treat `connectUrl` as opaque. The link goes to the provider and back to this page; connectors using 3B’s built-in OAuth credentials first show one 3B page with a Connect button, and the provider names 3B’s OAuth app, which a connector with the customer’s own OAuth client avoids. If the workflow uses a visitor’s account when they aren’t on the page, say so on the page.

If connecting fails, the visitor comes back to this page with that entry `failed`. A visitor who closes the popup of a connector using 3B’s built-in OAuth credentials stays on 3B’s page.

Parse the header as JSON. For React, read it from the request on stdin in `render.ts` and escape every `<` when embedding it in the page, because `name` is free text.

Fetches, form posts, and iframes never get the header, so the editor preview always shows the connected state. A step that ignores the header, or whose visitor revokes a grant after the page loads, gets the `403` `connector_not_connected` above from its connector call; handle it like any other error and surface its `connect_url`. Test the screen with `run_step`’s `mockRequest.headers`, or open the route in its own tab; draft routes work the same way. A refused call’s `connect_url` opens the route the run started from, or its draft route for a draft run, so that route’s step must draw the connect screen, and a route without a response step can’t show one.

If 3B still shows its own connect page in front of your page, your workspace hasn’t been switched over yet. Test your screen with `run_step`’s `mockRequest.headers` until it is.
