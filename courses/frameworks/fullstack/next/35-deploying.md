---
title: Deploying
summary: Where the build runs, where the cache lives, and what a second instance changes about both.
chapter: Shipping
minutes: 14
status: draft
---

## Four places to put it

| Host | Shape | Needs from you |
| --- | --- | --- |
| the platform the framework comes from | a Git push, a build per branch, a CDN | almost nothing |
| a container platform | the image from the previous page | a port, a health check, environment variables |
| your own server | `next start` behind a reverse proxy | a process manager, TLS, deploys |
| a static file host | prerendered files only | giving up everything on this page |

The fourth deserves the warning it gets in the docs. A static export turns the framework into a generator: no server
components reading a cookie, no route handlers, no actions, and no cache handler, because there is no server to run any of it.
The docs' own capability table marks `use cache` as unsupported for static export. If you want the framework's model, you want a
server, and the cheapest one is a container.

## What runs where

```text
build time            the compilation, the type check, the prerendering, the font download
runtime               the server, the cached entries, the request-time renders
your build script     whatever else has to happen on every deploy
```

The line between the first two is the one to get right. Anything the build needs has to be available at build time, which
includes the data source behind `generateStaticParams` and any font fetched from a CDN. A build that reaches a database the
build environment cannot see fails in the pipeline rather than on the laptop.

## Environment variables in an image

```bash
docker run -p 3000:3000 -e NEXT_PUBLIC_SITE_URL=https://library.example.com -e DESK_KEY=... northside-library
```

The distinction from the configuration page comes back with a price in a container:

| Variable | Set when | Consequence |
| --- | --- | --- |
| `NEXT_PUBLIC_*` | build time, inlined into the JavaScript | one image per environment, or one that is wrong in one of them |
| server only | runtime, read per process | one image, two environments, which is what you want |

So the honest approach is: build one image, pass the server-only values at run time, and keep the public ones either constant
across environments or accept two images. An image that has to differ per environment is a build in the pipeline per
environment, and that is a decision rather than an accident.

## The cache, and the second instance

The thing that surprises people on a container platform is the cache. A `'use cache'` entry lives in the process by default, so
two instances have two caches, and an invalidation reaches the instance that handled the write:

```text
instance A  the librarian records a loan, the tag is invalidated here
instance B  a visitor sees the old count until the lifetime expires
```

For most applications the lifetime is short enough that nobody notices. When it is not, there are three answers:

| Answer | Trade |
| --- | --- |
| a shorter lifetime | more renders, less staleness |
| `'use cache: remote'` | a shared cache handler, a network round trip, and often a platform fee |
| no cache on that data | the honest one for data that must be exact |

The same is true of the data in this application, which is a module in the process: two instances have two libraries. A real
application would keep its loans in a database, and then the cache is the only thing to think about rather than the only thing
and the data.

## Health and readiness

A platform asks two different questions and expects two different answers:

```text
liveness    is the process alive        a 200 from any route does
readiness   can it serve traffic        a route that checks the things it needs
```

A route handler is the natural place for both, and the second one is where a database check belongs:

```ts
export async function GET() {
  return Response.json({ status: "ok", at: new Date().toISOString() });
}
```

A readiness check that queries the database on every probe is a load source of its own. Once a minute is plenty, and a
platform's defaults are usually more often than that.

## Deploys, and the two things they reset

Every deploy changes the build id, which means:

- the cache starts empty, so the first requests after a deploy pay for the renders they would otherwise have skipped;
- the prerendered pages are new files, so a CDN in front needs its cache invalidated too, which the platform handles by
  versioning the URLs.

A warm-up is worth writing because of the first: a request to the pages that matter, after the process is ready and before
traffic is shifted to it. On a small application it is a `curl` loop in the deploy script.

## Knowing it is broken

The pieces that exist for the day something goes wrong:

| Signal | Where it comes from |
| --- | --- |
| a stack trace | the process's logs |
| a digest | the error boundary, and the log line for the same error |
| a slow route | the platform's request metrics, or a trace started in `instrumentation.ts` |
| a failing deploy | the build log, which is why the type check runs in the build |

The digest is the one that ties a visitor's screenshot to your logs, which is why printing it in the error boundary is worth
the line it takes:

```text
digest: 2142898062
```

## Rolling back

A deploy is reversible when the previous image is still available and the database is compatible with both versions. That
second condition is the one that bites: a schema change that a new build needs makes an old build wrong, so the deploy order
matters, and a migration that only adds is the version you can roll back.

## Check yourself

Deploy the application somewhere that runs a container, then push a change, watch a deploy, and time how long the first
request after it takes. Then add a warm-up request to the deploy script and measure the same thing again.
