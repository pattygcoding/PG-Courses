---
title: Deploying behind a proxy
summary: What the client's address becomes, why you trust one hop, and what changes with a second instance.
chapter: Shipping
minutes: 13
status: draft
---

## The socket is not the client

```text
a browser at 203.0.113.7
  to a load balancer
    to your container on a private network
```

Your process sees a connection from the load balancer. The client's address arrives in a header the proxy adds:

```text
X-Forwarded-For: 203.0.113.7, 10.0.1.5
X-Forwarded-Proto: https
X-Forwarded-Host: library.example.com
```

Every one of those is a request header, which means a client can send its own. The difference between the two is the whole
reason for the `trust proxy` setting:

```ts
app.set("trust proxy", config.TRUST_PROXY);
```

| Value | Means |
| --- | --- |
| `0` | trust nothing, use the socket address, which is the proxy's |
| `1` | trust the last hop, which is the one proxy in front of you |
| `true` | trust every hop, which lets a client forge its own address |

Three things depend on getting it right, and all three are wrong in the same direction when it is `0`:

```text
the request log     every request appears to come from the proxy
the rate limiter    one window shared by every client
request.ip          the proxy, which is what an audit trail would record
```

With `true`, the failure is the opposite and worse: a client sends `X-Forwarded-For: 1.2.3.4` and the limiter counts it under
an address the client chose, so it can send a different one with every attempt and never hit a limit.

The number is the count of proxies you operate. One load balancer means `1`, and a platform that terminates TLS and forwards
to your container is one.

## TLS ends at the proxy

```text
browser  --https-->  load balancer  --http-->  your container
```

The container speaks plain HTTP on a private network, and two things follow from that:

- **A redirect to HTTPS is the proxy's job.** A container that redirects based on `request.secure` without `trust proxy` set
  sees every request as insecure and redirects forever, which is a loop that appears the day the setting changes.
- **`Strict-Transport-Security` is set by the proxy**, or by helmet with the knowledge that the site is HTTPS-only. Sent over
  HTTP to a browser, the header is ignored, and sent for a site with an HTTP-only section it takes that section down.

The application code is unchanged either way, which is the point of doing TLS one layer out. The `X-Forwarded-Proto` header is
what tells the code what the client actually used, and `config.TRUST_PROXY` is what makes it believe that header.

## Two instances, and what breaks

This application holds two pieces of state in the process, and both change meaning with a second instance:

| State | One instance | Two instances |
| --- | --- | --- |
| the rate limiter's counters | an accurate window | each instance counts half the attempts |
| `SQLite`'s write lock | one writer, serialised | two files, two libraries |

Neither is a bug in the code; they are consequences of the deployment shape, and each has a small, honest fix.

**The rate limiter** needs a shared store. The interface is a callback, so the change is a few lines:

```ts
import { RedisStore } from "rate-limit-redis";

const limiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }),
});
```

**The database** needs to leave the container. A managed PostgreSQL instance, a connection pool, and a `DATABASE_URL` in the
environment:

```ts
const database = new DatabaseSync(config.DATABASE_PATH);       // before
const database = new Pool({ connectionString: config.DATABASE_URL });  // after
```

The queries survive that change because they are in one layer and written in SQL. The transaction in the borrow method becomes a
database transaction with the same `begin` and `commit`, and the statement that checks the shelf becomes a `select ... for
update`, which is the version of that lock a client-server database needs.

## Sticky sessions, and when they matter

```text
a load balancer that routes one client to the same instance every time
```

Sticky sessions are needed when an instance holds something a request depends on: an in-memory session, an upload in progress,
a websocket. This application needs none of them, because the token is in the request and the files are on a volume, which is
the payoff for choosing a stateless credential in the authentication lesson.

Where a platform offers it, sticky sessions are a workaround for a stateful design rather than a feature to reach for. The
question to ask first is what would break without them, and for most APIs the answer is nothing.

## What to watch in production

| Signal | Where it comes from | What it means |
| --- | --- | --- |
| 5xx rate | the access log's `status` | a bug or a dependency failing |
| p99 latency | the access log's `durationMs` | the event loop, a query, or a slow dependency |
| the readiness probe | the platform | the database or the disk |
| restart count | the platform | a crash loop, or an out-of-memory kill |
| the 429 count | the access log | a real limit, or a broken `trust proxy` |

Every one of those is derived from a field already in the logs, which is the argument for the structured access line. A
platform that collects stdout turns them into charts with a query rather than an agent per service.

## Check yourself

Run the container behind a proxy or a tunnel that adds `X-Forwarded-For`, then set `trust proxy` to `0`, `1` and `true` and
compare which address appears in the request log and under which key the rate limiter counts. Then write down what would have
to change in this application to run two instances, which is the list the database and the limiter above.
