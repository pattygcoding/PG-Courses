---
title: Where FastAPI fits
summary: What this stack is good at, what it is not, and the three things to build next.
chapter: Shipping
minutes: 13
status: draft
---

## What you have

The library API you built has a catalogue with search and paging, loans that cannot lend a copy that is out, a waitlist, two
roles, signed tokens, scrypt password hashing, a rate limit on sign-in, CORS, uploads with limits, problem documents for every
error, structured logs with a request id, 68 tests, and a container that answers a health check and stops cleanly on `SIGTERM`.

That list is more valuable than the framework, because every item on it was a decision, and the course named the trade as it
made it.

## Where the framework stops

FastAPI is a web layer. It has an opinion about routing, dependencies, validation and its schema, and no opinion about the
database, migrations, jobs, an admin or a front end. Those are libraries, and choosing them is the work in any framework that
leaves them out.

The cost of that, honestly: two FastAPI applications built by two teams share a vocabulary rather than a structure, and a new
developer has to read the decisions before reading the code. The benefit: the framework is five dependencies, and none of the
decisions was forced.

## What the layers did for you

| Layer | The one place it showed up |
| --- | --- |
| pydantic | a `422` with a list of field paths, from annotations |
| Starlette | the middleware order, the `405`, the lifespan |
| uvicorn | the socket, the workers, `SIGTERM` |
| FastAPI | `Depends`, the OpenAPI schema, the exception handlers |

Knowing which layer owns a behaviour is what makes an error message readable, and it is the reason the first lesson names all
four.

## When something else is the better tool

| Situation | Better fit | Why |
| --- | --- | --- |
| a full application with templates and an admin | Django | the framework owns the whole stack, not the web layer |
| a small service with no validation to speak of | Flask | nothing to configure and nothing to learn |
| the fastest possible request path | Litestar or Starlette direct | less between the socket and the function |
| a typed API for a TypeScript client | FastAPI or a schema-first tool | the schema is the contract either way |
| background work at scale | FastAPI plus a queue | the web layer is not a job runner |

Two rows are worth a sentence. Django is not a worse FastAPI; it is a different answer to "who writes the rest of the
application". And the framework's own architecture page is worth reading once, because it explains the design as a set of
choices with alternatives rather than as a set of features.

## The three things to build next

**A database with a server.** The change is small because the SQL is in one layer: a `DATABASE_URL`, a pool, and the borrow
transaction's `begin immediate` becoming a `select ... for update`. That is what makes two workers able to share a library.

**A refresh token.** The access token lasts eight hours because a token cannot be revoked. The honest version is a short-lived
access token and a refresh token in an http-only, `SameSite` cookie with a rotation rule.

**A job queue.** Sending a welcome email inside a request is the first thing that breaks under load, and the fix is a table of
jobs and a worker reading it. The shape is the same as the graceful shutdown: a separate process, doing work the request path
should not.

## The habits worth keeping

Six things this course did in every chapter, and each one is portable to any stack:

- **The types are the contract.** The validation, the schema and the editor hints are one source of truth.
- **One place decides.** The status of an error, the shape of a response, the parsing of the environment, the closing of the
  process.
- **A resource belongs to a lifetime.** A connection to a request, settings to the application, a secret to the platform.
- **State lives where it belongs.** Two bugs in this course were module level state that should have been on the application
  object.
- **A test per refusal.** The happy path is what you tried by hand; the refusals are what a refactor breaks.
- **A limit on everything a client controls.** Body size, page size, upload size, request rate.

## Check yourself

Read the `repositories` and `routers` folders against the six habits above and name the file that demonstrates each one. Then
pick the habit you would drop in the next service you write, which is the one worth arguing with yourself about.
