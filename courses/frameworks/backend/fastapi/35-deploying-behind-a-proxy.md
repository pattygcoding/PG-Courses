---
title: Deploying behind a proxy
summary: What the client's address becomes, the proxy headers uvicorn has to be told about, and the second instance.
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

The process sees a connection from the load balancer. The client's address is in a header the proxy adds:

```text
X-Forwarded-For: 203.0.113.7, 10.0.1.5
X-Forwarded-Proto: https
X-Forwarded-Host: library.example.com
```

Every one of those is a request header, which means a client can send its own. uvicorn has to be told which proxies to
believe:

```bash
python -m uvicorn library_api.main:app --app-dir src --host 0.0.0.0 \
  --proxy-headers --forwarded-allow-ips="10.0.1.5"
```

| Setting | Means |
| --- | --- |
| no `--proxy-headers` | the socket address is the only one believed, so every request looks like the proxy |
| `--proxy-headers` with a known address | trust the headers from that address, which is the proxy |
| `--proxy-headers --forwarded-allow-ips="*"` | trust anybody, which lets a client choose its own address |

Three things depend on choosing correctly, and all three are wrong in the same direction when the flag is missing:

```text
the access log      every request appears to come from the proxy
the rate limiter    one window shared by every client
request.client      the proxy, which is what an audit trail would record
```

The rate limiter in this application keys its windows on `request.client.host`, so a deployment that forgets the flag gives the
whole internet one window of ten sign-ins a minute. That is a failure worth testing in a staging environment rather than
discovering from a support ticket.

`--forwarded-allow-ips="*"` is the other mistake and the worse one: with it, a client sends `X-Forwarded-For: 1.2.3.4` and the
limiter counts it under an address the client chose, so a different address with every attempt never hits a limit.

## TLS ends at the proxy

```text
browser  --https-->  load balancer  --http-->  your container
```

The container speaks plain HTTP on a private network, so a redirect to HTTPS is the proxy's job and the application does not
see a certificate. What it can see is what the client actually used:

```python
request.headers.get("x-forwarded-proto")     # "https", when the proxy was told to set it
```

A container that redirected based on its own idea of `https` would redirect forever, because every request it receives is
plain HTTP. The header is the only honest source, and `--proxy-headers` is what makes uvicorn trust it.

## Two instances, and what breaks

Two pieces of state live in this process, and both change meaning with a second instance:

| State | One instance | Two instances |
| --- | --- | --- |
| the rate limiter's windows | an accurate window | each instance counts half the attempts |
| the SQLite file | one writer, serialised | two files, two libraries |

Neither is a bug in the code; both are consequences of the deployment shape, and each has a small, honest fix. The limiter
needs a shared store, which is a few lines when the interface is a function. The database has to leave the container, which is
a `DATABASE_URL`, a pool in `db.py`, and the borrow transaction's `begin immediate` becoming a `select ... for update`.

## Sticky sessions, and when they matter

Sticky sessions are for an instance that holds something a request depends on: an in-memory session, an upload in progress, a
websocket. This application needs none of them, because the token is in the request and the files are on a volume, which is the
payoff for choosing a stateless credential.

Where a platform offers the setting, it is a workaround for a stateful design rather than a feature to reach for.

## What to watch

| Signal | Where it comes from | What it means |
| --- | --- | --- |
| 5xx rate | the access line's `status` | a bug or a dependency failing |
| p99 latency | the access line's `duration_ms` | the loop, a query, or a slow dependency |
| readiness | the platform | the database or the disk |
| restart count | the platform | a crash loop, or an out-of-memory kill |

Every one of those is a field already in the log, which is the argument for the structured access line: a platform that
collects stdout turns them into charts with a query rather than an agent per service.

## Check yourself

Run the container behind a proxy or a tunnel that adds `X-Forwarded-For`, then start uvicorn with and without
`--proxy-headers` and compare which address appears in the access line and under which key the limiter counts. Then write down
what would have to change for two instances, which is the list above.
