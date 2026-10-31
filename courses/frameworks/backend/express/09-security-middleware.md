---
title: Security middleware
summary: The headers helmet sets, the fingerprint to remove, and the proxy setting that makes the rest correct.
chapter: Middleware and the app
minutes: 14
status: draft
---

## What the defaults give you

```ts
app.use(helmet());
```

```bash
curl -s -D - -o /dev/null http://localhost:3000/health
```

```text
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self';base-uri 'self';font-src 'self' https: data:;...
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
```

Six headers, and each one closes a specific hole:

| Header | What it stops |
| --- | --- |
| `X-Content-Type-Options: nosniff` | a browser guessing a file's type and running it as a script |
| `Content-Security-Policy` | a browser loading a script from somewhere you did not name |
| `Strict-Transport-Security` | a downgrade to HTTP after the first visit |
| `X-Frame-Options` | your page being framed and clicked through |
| `Referrer-Policy` | your URLs leaking to other sites in a referrer header |
| `Cross-Origin-Opener-Policy` | a window handle opened to your page being kept |

The content security policy matters least for a JSON API and most for anything serving HTML, because it is the header that
turns the whole page into an allow list. A template-rendering application needs to name its own sources rather than accept
the default, which is why the middleware takes options.

## The fingerprint

```text
X-Powered-By: Express
```

A response header that names the framework and, historically, its version. It costs nothing to remove and it tells a scan
which list of known issues to try first:

```ts
app.disable("x-powered-by");
```

`helmet()` does the same thing, and keeping both lines is fine: one says the framework was configured, the other says the
header is gone. What matters is the response, not the line that produced it.

## The proxy setting is not optional in production

```ts
app.set("trust proxy", config.TRUST_PROXY);
```

Behind a reverse proxy, the socket's address is the proxy's and the client's real address arrives in `X-Forwarded-For`. That
header is a string a client can send, so a framework has to be told which proxies to believe:

| Setting | Means |
| --- | --- |
| `0` (the default) | believe nothing, use the socket address |
| `1` | trust the last proxy, which is the one in front of you |
| `true` | trust every hop, which is wrong unless nothing else exists |

Two things break when this is wrong, and both are security problems rather than cosmetics:

- **Rate limiting counts the wrong client.** With a proxy in front and `trust proxy` at 0, every request appears to come
  from the proxy, so one attacker exhausts the limit for everybody.
- **Application logic that trusts `request.ip` can be fed a fake address.** With `trust proxy` at `true` and one proxy in
  front, a client that sends its own `X-Forwarded-For` chooses the address the application believes.

So the number is the count of proxies you operate, and the deployment lesson comes back to it.

## Limits are security work

Three limits in this application, and each one is a client deciding how much of your server to spend:

```ts
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

const signInLimit = rateLimit({ windowMs: limits.windowMs, limit: limits.max });

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024, files: 1 } });
```

A body limit stops one request from allocating a large string, the sign-in limit stops a password being guessed at speed,
and the upload limits stop a client from filling a disk. A request that exceeds any of them is refused before the expensive
work starts, which is what makes them worth having rather than a network appliance's job.

## The order, and why it is first

```ts
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "64kb" }));
```

Security headers are registered before anything else so that every response has them, including the ones produced by an
error. A header middleware placed after the routers would miss every 404 and every 500, which are exactly the responses an
attacker probes to see what the server is.

## What is not a header

Two things look like security middleware and belong elsewhere:

| Instead of | Do |
| --- | --- |
| a middleware that checks a session for every request | check inside the handler that reads protected data |
| a header that hides an endpoint | a route that does not exist, and a 404 for it |

The first is the mistake a `checkAuth` middleware invites, because it fails open on the routes someone forgets to add to
its list. The authentication and authorisation lessons put the check where the data is, and the reason is this paragraph.

## Dependencies are the other surface

```bash
npm audit
```

```text
found 0 vulnerabilities
```

Seven direct dependencies is a small footprint, and it is worth re-reading the tree when it grows. A framework that does
little has little to patch, and the check to run before a release is the one that takes a second.

## Check yourself

Print the headers of a successful response, a 404 and a 500 and confirm all three carry them. Then set `trust proxy` to
`true`, send a request with your own `X-Forwarded-For`, and find where the address you invented shows up in the logs.
