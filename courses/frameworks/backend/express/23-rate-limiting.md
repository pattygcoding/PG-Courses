---
title: Rate limiting
summary: A window per client, the header that makes it work behind a proxy, and what a 429 should say.
chapter: API concerns
minutes: 12
status: draft
---

## The endpoint worth limiting

```ts
const signInLimit = rateLimit({
  windowMs: limits.windowMs,
  limit: limits.max,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    type: "https://library.example.com/problems/too-many-requests",
    title: "Too Many Requests",
    status: 429,
    detail: "Too many sign-in attempts. Wait a minute and try again.",
  },
});

router.post("/sign-in", signInLimit, validate({ body: signInBody }), (request, response) => {
```

```bash
for i in $(seq 1 12); do curl -s -o /dev/null -w '%{http_code} ' -X POST http://localhost:3000/auth/sign-in \
  -H 'content-type: application/json' --data @scratch/signin.json; done
```

```text
200 200 200 200 200 200 200 200 200 200 429 429
```

Ten requests through and the eleventh refused. A password hash is slow on purpose, and a limit turns that from a cost per
guess into a wall.

## What is being counted

| Key | Effect |
| --- | --- |
| the client address | one limit per network address |
| the account being attacked | one limit per email, whatever the address |
| the route | one limit per endpoint |

The default is the client address, which stops one machine from guessing. It does not stop a botnet from spreading the same
attempt across a thousand addresses, and it punishes everyone behind a shared address, such as an office or a mobile network.

The stronger version counts the account as well, which needs the body to have been parsed and the identifier to be in it:

```ts
keyGenerator: (request) => `${request.ip}:${String((request.body as { email?: string }).email)}`,
```

That is a decision about what the limit is for. Counting addresses protects the server; counting accounts protects the
accounts. A login endpoint usually wants both, with a loose limit on the address and a tight one on the account.

## The trap behind a proxy

```ts
app.set("trust proxy", config.TRUST_PROXY);
```

With a reverse proxy in front and `trust proxy` at `0`, every request arrives from the proxy's address, so the limit is one
window shared by the whole internet: the eleventh request from anybody is refused. That failure looks like a bug in the rate
limiter and is a configuration mistake one layer up.

Set it to `true` instead and the opposite happens: a client sends its own `X-Forwarded-For` and chooses the key its requests
are counted under, so it can send a different address with every attempt.

The correct value is the number of proxies you operate. One reverse proxy in front means `1`, which tells Express to trust the
last hop and nothing before it. That number is the same one the deployment lesson needs for logging the client address.

## What the response carries

```text
HTTP/1.1 429 Too Many Requests
RateLimit: "10-in-1min"; r=0; t=60
RateLimit-Policy: "10-in-1min"; q=10; w=60; pk=:YmIwY2Q1MTM2YWU1:
Retry-After: 60
```

`standardHeaders: "draft-8"` produces the two `RateLimit` headers from the IETF draft: the policy name, how many requests
remain, and how long until the window resets. The middleware also sets `Retry-After`, which is the header a client library
reads without being taught, and without it a client guesses how long to wait and usually guesses "immediately".

The body follows the same contract as every other error in this API:

```text
{"type":"https://library.example.com/problems/too-many-requests","title":"Too Many Requests","status":429,
"detail":"Too many sign-in attempts. Wait a minute and try again."}
```

## Where else it belongs

| Endpoint | Why a limit helps |
| --- | --- |
| sign-in | guessing a password |
| registration | creating accounts at scale |
| password reset | sending mail, which costs money and can be abused |
| a search endpoint | a query that is expensive per request |
| anything that sends an email or a message | an amplification of somebody else's address |

A limit on every endpoint is a limit that is too loose to matter, and it catches honest clients. The list above is the shape
of the answer: the endpoints where one request costs something you do not want to spend.

## What it does not do

The store is memory by default, which means two instances have two counters and a client gets twice the allowance. That is the
same shape as the cache problem in the next lesson, and the answer is the same: a shared store.

```ts
import { RedisStore } from "rate-limit-redis";

const limiter = rateLimit({ store: new RedisStore({ sendCommand: (...args) => client.sendCommand(args) }) });
```

The interface is a callback, so the change is a few lines and one dependency. Until there is a second instance, memory is the
right store, and the lesson on deploying is where the decision gets made.

## Check yourself

Set the limit to three a minute, exhaust it, and read the three headers of the 429. Then send a request with a fabricated
`X-Forwarded-For` with `trust proxy` at `1` and at `0` and compare the keys the limiter sees, which is the experiment that
makes the proxy setting concrete.
