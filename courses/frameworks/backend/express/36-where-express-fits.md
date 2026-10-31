---
title: Where Express fits
summary: What this stack is good at, what it is not, and the three things to build next.
chapter: Shipping
minutes: 13
status: draft
---

## What you have

The library API you built has a catalogue with search and paging, loans that cannot lend a copy that is out, a waitlist, two
roles, signed tokens, password hashing with scrypt, a rate limit on sign-in, CORS, ETags, uploads with limits, problem
documents for every error, structured logs with a request id, 41 tests, and a container that drains before it stops.

Every one of those was a decision, and the course named the trade as it made it. That list is the useful part, more than the
framework, because Express is a router and the decisions are the work.

## Where the framework stops

Express is a router, a middleware chain and two objects. It has no opinion about structure, no dependency injection, no
validation, no schema, no job runner and no admin. Those are libraries you choose, and choosing them is the same work in any
framework that leaves them out.

The cost of that, honestly: two Express applications built by two teams can share almost nothing, and a new developer has to
learn the decisions before reading the code. The benefit: none of those decisions are forced, and the framework itself has
seven dependencies and a small surface to keep patched.

## When something else is the better tool

| Situation | Better fit | Why |
| --- | --- | --- |
| throughput is the requirement | Fastify | a faster request path and schema-based serialisation |
| a large team, one structure | NestJS | modules, decorators and injectable services |
| an edge runtime | Hono | the same middleware idea, built for Web APIs |
| one file and a few routes | Node's own `http` | no dependency, no chain to learn |
| a full application with a UI | Next.js or Rails | the framework owns the whole stack, not the API |

The third row is the one that changed most recently, and it is the reason Hono exists: Express is built on Node's request and
response objects, and a runtime that offers Web `Request` and `Response` instead needs a framework written against those.
Express 5 does support the Node.js runtime everywhere, which is progress on the same problem from the other side.

## What to build next

Three things, in order, and each one is a lesson this course deliberately left out.

**A database with a server.** The moves in it are small, because the data layer is one folder: a `DATABASE_URL`, a pool, and
the transaction in the borrow method becomes a `select ... for update`. That change is what makes two instances possible.

**A real session or a refresh token.** The desk cookie in this application is a placeholder for a user, and the honest version
is a table of sessions with a revocation path, or a refresh token in an http-only cookie with a rotation rule. The lesson on
tokens named the trade; this is where you pick a side of it.

**A job queue.** Sending a welcome email inside a request is the first thing that breaks under load, and the fix is a table of
jobs and a worker process that reads it. The shape is the same as the graceful shutdown: a separate process, doing work the
request path should not.

## The habits worth keeping

Six things this course did in every chapter, and each one is portable to any stack:

- **One place decides.** The status of an error, the shape of a response, the parsing of the environment, the closing of the
  process. A decision in one file is a decision that can be changed.
- **A boundary with a check on it.** The request is validated at the edge, the row is mapped at the repository, the token is
  verified before anything reads a role.
- **A limit on everything a client controls.** Body size, page size, upload size, request rate.
- **The reason is at the failure site.** `throw new ConflictError("No copies of Dune are on the shelf.")` says what went wrong
  where it went wrong, and the formatting happens once.
- **A test per refusal.** The happy path is what you tried by hand; the refusals are what a refactor breaks.
- **A measurement before a change.** `durationMs` in the log line, a `curl -w` for one request, and the numbers that decide
  whether the twenty-four milliseconds of `scrypt` is a problem or the point.

## The last thing to try

Take the API apart on purpose. Delete the error middleware and watch how many handlers start formatting their own errors, or
move `express.json()` below the routers and follow the failures. The chain's order and one shape for errors are the two
decisions that make the rest of the application comprehensible, and both are easiest to believe once you have seen the version
without them.

## Check yourself

Clone the project, delete every file except the config, the errors and the app, and rebuild one route from nothing until a test
for it passes. Then read the routes folder and say which of the six habits above each file demonstrates, which is the fastest
way to find the one you would drop in the next service you write.
