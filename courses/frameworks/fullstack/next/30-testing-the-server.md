---
title: Testing the server
summary: Route handlers and server functions are plain modules, so a test can call them directly.
chapter: Quality
minutes: 14
status: draft
---

## A route handler is a function

```ts
import { NextRequest } from "next/server";
import { describe, expect, test, vi } from "vitest";

import { books } from "@/lib/books";

vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

const { GET, POST } = await import("@/app/api/books/route");
```

Two things make that test possible. A route handler is an exported function, so it can be imported and called with a
`NextRequest` the test builds. And the framework pieces it uses are mocked at the boundary, which for this route is
`next/cache`: `cacheLife` and `cacheTag` only mean something inside a Next.js server, so a test stands them in.

`NextRequest` is a real class from `next/server`, and it takes a URL:

```ts
test("filters by genre", async () => {
  const response = await GET(new NextRequest("http://localhost/api/books?genre=poetry"));
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.count).toBe(1);
  expect(body.books[0].title).toBe("The Poetic Edda");
});
```

No server is started, no port is bound, and the assertion is about the JSON rather than about HTML.

## Testing a server function

The interesting test of an action is not that it records a loan. It is that it refuses one when it should:

```ts
const cache = vi.hoisted(() => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
const desk = vi.hoisted(() => ({ open: false }));

vi.mock("next/cache", () => ({
  updateTag: cache.updateTag,
  revalidatePath: cache.revalidatePath,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (desk.open ? { name, value: "open" } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const { recordLoanAction } = await import("@/app/actions");
```

`next/headers` is mocked with a shape rather than a library, because the application only uses `get`, `set` and `delete`. The
`desk` object is the switch the tests flip.

```ts
test("refuses a loan while the desk is closed", async () => {
  desk.open = false;

  const state = await recordLoanAction({}, form({ bookId: "dune", member: "Ada Lovelace", days: "7" }));

  expect(state).toEqual({ error: "Open the desk before recording a loan." });
});

test("records a loan and invalidates the cached counts", async () => {
  desk.open = true;
  cache.updateTag.mockClear();
  const before = copiesOut("dune");

  const state = await recordLoanAction({}, form({ bookId: "dune", member: "Ada Lovelace", days: "7" }));

  expect(state.error).toBeUndefined();
  expect(state.notice).toMatch(/Lent Dune to Ada Lovelace/);
  expect(copiesOut("dune")).toBe(before + 1);
  expect(cache.updateTag).toHaveBeenCalledWith("catalogue");
  expect(cache.updateTag).toHaveBeenCalledWith("stats");
});
```

That second test covers the whole contract of the write: the rule, the mutation, and the invalidation. The last two assertions
are the ones that will fail the day somebody removes an `updateTag` in a refactor, which is a bug that is otherwise invisible
until a librarian reports a stale shelf.

Two details of the form helper:

```ts
function form(fields: Record<string, string>): FormData {
  const data = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }

  return data;
}
```

An action takes a `FormData`, and `FormData` is available in Node.js, so the test builds a real one rather than a plain
object. That matters when the action reads a field with `formData.get(...)`, because a plain object would throw.

## What a unit test cannot cover

The rule from the async components page applies to the server as well: a component or a function that the framework drives
has behaviour the test cannot produce. In this application two things are out of reach and are covered elsewhere:

| Not covered here | Covered by |
| --- | --- |
| async server components | end-to-end tests, because no test runner renders them |
| what a form action does after it resolves | end-to-end tests, because jsdom still submits the form |

The second one is worth spelling out, because it looks like a test bug and is not:

```text
React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit()
instead.
```

React 19 form actions in a jsdom environment still perform a DOM form submission, so the outcome is not the one the
application produces. The component test asserts what it can see, which is the optimistic entry and the call, and the
end-to-end test asserts what the server sends back.

Being explicit about the boundary is more useful than a test that passes for the wrong reason.

## What to mock

| Mock | Reason |
| --- | --- |
| `next/cache` | its functions only run inside a Next.js server |
| `next/headers` | the request does not exist in a unit test |
| `next/navigation` | the router context does not exist either |
| your own actions and modules | only when the test is about the caller |

The list stops at the framework. Mocking the data layer to test a page is a sign the page has too much logic in it: a page
that is a few lines of markup and a data call is testable end to end, and the logic underneath it is testable on its own.

## Check yourself

Write a test for the `refuses a book with nothing on the shelf` rule by lending out every copy of a book and then trying to
lend one more. Then write a test for the waiting list action that asserts the catalogue tag is invalidated, and say which of
the two you would keep if the suite had to be halved.
