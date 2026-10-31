---
title: Routing in depth
summary: Path patterns in path-to-regexp 8, routers, and the errors Express 5 throws while you register a route.
chapter: Getting started
minutes: 15
status: draft
---

## The patterns

| Pattern | Matches |
| --- | --- |
| `/books` | exactly that path |
| `/books/:id` | one segment, as `request.params.id` |
| `/books/:id/loans` | a parameter with more path after it |
| `/*splat` | anything, as `request.params.splat` |
| `/books{/:id}` | `/books` and `/books/dune` |
| `/files/:name.:ext` | two parameters from one segment |
| `/ab?cd` | `acd` and `abcd` |
| a regular expression | whatever it matches |

Express 5 uses `path-to-regexp` 8, and the two patterns everybody knew are now errors:

```ts
app.get("*", handler);
```

```text
Missing parameter name at index 1: *; visit https://git.new/pathToRegexpError for info
```

```ts
app.get("/books/:id?", handler);
```

```text
Unexpected ? at index 10: /books/:id?; visit https://git.new/pathToRegexpError for info
```

The wildcard needs a name, so `/*splat`, and an optional segment moved inside braces, so `/books{/:id}`. This is the change
that breaks the most Express 4 code, and it fails at startup rather than at the first request, which is the better place.

These all register without complaint:

```ts
app.get("/*splat", handler);
app.get("/books{/:id}", handler);
app.get(/^\/books\/(.*)$/, handler);
```

The named wildcard is not decoration. Its value arrives in `params.splat`, and `:id` in the same pattern arrives in
`params.id`, so a pattern can capture several things and name them all.

## A parameter may not be a string

```ts
router.get("/:id", (request, response) => {
  const value = request.params.id;   // string | string[] | undefined
});
```

The type is not `string`. A pattern can match a segment more than once, and the types say so, which means the compiler
insists a handler decide what it does with an array before it uses the value. The helper this project uses is four lines:

```ts
export function param(request: Request, name: string): string {
  const value = request.params[name];

  if (typeof value !== "string" || value.length === 0) {
    throw new NotFoundError(`No route parameter named ${name} was matched once.`);
  }

  return value;
}
```

It turns a type you have to think about into a string you can use, and it fails as a 404 rather than producing
`Number(undefined)`. The lessons on validation and types come back to it.

## Routers

A router is a mini application, and mounting one keeps route files from growing into one long list:

```ts
import { Router } from "express";

export function booksRouter(books: BookRepository) {
  const router = Router();

  router.get("/", (request, response) => {
    response.json({ data: books.list(/* ... */) });
  });

  router.get("/:id", (request, response) => {
    const book = books.find(param(request, "id"));

    if (!book) {
      throw new NotFoundError("That book is not in the catalogue.");
    }

    response.json({ data: book });
  });

  return router;
}
```

```ts
app.use("/books", booksRouter(new BookRepository(database)));
```

The paths inside the router are relative to where it is mounted, so `/books/:id` is declared as `/:id`. A handler inside
that router sees `request.path` as `"/dune"` and `request.originalUrl` as `"/books/dune"`, which is the difference the last
lesson flagged.

The router also takes the dependencies it needs, which is why the function takes the repository rather than importing a
global one. That is what makes the tests in the sixth chapter possible: build a router with a test database and the same
code runs.

## Chaining, and the methods

```ts
router
  .route("/:id")
  .get((request, response) => { /* read one */ })
  .patch(librarian, validate({ body: bookBody.partial() }), (request, response) => { /* update */ })
  .delete(librarian, (request, response) => { /* remove */ });
```

`router.route` registers several methods on one path and reads as a resource's surface. The named methods cover `get`,
`post`, `put`, `patch`, `delete`, `options`, `head` and `all`, and `app.all("/health", handler)` is how a health endpoint
answers anything.

## What an unmatched method does

```bash
curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:3000/books
```

```text
404
```

Not a 405. Express treats a request that matches no route as a 404 whatever the method, and a 405 has to be produced
deliberately. That is one reason the API in this course answers every error with the same problem document: a client cannot
tell a missed method from a missed path, so the body has to say which it was.

`OPTIONS` is the exception, and only because of what other middleware does. Registering no `OPTIONS` handler leaves
`app.options` to the framework, which answers with the methods a path allows.

## Check yourself

Write a patterns file that registers one route for each row of the table, then call each one and print `request.params` as
JSON. Then take an Express 4 tutorial's `app.get("*")` and change it to the version 5 spelling, and record the error you
get if you try the old one first.
