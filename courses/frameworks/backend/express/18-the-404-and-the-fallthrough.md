---
title: The 404 and the fallthrough
summary: The middleware at the end of the chain, the HTML page it replaces, and the two not-founds nobody can tell apart.
chapter: Errors and responses
minutes: 12
status: draft
---

## What a request gets today

```bash
curl -s -i http://localhost:3000/nope
```

```text
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Error</title></head>
<body><pre>Cannot GET /nope</pre></body>
</html>
```

That is the framework's default, and it is a reasonable answer from a server with no opinion. For a JSON API it is two
problems at once: the content type is `text/html`, so a client that parses JSON throws on the parse rather than on the status,
and nothing in the body has a code to branch on.

## The middleware that catches the rest

```ts
import type { NextFunction, Request, Response } from "express";

/** Anything that reaches the end of the middleware stack matched no route. */
export function notFound(request: Request, _response: Response, next: NextFunction) {
  next(new NotFoundError(`No route matches ${request.method} ${request.path}.`));
}
```

```ts
app.use(notFound);
app.use(errorHandler(log));
```

```text
{"type":"https://library.example.com/problems/not-found","title":"Not Found","status":404,
"detail":"No route matches GET /nope.","code":"not_found","instance":"/nope"}
```

One shape, one content type, and the route that was asked for is in the message. The middleware does not answer the request
itself, it constructs the same error a handler would throw, which is why there is one place that formats a 404 rather than
two.

The placement is the whole trick. Registered after the routers, it runs only for requests that matched nothing. Registered
before them, it would answer 404 to every request, including the ones that would have matched.

## Two not-founds that look the same

```text
{"detail":"No route matches GET /books/nope."}                 the path has no route
{"detail":"That book is not in the catalogue."}                the route matched, the record does not
```

Both are 404s and both are correct. A client cannot tell them apart from the status, and usually should not have to: the
difference is a fact about the server's routing table, which is not something a client can act on.

Where the difference does matter, the code and the message carry it:

| Situation | `code` | What a client shows |
| --- | --- | --- |
| no such route | `not_found` | a broken link, and a way back |
| no such record | `not_found` | an empty state for a thing that used to exist |
| no such route for this method | `not_found` | the same, because the method is not what the client thinks |

That third row is worth knowing before it surprises you.

## A missed method is also a 404

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X PUT http://localhost:3000/books
```

```text
404
```

Not a 405. Express treats a request that matches no route as a 404 whatever the method, so a client sending `PUT` to a path
that only accepts `POST` gets the same answer as a client sending it to a path that does not exist.

A real 405 has to be produced deliberately, and it comes with an `Allow` header:

```ts
router.put("/", (_request, response) => {
  response.set("Allow", "GET, POST").status(405).json({
    type: "https://library.example.com/problems/method-not-allowed",
    title: "Method Not Allowed",
    status: 405,
    detail: "The catalogue accepts GET and POST.",
  });
});
```

That is a deliberate decision, and a small one: a 405 tells a client its request was understood and the verb was wrong, which
is useful during development and rarely used afterwards. Leaving it as a 404 is what most APIs do, and the honest reason is
that a 405 on every path means writing a route for every method you do not support.

## What the chain guarantees

```text
a request
  matches a route      -> the handler answers, or throws, or calls next(error)
  matches no route     -> notFound creates an error and passes it along
  an error was thrown  -> errorHandler formats it
```

Three ways in, one way out. The property worth protecting is that **every** response from the API has the same error shape,
including the ones nobody wrote: a body that failed to parse, a route that does not exist, and a bug in a handler all end up
in the same middleware.

The way that property is lost is a handler that answers an error itself:

```ts
if (!book) {
  response.status(404).json({ error: "not found" });   // a second shape
  return;
}
```

One line like that and the API has two error contracts, and the client author has to handle both.

## Requests that are not pages

```ts
app.use(notFound);
```

The last middleware runs for every unmatched request, including `OPTIONS` and `HEAD`. Where a client's preflight is being
answered by other middleware, as this application's CORS middleware does, the 404 for the other methods is unchanged. Where a
head request for a resource should carry the same headers as the GET, the handler has to answer it, because a HEAD that
matches no route is a 404 like anything else.

## Check yourself

Request a path that does not exist and a record that does not exist, and compare the two problem documents. Then send a `PUT`
to a path that only accepts `GET` and decide, with the response in front of you, whether a 405 is worth writing for your API.
Finally move `notFound` above the routers for one run and explain what breaks.
