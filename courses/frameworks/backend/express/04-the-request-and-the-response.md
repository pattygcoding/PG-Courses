---
title: The request and the response
summary: What Express adds to the two objects Node hands a handler, and the headers you inherit for free.
chapter: Getting started
minutes: 13
status: draft
---

## What a response looks like before you touch it

```bash
curl -s -i http://localhost:3000/health
```

```text
HTTP/1.1 200 OK
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
ETag: W/"f-VaSQ4oDUiZblZNAEkkN+sX+q3Sg"
Content-Length: 15
```

Four headers from a handler that only called `response.json`. It set the content type, computed an ETag for the body, and
Express added its own fingerprint. `X-Powered-By` is a hint to an attacker about what to try, so the project turns it off:

```ts
app.disable("x-powered-by");
```

`helmet()` does the same thing along with a set of security headers, and that lesson comes later. The ETag is the
interesting one: it is a weak hash of the body, and a client that sends it back in `If-None-Match` gets a 304 with no body.

## The request

| On `request` | What it is |
| --- | --- |
| `request.method` | `"GET"`, `"POST"`, and so on |
| `request.path` | the path, without the query string |
| `request.originalUrl` | the path with the query, before any mounting |
| `request.params` | the values a route pattern matched |
| `request.query` | the parsed query string |
| `request.body` | the parsed body, once a parser has run |
| `request.get("user-agent")` | one header, case-insensitively |
| `request.headers` | the raw header object from Node |
| `request.ip` | the client address, as far as it can be trusted |

```ts
app.get("/books", (request, response) => {
  response.json({
    path: request.path,                 // "/books"
    url: request.originalUrl,           // "/books?genre=poetry"
    genre: request.query.genre,         // "poetry"
    agent: request.get("user-agent"),
  });
});
```

`request.path` against `request.originalUrl` is worth knowing before routers arrive. Inside a router mounted at `/api`, a
request to `/api/books` has `path` as `"/"` and `originalUrl` as `"/api/books"`, and the log line you want is the second.

## The response

| On `response` | What it does |
| --- | --- |
| `response.json(body)` | sends JSON and sets the content type |
| `response.send(body)` | sends a string, buffer, or object without the JSON content type decision |
| `response.status(code)` | sets the status, and validates it |
| `response.set(header, value)` | sets one header |
| `response.type(value)` | sets the content type, by shorthand or mime |
| `response.location(url)` | sets the location header, as in a 201 |
| `response.redirect(url)` | sends a 302 by default, or the status you give |
| `response.end()` | finishes with no body |
| `response.sendStatus(code)` | sends a status with a text body |

Two of them hide a decision worth making on purpose:

```ts
response.send("<p>hello</p>");            // text/html; charset=utf-8
response.json({ hello: "world" });        // application/json; charset=utf-8
```

`send` looks at what it was given and guesses a content type. A JSON API should use `json` for objects, so that the content
type is a choice rather than a consequence of the value's shape.

## The status is validated

```ts
response.status(99).end();
```

```text
Invalid status code: 99. Status code must be greater than 99 and less than 1000.
```

Express 5 throws here, where version 4 passed anything through to Node and produced a response with no valid status line.
The same check catches a string that looks like a number, which is the bug this prevents:

```ts
response.status(Number(request.query.code));   // NaN from a missing query value
```

## A created resource, in full

```ts
router.post("/", librarian, validate({ body: bookBody }), (request, response) => {
  const book = books.create(request.body);

  response.status(201).location(`/books/${book.id}`).json({ data: book });
});
```

```text
HTTP/1.1 201 Created
Location: /books/new-book
Content-Type: application/json; charset=utf-8
```

Three decisions in one line: the status says a resource was created, the location header says where it now lives, and the
body is the resource itself. A client can follow the header without parsing the body, which is what the standard intends.

Order matters in the chain: set the status before the body, because sending the body finishes the response. A
`response.status(201)` after `response.json` is an error or a silent no-op depending on the path, and neither is what you
meant.

## Check yourself

Add a route that echoes the request back: method, path, query string and one header. Then set a custom header on the
response, capture a 201 with a location header with `curl -i`, and confirm which of the four headers in this lesson you set
yourself and which the framework did.
