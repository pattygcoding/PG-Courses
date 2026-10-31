---
title: A first route
summary: An application, a port, and the one line that makes a server testable.
chapter: Getting started
minutes: 12
status: draft
---

## The application

```ts
import express from "express";

export function createApp() {
  const app = express();

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  return app;
}
```

`express()` builds an application object. `app.get(path, handler)` registers a handler for that method and that pattern.
Nothing is listening yet, and that is the point of the function: the application is a value, and a value can be handed to
something else.

## The process

```ts
import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3000);

const server = app.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
```

```bash
npm run dev
curl -s http://localhost:3000/health
```

```text
{"status":"ok"}
```

`app.listen` creates a Node HTTP server, attaches the application to it, and returns the server. That return value matters
later: it is what graceful shutdown closes, and it is where the keep-alive timeouts live.

The callback runs once the socket is bound. It is the only place a program can say "the port is open" honestly, which is why
a log line there is worth more than one before `listen`.

## What a handler is given

```ts
app.get("/books/:id", (request, response) => {
  const id = request.params.id;

  response.json({ id });
});
```

Two arguments and one more that is usually ignored. The third is `next`, which passes control to the following middleware,
and the next lesson is about it.

The convention that keeps request handlers readable is to name the arguments in full. `(req, res)` is what most tutorials
use and `(request, response)` is what a longer handler needs, because `res` and `req` differ by one letter and the bug that
produces is a confusing one.

## Why not one file

The smallest possible server puts the application and the port in the same file:

```ts
import express from "express";

const app = express();

app.get("/health", (_request, response) => response.json({ status: "ok" }));

app.listen(3000);
```

It works, and it cannot be tested without binding a port. `supertest` takes an application, not a URL, so a file that
listens on import has to be started as a subprocess or tested over HTTP. Splitting the two costs one file and saves the
whole test suite.

The rule that follows: **`app.ts` exports a function that returns an application, and `server.ts` is the only file that
listens.**

## Routes are matched in order

```ts
app.get("/books/latest", (_request, response) => response.json({ data: "the newest book" }));
app.get("/books/:id", (request, response) => response.json({ id: request.params.id }));
```

```text
GET /books/latest  ->  {"data":"the newest book"}
GET /books/dune    ->  {"id":"dune"}
```

The literal route has to come first. Registered the other way round, `/books/latest` matches `:id` with the value
`"latest"` and the specific handler never runs. Express tries patterns in the order they were added, and the first match
wins, which is also how middleware order becomes a design decision rather than a detail.

## A handler that finishes

A handler ends when it sends a response or calls `next`. A handler that does neither leaves the request open until the
client gives up, which is the failure mode to recognise quickly:

```text
curl: (28) Operation timed out after 10001 milliseconds with 0 bytes received
```

Three ways to end a request, and they are not interchangeable:

```ts
response.json({ status: "ok" });          // a JSON body and the right content type
response.status(204).end();               // no body at all
response.sendFile("/path/to/file");       // bytes from disk
```

## Check yourself

Add a route that answers with the book id from the path and one that answers 204 with no body. Run both with `curl -i` and
compare the headers. Then move the `listen` call into `app.ts` and check what `import` of that file does in a script, which
is the failure the next chapters avoid.
