---
title: End-to-end testing
summary: Playwright against a production build, and the two bugs the suite found that nothing else would.
chapter: Quality
minutes: 14
status: draft
---

## The config

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Three choices in there are worth defending.

`command: "npm run build && npm run start"` runs the suite against a production build rather than `next dev`. Development
builds are faster and they are not what ships: bundling, minification and the prerendering all differ, and a suite that only
ever sees the development server is testing a different application.

`baseURL` means the tests say `page.goto("/books")`, so the same suite runs against a staging URL by changing one line.

`trace: "on-first-retry"` records a trace of the failing run, which is a timeline with screenshots, console output and network
requests. It is the difference between "it failed in CI" and an answer.

## Selectors that survive a redesign

```ts
await page.getByLabel("Member name").fill("Ada Lovelace");
await page.getByRole("button", { name: "Record loan" }).click();
await expect(page.getByText(/Lent The Poetic Edda to Ada Lovelace/)).toBeVisible();
```

Role and label queries are the same ones the component tests use, and the same argument applies: a test that finds an element
the way a person does is a test that does not break when a class name changes. CSS selectors in an end-to-end suite are a
maintenance cost that compounds.

## A test that fails on the first run

The first version of the 404 test asserted the status code, and it failed:

```text
Error: expect(received).toBe(expected)
Expected: 404
Received: 200
```

The application was right and the test was wrong, and the reason is the model this course spent three pages on: the route's
shell is streamed before the id is known, so `notFound()` runs after the status line has gone out. The test now asserts what a
visitor actually gets:

```ts
const response = await page.goto("/books/no-such-book");

expect(response?.status()).toBe(200);
await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
await expect(page.getByRole("banner")).toBeVisible();
```

The last assertion is not filler. It proves the not-found page rendered inside the layout, which is the difference between a
missing page and a broken one.

## A suite that was not hermetic

The next failure was subtler:

```text
Expected: "1 waiting"
Received: "2 waiting"
```

The waiting list test passed on the first run and failed on the second, because the application keeps its data in memory and
the server was already running from the previous run. That is a hermeticity bug, and it is the standard one: a suite that
depends on the state of the system it tests fails in the order nobody expects.

Two repairs, both applied here:

```ts
const name = `Grace Hopper ${Date.now()}`;
```

A unique value per run means the assertion cannot collide with a previous run's data.

```ts
const shelf = page.getByText(/\d+ of \d+ copies on the shelf\./);
const before = Number((await shelf.textContent())?.match(/(\d+) of/)?.[1]);
// ...
await expect(shelf).toHaveText(`${before - 1} of 4 copies on the shelf.`);
```

Reading the current value and asserting the change is more work than asserting a constant, and it is the version that tests
the behaviour rather than the fixture. It also makes the invalidation assertion stronger: the count changed in the same
response, and the test says so.

The real fix for a suite like this one is a database the test can reset, and a small application with an in-memory store
cannot have one. Being explicit about that in the test file is better than a test that fails every second run:

```ts
// The desk is a cookie, so a second run may find it already open.
const open = page.getByRole("button", { name: "Open the desk" });

if (await open.isVisible()) {
  await open.click();
}
```

## What it covers that nothing else does

```text
✓ a librarian opens the desk, records a loan and watches the count drop
✓ the catalogue filters through the URL
✓ a name joins the waiting list and survives a reload
✓ an unknown book shows the not-found page with the layout around it
✓ the proxy redirects the old catalogue URL
✓ the desk page renders its error boundary
```

Four of those six cannot be written as unit tests. The loan flow spans a cookie, an action, a cache tag and a re-render. The
waiting list test reloads the page, which is the only way to prove the server kept the entry. The proxy runs before any
React. And the error boundary needs an error from a real server render.

The reload assertion is the one worth copying:

```ts
await expect(page.getByText(name)).toBeVisible();
await page.reload();
await expect(page.getByText(name)).toBeVisible();
```

An optimistic entry looks identical to a saved one on the first assertion. The reload is what tells them apart.

## Check yourself

Add an end-to-end test for the desk page that opens the desk with `curl` in the test's `request` fixture and then loads
`/loans` in the browser. Then write the same test with the browser only, and say which of the two you would keep in a suite
that runs on every pull request.
