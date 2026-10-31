---
title: Express
level: Beginner
summary: Build an HTTP API in Node, from a first route to a container that shuts down cleanly under a load balancer.
labels:
  - Framework
  - Backend
  - Node
minutes: 25
status: draft
---

## What this course is

Express is a router that sits on Node's own HTTP server. It adds four things and stops: route patterns that turn a URL into
a handler, a middleware chain that runs before and after it, a request and a response object with conveniences on them, and a
view engine hook almost nobody uses for an API.

Everything else is a decision you make. Where validation happens, how an error reaches a client with the right status, how
the data layer is arranged, what a test starts, and how the process stops when the platform asks it to. That list is the
course.

The current major version is 5, and it changed enough that habits from 4 will mislead you. A handler that returns a rejected
promise now reaches the error handler without a wrapper. The path pattern syntax changed, so `get("*")` is an error and
`get("/*splat")` is not. `res.status(99)` throws instead of quietly doing something odd, and `req.body` is `undefined`
unless a parser ran. Each of those is in the pages that follow, written up from a run rather than from a changelog.

## Who it is for

You can write JavaScript or TypeScript and you want a server you would put in front of users, or you have an Express
application to maintain and want to know why its middleware are in that order.

The JavaScript and TypeScript courses in this catalogue cover the language. This one assumes the language and spends its
time on the server: HTTP, middleware, routing, validation, errors, authentication, tests, and shipping.

## What you will build

The Northside Library API, the same library the Ruby, Rails and Next.js courses build, as a JSON service.

It ends up with a catalogue you can search and page through, loans that refuse to lend a copy that is already out, a
waitlist, accounts with two roles, signed tokens, rate limiting, CORS, ETags, file uploads, problem documents for every
error, structured logs with a request id per request, 41 tests, and a container that answers a health check and shuts down
gracefully on `SIGTERM`.

The database is a real one. Node 24 ships SQLite as `node:sqlite`, so the course uses it directly: no ORM, no native build,
and SQL you can read in the file it lives in.

## Prerequisites

Node.js 24 or later, which is where `node:sqlite` needs no flag, and a terminal. The project is TypeScript, so the course
uses `tsc` and `tsx`, and it was written on Node 24.22, TypeScript 7.0 and Express 5.3.0.

Comfort with `async`/`await` and with the command line is enough. Nothing here assumes you have written a server before,
and the first chapter starts from an empty directory.

## How the pages are ordered

The first chapter is what Express is, how a project is set up, and what a request and a response actually are. The second
is middleware, which is the whole architecture of an Express application, then parsing, configuration, security headers and
uploads.

The third chapter is data: a repository layer, SQLite through `node:sqlite`, the queries behind filtering and paging, a
transaction that makes the last-copy check safe, and validation with zod. The fourth is errors: your own error classes, one
response shape for all of them, the 404 that catches everything else, and what Express 5 did to rejected promises.

The fifth is what makes an API usable by other people: tokens and sessions, password hashing, the difference between
authentication and authorisation, rate limiting, CORS, and caching with ETags.

The sixth is quality: the test setup, tests for routes and for the database, structured logging, types at the boundary, and
what blocks the event loop. The last chapter ships it: the build, graceful shutdown, the container, what changes behind a
reverse proxy, and where Express stops being the right tool.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run, and
the application grows as you go.
