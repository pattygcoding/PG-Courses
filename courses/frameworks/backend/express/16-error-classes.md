---
title: Error classes
summary: One base class, five subclasses, and a rule that the status is decided in one place.
chapter: Errors and responses
minutes: 13
status: draft
---

## What a handler should be able to write

```ts
router.get("/:id", (request, response) => {
  const book = books.find(param(request, "id"));

  if (!book) {
    throw new NotFoundError("That book is not in the catalogue.");
  }

  response.json({ data: book });
});
```

One line for the failure, no status code, no response shape, and the happy path unchanged. Everything about how that error
becomes a response is somewhere else, which is what makes this readable.

The alternative spreads the same decision across every handler:

```ts
if (!book) {
  response.status(404).json({ error: "That book is not in the catalogue.", code: "not_found" });
  return;
}
```

Two lines per failure, and a shape that drifts: one handler writes `error`, the next writes `message`, the third forgets the
code. The class version keeps the *reason* at the throw site and the *presentation* in one handler.

## The base class

```ts
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);

    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
```

Four fields, and each earns its place:

| Field | Used for |
| --- | --- |
| `status` | the HTTP status the client sees |
| `code` | a stable string a client can branch on |
| `message` | the sentence a person reads |
| `details` | structured extras, such as the field errors from a schema |

`this.name = new.target.name` is the line that makes a log line useful. `new.target` is the class that was actually
constructed, so a `NotFoundError` logs as `NotFoundError` rather than as `AppError`, which is the difference between grep-able
logs and a stack trace of `Error`.

## The five that carry the status

```ts
export class NotFoundError extends AppError {
  constructor(message = "That resource does not exist.") {
    super(404, "not_found", message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "The request body is not valid.", details?: unknown) {
    super(400, "validation_failed", message, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = "The request could not be read.", code = "bad_request", details?: unknown) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sign in to continue.") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super(403, "forbidden", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "That change conflicts with the current state.") {
    super(409, "conflict", message);
  }
}
```

Every constructor takes a message with a default, so a throw site can be specific or silent:

```ts
throw new NotFoundError();                                        // "That resource does not exist."
throw new NotFoundError("That book is not in the catalogue.");    // the useful version
```

The default exists so that a hurried handler still answers correctly, and the messages in this project are written for the
client rather than for the log, because they are what the response contains.

## Throwing from a repository

```ts
borrow(input: NewLoan): OutstandingLoan {
  if (!stock) {
    throw new NotFoundError("That book is not in the catalogue.");
  }

  if (stock.available < 1) {
    throw new ConflictError(`No copies of ${stock.title} are on the shelf.`);
  }
```

A data layer that throws HTTP errors is a design decision worth being explicit about. The argument for it: the reason a borrow
failed *is* the rule, the rule is a 404 or a 409 in every context, and translating it twice adds a layer that can only lose
information.

The argument against: a repository should not know it is behind HTTP, and a job that calls the same method would have to catch
an error whose name is about a status code. Where that matters, the repositories return a result type instead:

```ts
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
```

Both designs are defensible, and the rule that matters is that the choice is made once. Mixing them is what produces a handler
that catches some failures and forgets others.

## What no handler should do

These three belong in the error middleware and nowhere else:

```ts
response.status(error.status ?? 500);
response.type("application/problem+json");
console.error(error);
```

A handler that formats an error is a handler the next one has to copy, and the copy is where the shape drifts. The chain
guarantees the error middleware sees every thrown error, including the ones thrown before a handler runs.

## Check yourself

Add an error class for 422 with its own code, throw it from one route, and confirm the response and the log line without
touching the error middleware. Then change the base class to log on construction and see how much noise one request produces,
which is the argument for logging in one place.
