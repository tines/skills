# HTTP routes

The responding step needs `output = true` and must emit a complete HTTP response with `\r\n` line endings and a `\r\n\r\n` separator before the body. Without a reachable output step, 3B returns `202 Accepted` with no body.

| `route_auth`  | Access                                                    |
| ------------- | --------------------------------------------------------- |
| `space`       | Members of the workflow’s space; the default              |
| `tenant`      | Any authenticated tenant member                           |
| `sso`         | External users authenticated by the tenant’s SSO provider |
| `external_id` | Anyone holding the route’s unguessable ID                 |
| `connector`   | Workflows using a workflow-backed connector               |
| `public`      | Unauthenticated internet access                           |

For a webhook or callback, write `route_auth = "external_id"` without an `:id` suffix; 3B mints and persists the ID. Call the route with that value in the `external_id` query parameter. Never invent it. Use `public` only when explicitly requested. Draft routes configured as `public`, `external_id`, `sso`, `tenant`, or `connector` are still floored to space-private access until published. Draft previews require space access and do not enforce the SSO `route_sso_groups` restriction.

Every routed workflow needs at least one `route_type`. Give each typed route a `title`, type every externally callable API endpoint as `api`, and leave internal callbacks and helpers untyped.

An API route intended for callers should include `api.json`: a nonempty object keyed by lowercase HTTP method whose values are OpenAPI 3.1 Operation Objects. 3B derives the path and security, so omit `paths`, `servers`, and `security`. Inline schemas instead of using component references. An `api.json` file is rejected unless its step has a non-root route with `route_type = "api"`.

`space` and `tenant` routes accept a browser session, a 3B API key, or a 3B OAuth access token. `sso` authenticates external users through the tenant’s configured SAML or OIDC provider without creating a 3B account. When the tenant has more than one SSO provider, add `route_idp = "<provider ID>"` next to `route_auth = "sso"` to designate which provider gates the route; without it, the tenant’s primary provider is used. Only set `route_idp` to one of the tenant’s registered provider IDs — never invent one. Successful `space`, `tenant`, and `sso` authentication adds a spoof-proof `x-3b-authenticated-email` header. 3B strips its bearer token before invoking step code. A `connector` route is called only through a workflow-backed connector; the proxy supplies its authentication header. When a user triggered the calling workflow’s run (through a `space`, `tenant`, or `sso` route, or chat), the connector route also receives that user’s `x-3b-authenticated-email` and `x-3b-authenticated-groups` (current 3B groups for members, or the verified IdP group snapshot for external SSO callers); calls from schedules, webhooks, or service accounts carry neither. Every call from a running workflow, including scheduled and webhook runs, also receives spoof-proof `x-3b-calling-workflow-id`, `x-3b-calling-space-id`, and `x-3b-calling-branch` headers; the branch is `main` for the live version, otherwise the draft branch’s ID. The identity headers name the user who started the calling run, not whoever wrote the calling workflow’s code, so a route that authorizes on them should also check that the calling workflow is one it trusts and that the branch is `main`.

Step code can read verified group names from the spoof-proof `x-3b-authenticated-groups` header, a JSON array of strings. Parse it as JSON, never split on commas. It contains the IdP group snapshot for SSO callers and current 3B group names for members; it is absent when there are no verified groups. 3B strips caller-supplied values on every route before injecting verified names.

To restrict an `sso` route to certain IdP groups, add `route_sso_groups = ["Security Team"]`: 3B answers 403 before the step runs unless the caller belongs to at least one listed group, compared case-insensitively. The provider must emit the `groups` claim. Use values the user confirms are emitted — never invent them. `route_sso_groups` requires `route_auth = "sso"`; other auth modes are rejected during facet synchronization, including for drafts.

External group membership is a snapshot: browser SSO sessions retain it for two hours, and OAuth retains it through a fixed 30-day refresh chain, with up to 30 additional minutes for the final access token. Refreshing does not update groups, so IdP group removal does not promptly revoke access. Workflow runs and chained workflow connectors retain the snapshot captured at entry for the lifetime of those runs, including after the original sign-in expires. Missing groups, including claims dropped because their base64url JSON exceeds 2 KB, cannot satisfy `route_sso_groups`.

A route accepting OAuth clients must render its own consent screen: when a client signs in, 3B serves the route with unspoofable `x-3b-consent-*` headers (a signed challenge, a decision URL, display values, and the caller’s connector grants when the route uses visitor-mode connectors), and the step returns an HTML Allow/Deny page that posts the decision back (the mcp-builder skill documents the contract). No config key or extra route is needed; if the step ignores the headers, sign-in fails with an error.

When adding or changing a route, tell the user who can access it. Do not describe a route as public when draft access is still floored to space membership.

Cookies are pinned to the serving host. 3B strips `Domain`, changes `SameSite=None` to `SameSite=Lax`, signs `HttpOnly` values for the space, and forces `Secure` on HTTPS responses. Prefer `__Host-` cookie names with `Path=/`, `Secure`, and `HttpOnly`; omit `HttpOnly` only when browser JavaScript must read the cookie.

Keep APIs synchronous only for short, bounded work. For long or variable work, promptly return `202 Accepted` with a durable operation ID and status URL, then continue downstream. Because that HTTP response becomes downstream stdin, include the operation ID and required job payload in its body and parse the HTTP message in the next step. Persist pending, succeeded, and failed state in a named volume, and make retries idempotent. An empty automatic `202` is only for fire-and-forget work; use `201 Created` only when the requested resource has been created before responding.

Stream when incremental output is useful, but streaming and keepalives are not durable. When completion matters, persist progress and provide a status or resume path; client and proxy timeouts, network interruptions, and deployment draining may end the request before the step’s `timeout`.

## Route URLs

Construct URLs for the workflow’s own routes from `_3B_WORKFLOW_BASE_URL` at runtime. It contains the space’s edge origin plus the draft branch prefix, with no trailing slash; in Live it is just the origin. It is available without HTTP input, including in scheduled runs.

```ts
const callbackUrl = `${process.env._3B_WORKFLOW_BASE_URL}/my-app/callback`;
const callbackPath = new URL(callbackUrl).pathname;
```

Use absolute URLs for external callbacks and origin-relative paths for browser links, forms, redirects, and fetches that should stay on the serving host. Append the configured route directly: adding another branch prefix duplicates it, and `new URL("/my-app/callback", baseUrl)` discards it.

Read runtime variables in step code, not browser code or build scripts. For React, construct URLs in `render.ts` and serialize them into the page for the browser bundle. `window.__ROUTE_PATH__` includes the current page’s route; use it as the router basename, not as a base for sibling routes. The HTTP request on stdin has its draft prefix stripped.

Do not hardcode deployment hostnames or IDs into the workflow’s own URLs. External callback registrations and client configuration must use the destination route’s URL after import.
