---
title: Testing routes
summary: Status, headers and body, and the refusals that matter more than the happy path.
chapter: Testing and quality
minutes: 13
status: draft
---

## What a route test asserts

```ts
test("returns the catalogue with a page of metadata", async () => {
  const response = await request(app.app).get("/books");

  expect(response.status).toBe(200);
  expect(response.body.meta).toEqual({ page: 1, perPage: 20, total: 4 });
  expect(response.body.data).toHaveLength(4);
});

test("creates one for a librarian and answers with a location", async () => {
  const token = await signIn(app.app);

  const response = await request(app.app)
    .post("/books")
    .set("authorization", `Bearer ${token}`)
    .send({ id: "a-new-book", title: "A New Book", author: "Someone", genre: "poetry", copies: 2, year: 2020 });

  expect(response.status).toBe(201);
  expect(response.headers.location).toBe("/books/a-new-book");
  expect(response.body.data).toMatchObject({ id: "a-new-book", available: 2 });
});
```

Three assertions per test at most, and each one is a promise the API makes: the status, a header a client acts on, and the
part of the body a client reads. `toMatchObject` rather than `toEqual` where the body carries fields the test does not care
about, which keeps the test from failing when a harmless field is added.

## The refusals

```ts
test("refuses an anonymous request", async () => { /* 401 with a problem document */ });
test("refuses a body that breaks the rules", async () => { /* 400 with the field errors */ });
test("refuses a loan for a book with nothing on the shelf", async () => { /* 409 */ });
test("refuses an unknown book with a 404, not a 409", async () => { /* 404 */ });
test("refuses to return the same loan twice", async () => { /* 409 */ });
```

Five refusals for one feature, and they are the tests that catch a regression. The happy path is usually covered by whatever
a developer tried by hand; the fourth borrow of a two-copy book is not, and the check that prevents it is one `if` somebody
can delete in a refactor.

The distinction between the fourth and fifth lines is the kind of thing only a test pins down. A missing book is a 404 and a
book with no copies is a 409, and both are "no" from the client's side. Written as a test, the difference survives.

## The error contract, in one file

```ts
test("an unknown route answers with a problem document", async () => {
  const response = await request(app.app).get("/nope");

  expect(response.status).toBe(404);
  expect(response.headers["content-type"]).toBe("application/problem+json; charset=utf-8");
  expect(response.body).toEqual({
    type: "https://library.example.com/problems/not-found",
    title: "Not Found",
    status: 404,
    detail: "No route matches GET /nope.",
    code: "not_found",
    instance: "/nope",
  });
});
```

`toEqual` with the whole document is right here, because the shape *is* the subject. Every field is asserted, so a change to
the type URL or a dropped field is a failing test rather than something a client discovers in production.

The same file covers the four statuses that come from middleware rather than a handler:

```ts
test("a body that is not JSON is a 400, not a 500", /* invalid_json */);
test("a body over the limit is a 413", /* payload_too_large */);
test("an unexpected failure is a 500 that says nothing", /* internal_error, and no leak */);
test("every response carries the request id it was given", /* x-request-id */);
```

## Testing a failure that needs setting up

```ts
test("an unexpected failure is a 500 that says nothing", async () => {
  // Closing the database is the cheapest way to make a handler throw.
  const broken = buildTestApp();
  await broken.close();

  const response = await request(broken.app).get("/books");

  expect(response.status).toBe(500);
  expect(response.body).toMatchObject({ code: "internal_error", detail: "Something went wrong." });
  expect(JSON.stringify(response.body)).not.toContain("SQLite");
});
```

A 500 is hard to test because nothing is supposed to produce one. Closing the database is a real failure, produced by the
application's own code, and it exercises the whole path from a thrown driver error to a client-safe document.

That last assertion is the one worth copying into any API. It is cheap, it is a string search over the response, and it fails
the day somebody adds `detail: error.message` to the error handler while debugging.

## What not to assert

```ts
// coupled to the implementation
expect(repository.find).toHaveBeenCalledWith("dune");
expect(database.prepare).toHaveBeenCalled();
```

A test that asserts which method ran locks in the current design and fails on a refactor that changed nothing a client sees.
The habit to build instead: assert the response, and where a helper is worth testing directly, test it as a unit.

The pairs that balance out are worth naming: routes get tested through HTTP, repositories get tested against a real database,
and the pure functions get tested with values. Every one of those is a test of behaviour, at the level where that behaviour is
visible.

## Check yourself

Write the five refusals for the waitlist endpoint, which has none yet: an unknown book, a name that is too short, a duplicate
name, a missing body, and a request with no token. Then delete the check inside the handler for one of them and watch which
test fails, which is the measure of whether the test is about behaviour or about the code.
