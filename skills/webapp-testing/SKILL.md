---
name: webapp-testing
description: Interact with and test web applications using Playwright. Use to verify frontend behavior, drive UI flows, capture screenshots, and read browser logs from a code step — whenever a task involves checking what a web page actually does in a browser.
license: Apache-2.0
compatibility: Tines 3B
---

# Testing web apps with Playwright

To exercise a web application, write a Playwright script and run it from a code step. Install once with `pip install playwright` then `playwright install chromium` (or the npm equivalent), and always launch Chromium headless.

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")  # CRITICAL on dynamic apps: wait for JS to run
    # ... interact and assert ...
    browser.close()
```

Make sure the app under test is already running and reachable (start its dev server in an earlier step, or point at a deployed URL) before the script runs.

## Reconnaissance, then action

Don’t guess selectors on a dynamic app — discover them from the rendered page first:

1. **Inspect** the rendered DOM after `networkidle`: take a screenshot (`page.screenshot(path="/tmp/inspect.png", full_page=True)`), dump `page.content()`, or list candidates (`page.locator("button").all()`).
2. **Identify** the selectors you need from what actually rendered.
3. **Act** using those selectors.

For static HTML, you can read the file directly to find selectors and load it via a `file://` URL.

## Tips

- The single most common mistake is inspecting or acting **before** `page.wait_for_load_state("networkidle")` on a dynamic app. Wait first.
- Prefer robust selectors: `text=`, `role=`, stable CSS, or IDs over brittle nth-child chains.
- Add explicit waits (`page.wait_for_selector(...)`) rather than fixed sleeps.
- Capture console output to debug: `page.on("console", lambda msg: print(msg.type, msg.text))`.
- Always close the browser when done.

---

_Adapted by 3B from Anthropic’s “webapp-testing” skill (github.com/anthropics/skills), © Anthropic PBC, licensed under Apache-2.0. Modified for 3B’s code steps._
