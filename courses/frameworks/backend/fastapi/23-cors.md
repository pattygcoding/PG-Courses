---
title: CORS
summary: Why a browser blocks a cross-origin request, what the preflight carries, and the wildcard that cannot combine.
chapter: Security and API concerns
minutes: 13
status: draft
---

## The browser is the enforcer

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=resolved.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins=["http://localhost:3000"]` comes from the settings, so the list is configuration rather than a constant in the
middleware call. The request the browser sends before a cross-origin call is the preflight, and it is worth seeing once:

```bash
curl -s -D - -o NUL -X OPTIONS http://127.0.0.1:8000/books \
  -H 'origin: http://localhost:3000' -H 'access-control-request-method: POST'
```

```text
HTTP/1.1 200 OK
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Request-Private-Network
```

The browser then sends the `POST` it wanted to send. Nothing on the server refuses the cross-origin request: the response
headers are what tell the browser whether to hand the answer to the page, which is why `curl` never notices a CORS problem and
why "it works in Postman" is the most common sentence in a CORS conversation.

## The wildcard that cannot combine

```python
CORSMiddleware(allow_origins=["*"], allow_credentials=True)   # the browser refuses this pair
```

`Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` together would let any site read an
authenticated response from any user who visits it, so the specification forbids it and a browser rejects the response.

| What you want | What to set |
| --- | --- |
| a public API, no cookies | `allow_origins=["*"]`, credentials off |
| one known front end | that origin in the list |
| several known front ends | the list, credentials on |
| a wildcard with credentials | not possible, and the reason is above |

## Vary, and the cache bug it prevents

```text
vary: Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Access-Control-Request-Private-Network
```

`Vary` tells a cache that the response depends on those request headers, so a response generated for one origin is not served
to another. That list is longer than most people expect and it is set for you. Without it, a shared cache can hand
`Access-Control-Allow-Origin: http://localhost:3000` to a browser on a different site, which is either a broken request or a
permission granted to the wrong place, and it is the header to check when a CORS failure appears only behind a CDN.

## Where the middleware goes

```python
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.middleware("http")(request_context)
```

Middleware added last runs first, which is the reverse of Express. The examples in this application all work in any order
because they do different things, and it matters the moment two of them touch the same header:

| Order | Why it is registered that way |
| --- | --- |
| CORS first | a preflight is answered before anything else looks at the request |
| compression next | the body is written before it is compressed |
| the request context last | the access log line gets the status the other middleware produced |

The request context is registered last and therefore runs first, which is what puts a request id on the response even when a
later middleware refuses the request.

## What CORS is not

| Not | Why |
| --- | --- |
| authentication | it decides which page may read a response, not who the caller is |
| a server-side check | a script with `curl` ignores every header it sets |
| protection for a public API | the token is the protection, or the data is |
| a fix for a 404 | a missing header and a missing route look similar in a console and are different problems |

The last row is worth keeping in mind. A browser reports a CORS error for any response it refuses to hand over, including a
`500` from a server that set no headers at all, so the console message is a symptom rather than a diagnosis.

## Check yourself

Send a preflight with `curl` and read the headers, then change the allow list to one origin and send a preflight from another
and compare. Then set `allow_origins=["*"]` with credentials on and find the browser's refusal in the console, which is the
one error message in this lesson that comes from the client rather than the server.
