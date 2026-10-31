---
title: Unit testing
summary: Vitest, React Testing Library, and three setup failures you will meet in that order.
chapter: Quality
minutes: 15
status: draft
---

## The install, and a conflict on the way

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom \
  @testing-library/user-event @testing-library/jest-dom vite-tsconfig-paths
```

That is the set the docs recommend for a TypeScript project. On a fresh Next.js 16 application it fails:

```text
npm error code ERESOLVE
npm error While resolving: vitest@5.0.5
npm error Found: @types/node@20.19.43
npm error Could not resolve dependency:
npm error peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.5
```

The scaffold pins `@types/node` to `^20`, because Next.js 16 supports Node.js from 20.9 upwards. Vitest 5 needs the types for
22 or 24. The application runs on Node 24, so the correct fix is to move the types to match the runtime:

```bash
npm install -D @types/node@^24 vitest ...
```

The alternative, pinning an older Vitest, is the one that starts a slow argument with yourself. When the runtime and the types
disagree, the types are the ones to change.

## The config

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "server-only": new URL("./test/stubs/server-only.ts", import.meta.url).pathname,
    },
  },
});
```

Four decisions in that file, and each one is there because of a failure:

| Line | Why |
| --- | --- |
| `environment: "jsdom"` | component tests need a DOM |
| `include` | the suite is `*.test.ts` next to what it tests |
| `exclude` | `e2e/**` belongs to Playwright, and `.next` is build output |
| the `server-only` alias | the marker throws outside a server component build |

The last one is the interesting failure. `lib/loans.ts` starts with `import "server-only"`, which is the guard rail that stops
the data layer reaching a client component. A test runner is not a server component build, so importing the file throws
`Error: Failed to resolve import "server-only"` and the suite does not even start. Next.js provides the marker itself, so the
test config points it at a stub:

```ts
/**
 * The `server-only` marker is provided by the Next.js compiler and cannot be
 * resolved by a test runner, so it is stubbed.
 */
export {};
```

## The setup file, and the failure it fixes

```ts
import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
```

Without the `cleanup` line the second test in a file fails with a message that does not mention cleanup at all:

```text
TestingLibraryElementError: Found multiple elements with the role "button" and name "Join the waiting list"
```

React Testing Library removes the previous test's DOM only when it can see a global `afterEach`, and Vitest does not provide

## Testing the pure parts

```ts
describe("searchBooks", () => {
  test("matches a title regardless of case", () => {
    expect(searchBooks(books, { q: "DUNE" }).map((book) => book.id)).toEqual(["dune"]);
  });

  test("applies both filters together", () => {
    expect(searchBooks(books, { q: "herbert", genre: "poetry" })).toEqual([]);
  });

  test("keeps the type it was given", () => {
    const entries = books.map((book) => ({ ...book, available: 1, waiting: 0 }));
    const found = searchBooks(entries, { genre: "poetry" });

    expect(found[0]?.available).toBe(1);
  });
});
```

Three tests in one describe block, and the third is the one that came from a bug: `searchBooks` was typed to take a `Book[]`
and return a `Book[]`, so passing a catalogue entry with a copy count widened it back to `Book` and the page stopped
compiling. Making the function generic over its input type fixed the build, and this test is what stops the regression.

Testing the pure parts first is not a compromise. A filter, a date calculation and a validation rule are where the logic is,
and they are the cheapest tests an application has.

## Testing a component

```tsx
const { joinWaitingListAction } = vi.hoisted(() => ({ joinWaitingListAction: vi.fn() }));

vi.mock("@/app/actions", () => ({ joinWaitingListAction }));

const { WaitingList } = await import("@/components/WaitingList");
```

`vi.mock` is hoisted above the imports, so anything the mock factory needs has to be created in `vi.hoisted`, which runs
before it. Getting that wrong gives `Cannot access 'joinWaitingListAction' before initialization`, and the message points at
a line that looks fine.

The assertions use roles and labels rather than class names:

```ts
await user.type(screen.getByLabelText("Your name"), "Grace Hopper");
await user.click(screen.getByRole("button", { name: "Join the waiting list" }));

expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
```

A query by label is also an accessibility check: if `getByLabelText` cannot find the input, neither can a screen reader.

## Running them

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vitest run` is the one for a deploy, because it exits. Bare `vitest` watches, which is what you want in a terminal while
writing. The framework's own docs use `vitest` for the `test` script, and a CI job that never exits is the reason to keep them
apart.

```text
Test Files  6 passed (6)
     Tests  34 passed (34)
```

## Check yourself

Add a test for `first()`, the helper that reads a search parameter, covering a string, an array and `undefined`. Then delete
the `afterEach(cleanup)` line, run the suite twice, and write down the error, which is the one this page started with.

one unless `globals` is switched on. Adding the line is clearer than switching on globals for a reason nobody will remember
in six months.
