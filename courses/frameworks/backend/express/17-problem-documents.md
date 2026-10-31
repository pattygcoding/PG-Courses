---
title: Problem documents
summary: One response shape for every error, borrowed from a standard, and the fields that earn their place.
chapter: Errors and responses
minutes: 12
status: draft
---

## A shape decided once

```text
{"type":"https://library.example.com/problems/not-found","title":"Not Found","status":404,
"detail":"That book is not in the catalogue.","code":"not_found","instance":"/books/nope"}
```

That is RFC 9457, the problem details standard, with one addition. A client that has seen one error from this API has seen
them all:

| Field | Meaning |
| --- | --- |
| `type` | a URL that identifies the kind of problem |
| `title` | a short human-readable summary, the same for every instance |
| `status` | the HTTP status, repeated in the body for a client that logs only the body |
| `detail` | what happened this time, for a person |
| `instance` | the path this happened at |
| `code` | a machine-readable name, added because the type URL is long to compare |

The content type says which shape it is:

```text
Content-Type: application/problem+json; charset=utf-8
```

That string is worth setting deliberately. A client library that has a problem-details type checks it, and a human reading
`curl -i` output learns in one line that the body is not the resource they asked for.

## Why a code as well as a type

The standard's `type` is a URL, which means a client can follow it to documentation and cannot comfortably use it in a
`switch`. The `code` field is the pragmatic half:

```ts
if (body.code === "insufficient_copies") {
  offerToJoinTheWaitlist();
}
```

A string a client compares is a promise about stability, so treat it as an API surface: adding codes is safe, renaming one is
a breaking change, and the type URL is where the human-readable version lives.

## One function builds it

```ts
export function toProblem(error: AppError, instance?: string): Problem {
  const problem: Problem = {
    type: `https://library.example.com/problems/${error.code.replaceAll("_", "-")}`,
    title: TITLES[error.status] ?? "Error",
    status: error.status,
    detail: error.message,
    code: error.code,
  };

  if (instance) {
    problem.instance = instance;
  }

  if (error.details !== undefined) {
    problem.errors = error.details;
  }

  return problem;
}
```

The `TITLES` map is a small table of the statuses this API produces, and the fallback to `"Error"` means an unplanned status
still produces a valid document rather than `undefined`:

```ts
const TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  429: "Too Many Requests",
  500: "Internal Server Error",
};
```

`errors` is the one field outside the standard, and it holds the structured extras a validation failure has:

```text
"errors":[{"path":"body.id","message":"lower-case letters, digits and hyphens only"},
{"path":"body.title","message":"Too small: expected string to have >=1 characters"}]
```

A person reads `detail`; a form fills its fields from `errors`. Both from one response, which is the reason the field exists.

## What a client is told about a 500

```text
HTTP/1.1 500 Internal Server Error
Content-Type: application/problem+json; charset=utf-8

{"type":"https://library.example.com/problems/internal-error","title":"Internal Server Error","status":500,
"detail":"Something went wrong.","code":"internal_error"}
```

Nothing about the failure. No stack trace, no table name, no path, no library version. The test suite asserts that:

```ts
expect(response.body).toMatchObject({ code: "internal_error", detail: "Something went wrong." });
expect(JSON.stringify(response.body)).not.toContain("SQLite");
```

That second line is the one worth copying, because the leak is usually a `detail: error.message` that somebody added while
debugging an incident and left. An internal message can name a table, a file path, or a connection string, and all three are
useful to somebody probing the API.

A validation message is the other side of that line. `"lower-case letters, digits and hyphens only"` is written for a client,
because the client can fix it. `"no such table: bookss"` is written for the server, because only the server can.

## Where the detail goes instead

```ts
if (appError.status >= 500) {
  (request.log ?? logger).error({ err: error, requestId: request.id }, "request failed");
} else {
  (request.log ?? logger).warn({ code: appError.code, status: appError.status, requestId: request.id }, "request refused");
}
```

The client gets a sentence and a request id. The log gets the stack, the request id, and the route, and the two are joined by
that id when somebody sends a screenshot. The logging lesson takes the shape of those lines apart.

Two levels, chosen deliberately: a 5xx is an error and belongs in whatever wakes somebody up, while a 4xx is a client
mistake and belongs in the log quietly. A 404 that pages an engineer at three in the morning is a scanner, not an incident.

## Check yourself

Add a route that throws an error containing a secret-looking string, then check the response body and the log line for it.
Then produce each status in the table with a request and compare the six documents side by side, which is what a client
implementer will do first.
