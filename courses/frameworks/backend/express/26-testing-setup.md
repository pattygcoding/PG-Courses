---
title: Testing setup
summary: vitest, supertest, and an application built per test file on an in-memory database.
chapter: Testing and quality
minutes: 14
status: draft
---

## Two packages, one shape

```bash
npm install -D vitest supertest @types/supertest
```

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts"],
    fileParallelism: false,
  },
});
```

**vitest** runs the tests and understands TypeScript through the same transform development uses, so a spec can import a
`.ts` file with its `.js` specifier intact.

**supertest** takes an application and makes requests against it without a port:

```ts
const response = await request(app).get("/books");
```

That is the payoff of splitting `createApp` from `listen` in the first chapter. No port is bound, no process is started, and
the requests go through the whole middleware chain exactly as a real one would.

`fileParallelism: false` is a deliberate compromise. The rate limiter keeps its counters per client address in memory, and
two spec files running at once share an address, so tests that sign in repeatedly interfere with each other. Turning off file
parallelism costs a second and removes a class of flake that is miserable to debug.

## A helper that builds a whole app

```ts
export function buildTestApp(overrides: Record<string, string> = {}): TestApp {
  const config = loadConfig({
    NODE_ENV: "test",
    DATABASE_PATH: ":memory:",
    LOG_LEVEL: "fatal",
    AUTH_SECRET: "test-secret-that-is-long-enough",
    RATE_LIMIT_MAX: "1000",
    UPLOAD_DIR: mkdtempSync(join(tmpdir(), "library-uploads-")),
    ...overrides,
  });

  const database = openDatabase(config.DATABASE_PATH);
  seed(database, { reset: true });

  // A logger that says nothing, so a passing run is quiet and a failing one is
  // readable.
  const logger = pino({ level: "silent" });
  const app = createApp({ config, database, logger });

  return { app, config, close: () => database.close() };
}
```

Five things that function buys, and each one is a test that would otherwise be impossible or slow:

| Line | Why it matters |
| --- | --- |
| `DATABASE_PATH: ":memory:"` | a real database per file, gone when the process ends |
| `seed({ reset: true })` | every file starts from the same four books |
| `LOG_LEVEL: "fatal"` and a silent logger | the suite output is the test results |
| a temp `UPLOAD_DIR` | an upload test cannot fill the developer's folder |
| `overrides` | one test can raise a limit or break a secret without touching the others |

The overrides parameter is what makes the rate-limit test possible at all:

```ts
const app = buildTestApp({ RATE_LIMIT_MAX: "3" });
```

A limit of a thousand for every other test and three for the one that tests the limit, with no environment variable and no
conditional in the application.

## What a test file looks like

```ts
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { buildTestApp, signIn, type TestApp } from "./helpers.js";

let app: TestApp;
let token: string;

beforeAll(async () => {
  app = buildTestApp();
  token = await signIn(app.app);
});

afterAll(() => {
  app.close();
});

describe("POST /loans", () => {
  test("records a loan and takes the copy off the shelf", async () => {
    const before = await request(app.app).get("/books/dune");
    expect(before.body.data.available).toBe(3);

    const response = await request(app.app)
      .post("/loans")
      .set("authorization", `Bearer ${token}`)
      .send({ bookId: "dune", member: "Grace Hopper", days: 14 });

    expect(response.status).toBe(201);

    const after = await request(app.app).get("/books/dune");
    expect(after.body.data.available).toBe(2);
  });
});
```

One application per file, built in `beforeAll`, closed in `afterAll`. Every test in the file shares it, which is why the
tests inside a file are written to be independent of each other in order: the loan test asserts a change rather than a
constant, so it passes whether it runs first or last.

## The rules that keep a suite maintainable

```text
assert what the client sees     status, headers, body
not how it was produced         not which SQL ran, not which method was called
```

A test coupled to an implementation fails on a refactor that changed nothing a client can observe, and the fix is usually to
delete the test. The tests in this project check status codes, locations, content types and bodies, all of which are the API's
contract.

Two more habits worth taking from the files here:

- **A test per refusal.** The interesting behaviour of a loan endpoint is not that it records a loan, it is that it refuses
  the fourth one. Those are the tests that catch a regression, and they are the ones a happy-path suite leaves out.
- **The failure message is the specification.** `expect(response.status).toBe(409)` says nothing when it fails; the test
  names in this suite read as sentences about what the API promises, which is what a failing run needs to show.

## Check yourself

Add a `test/health.spec.ts` with one test for each health route, then change `fileParallelism` to `true` and run the suite
twice to see whether the sign-in tests still pass. Finally add an override to the helper that makes one test fail on purpose,
and confirm that no other file is affected.
