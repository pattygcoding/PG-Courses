---
title: Testing the data layer
summary: A real database per file, statements that would be slow in production, and determinism in the time.
chapter: Testing and quality
minutes: 12
status: draft
---

## A real database, not a fake

```ts
const database = openDatabase(":memory:");
seed(database, { reset: true });
```

`node:sqlite` makes the honest version the cheap one. There is no fake repository and no mocked driver, so every test runs the
same SQL the application runs, including the constraints, the foreign keys, the partial index and the date arithmetic.

What that catches, and a fake cannot:

| Only a real database catches | Because |
| --- | --- |
| a column renamed in one place | the query fails at the statement |
| a `check` constraint the handler relies on | the insert is refused |
| a `null` where the code assumed a value | the row comes back wrong |
| a query that returns rows in another order | the test asserts the order |

The cost is real too: an in-memory database is a second implementation of SQLite's behaviour, and a query that works there
can fail on a file with WAL and concurrency. The suite is a fast check, not a substitute for a run against the real thing.

## Watch the time

```ts
test("is overdue once the due date has passed", () => {
  const full = { ...loan, id: "l", bookId: "dune", member: "Ada", returnedOn: null };

  expect(isOverdue(full, new Date("2026-10-14T00:00:00Z"))).toBe(false);
  expect(isOverdue(full, new Date("2026-10-16T00:00:00Z"))).toBe(true);
});
```

Every date-taking function in this project takes `today` as a parameter with a default of `new Date()`. That is what makes a
test about an overdue loan possible without waiting a fortnight or rewinding the clock, and it costs one parameter.

```ts
borrow(input: NewLoan, today = new Date()): OutstandingLoan {
```

The same pattern appears in `signToken` and `giveBack`. The rule: **a function that reads the clock takes the clock.** It is
the cheapest testability improvement in a codebase, and the alternative is a fake timer library that changes global state for
every test in the file.

## Testing a repository directly

```ts
describe("loans", () => {
  test("refuses a loan for a book with nothing on the shelf", () => {
    expect(() => loans.borrow({ bookId: "the-left-hand-of-darkness", member: "Ada", days: 7 })).toThrow(ConflictError);
  });
});
```

That is the repository without HTTP, which is the right level for a rule that has nothing to do with a status code. The route
test above it asserts the 409; this one asserts the rule. Where they overlap, the route test is the one that describes the
contract, and this one is the faster feedback while writing the rule.

A specified error rather than `toThrow(/No copies/)` is the version to prefer: the class is what the error handler branches
on, and a matching message is a string a well-meaning editor can reword.

## The shared-state trap

```ts
let app: TestApp;

beforeAll(async () => {
  app = buildTestApp();
  token = await signIn(app.app);
});

afterAll(() => {
  app.close();
});
```

One application per file, and tests inside a file that are independent of order. Two habits make that hold:

- **Assert a change, not a constant.** `expect(after.available).toBe(before.available - 1)` passes whether the file ran
  against a fresh seed or after another test lent a copy.
- **Use a value unique to the test** where a row is created. A waiting-list entry named with `Date.now()` cannot collide with
  one a previous run left behind, which is the failure that appears only on the second run of a suite.

The version to avoid is a suite that passes alone and fails as a whole, because the fix somebody reaches for is to make the
tests depend on their order, and that is the state that makes a suite impossible to trust.

## Seed data is a fixture, and fixtures rot

```ts
const SEED_BOOKS = [
  ["dune", "Dune", "Frank Herbert", "science-fiction", 3, 1965],
  ["a-brief-history-of-time", "A Brief History of Time", "Stephen Hawking", "non-fiction", 2, 1988],
  ["the-left-hand-of-darkness", "The Left Hand of Darkness", "Ursula K. Le Guin", "science-fiction", 1, 1969],
  ["the-poetic-edda", "The Poetic Edda", "Anonymous", "poetry", 4, 1270],
] as const;
```

Four books chosen so that the tests can name a case: one with three copies, one with two, one with a single copy that is
already out on loan, and one in a genre of its own. A fixture is worth designing like that, because the tests then read as
sentences about the library rather than about rows.

What makes fixtures rot is a test that depends on a value it did not choose, such as the total count in a list response. The
tests here assert `total: 4` in one place and use relative counts everywhere a test changes the data, which keeps a new seed
book from breaking a dozen assertions.

## Check yourself

Add a method that returns the books borrowed more than once, then write its test against `:memory:` and check that the
statement is the one the repository runs. Then make the seed a fixture of twenty books and count how many tests break, which
is the measure of how much the suite depends on the seed rather than on its own setup.
