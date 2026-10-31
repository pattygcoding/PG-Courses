---
title: What Express is
summary: A router and a middleware chain on top of Node's HTTP server, and what it deliberately leaves out.
chapter: Getting started
minutes: 13
status: draft
---

## One file of an Express server

```ts
import express from "express";

const app = express();

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(3000);
```

```bash
curl -s http://localhost:3000/health
```

```text
{"status":"ok"}
```

That is the whole framework on one screen. `express()` returns an application, a route pattern is registered against a
method, a handler receives a request and a response, and `listen` starts Node's HTTP server with that application attached.

Node's `http` module can do the same thing with more code, and it is worth knowing what Express adds to it:

| Need | Node alone | Express |
| --- | --- | --- |
| route matching | compare `request.url` yourself | patterns with parameters |
| methods | check `request.method` | `app.get`, `app.post`, and the rest |
| body parsing | collect chunks and parse them | `express.json()` |
| static files | serve from disk and guess content types | `express.static` |
| ordering | one callback | a chain of middleware |
| errors | catch everything yourself | one handler at the end |

None of those is magic. The framework earns its place by making the chain explicit, which is the thing to understand before
anything else in this course makes sense.

## What it does not include

Express has no opinion about your data, your validation, your authentication or your tests. Those are five decisions the
course makes for you, and the framework will not tell you if you make them badly:

| Decision | The choice this course makes |
| --- | --- |
| data | a repository class per table, with SQLite under it |
| validation | zod schemas at the route boundary |
| authentication | a signed bearer token, with the secret in the environment |
| errors | `AppError` subclasses, rendered as RFC 9457 problem documents |
| tests | vitest calling the application with supertest, no port bound |

Each of those is one defensible answer among several. Where there is a real trade, the lesson says so.

## Version 5, and why the version matters

```bash
npm view express version
npm view express dist-tags
```

```text
5.3.0
{ latest: '5.3.0', 'latest-4': '4.22.3' }
```

Express 5 is the default, and 4 is still patched on its own tag. If you have read an Express tutorial from before 2025,
four things in it will be wrong:

- **A rejected promise reaches the error handler.** In Express 4 an `async` handler that threw would hang the request,
  and every tutorial wrapped handlers to fix it.
- **The path syntax changed.** Express 5 uses `path-to-regexp` 8, where `get("*")` is an error and the wildcard is
  `get("/*splat")`.
- **`res.status(99)` is refused.** Response status codes are validated, where 4 accepted anything.
- **`req.body` starts as `undefined`.** In 4 it defaulted to `{}`, which hid a missing parser.

The rest of the course assumes 5, and the pages that cover each of those show the real error or the real response.

## What a server is before you add anything

An HTTP server reads a request from a socket, hands it to a handler, and writes a response back. Everything a client sees
comes from three parts of that response:

```text
status line    200 OK, or 404 Not Found
headers        content-type, cache-control, etag, your own
body           JSON, HTML, bytes, or nothing
```

A handler that sets those three correctly is an API. The course spends most of its time on the first and the second, because
the body is the easy part.

## Check yourself

Write a server with one route that answers JSON and one that answers with a 204 and no body, then call both with `curl -i`
and read the status line and headers of each. Then remove `listen` and see what happens when you import the file, which is
the trick the tests later in this course rely on.
