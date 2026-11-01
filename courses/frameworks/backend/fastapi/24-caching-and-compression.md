---
title: Caching and compression
summary: The header FastAPI does not set, the one that decides freshness, and the size threshold on compression.
chapter: Security and API concerns
minutes: 12
status: draft
---

## What the response headers say

```bash
curl -s -D - -o NUL http://127.0.0.1:8000/books
```

```text
HTTP/1.1 200 OK
date: Sat, 31 Oct 2026 15:59:22 GMT
server: uvicorn
content-length: 785
content-type: application/json
vary: Origin
```

Four headers the framework set and **no `ETag`**. That is the difference worth knowing against Express, which hashes every
response body for you: FastAPI and Starlette do not, so a conditional request gets a full body every time until you add one.

| Header | Set by FastAPI | What it does |
| --- | --- | --- |
| `content-type` | yes, from the response model | what the body is |
| `content-length` | yes | how many bytes |
| `vary` | yes, by the CORS middleware | which request headers change the response |
| `ETag` | no | a hash a client can send back to skip a download |
| `Cache-Control` | no | how long a client may keep the response |

## Adding an ETag

```python
import hashlib


def with_etag(response: JSONResponse, payload: bytes) -> JSONResponse:
    digest = hashlib.sha256(payload).hexdigest()[:16]
    response.headers["etag"] = f'W/"{digest}"'

    return response
```

Where a list endpoint a client polls is worth the bytes, the pattern is to hash the body, set the header, and answer `304`
when the client sends it back:

```python
if_none_match = request.headers.get("if-none-match")

if if_none_match and if_none_match == etag:
    return Response(status_code=304)
```

Two things make this worth it and two make it a trap. It is worth it for a large, stable body that a client fetches
repeatedly. It is a trap when the body contains a timestamp or a counter, because then every response has a new tag and the
header costs bytes while buying nothing. The health endpoint in this application is exactly that case: it returns its uptime,
so an ETag on it would never match.

## Cache-Control is the decision

```python
response.headers["cache-control"] = "public, max-age=60"
```

| Directive | Means |
| --- | --- |
| `public` | any cache may keep it, including a shared one |
| `private` | only the client's own cache |
| `no-store` | do not write it to disk or memory at all |
| `no-cache` | store it, but revalidate before every use |
| `max-age=60` | fresh for a minute, with no request at all |
| `s-maxage=600` | a different, usually longer, life for a shared cache |

Three shapes cover almost every API response:

```python
resp_public   = "public, max-age=60"                        # a public catalogue
resp_private  = "private, no-store"                         # anything about a signed-in person
resp_changing = "private, max-age=0, must-revalidate"       # a resource that changes
```

The middle one is the habit to build. A response derived from a token must not go into a shared cache, and the failure is
quiet: an office full of people behind one proxy starts seeing each other's responses.

## Compression, and the threshold

```python
app.add_middleware(GZipMiddleware, minimum_size=1000)
```

```python
compressed = client.get("/books")
print(compressed.headers.get("content-encoding"))
```

```text
None
```

That `None` is the middleware working correctly. The catalogue response was **785 bytes**, which is below the threshold, and
compressing a body that small costs more CPU than the bytes it saves. The measurement worth taking is on a response over the
line:

| Response size | What to do |
| --- | --- |
| under a kilobyte | nothing; the threshold is the answer |
| a few kilobytes of JSON | gzip, and the ratio is usually good |
| a large file | not through a compression middleware at all |

Where the response is genuinely large and the CPU matters, the alternative to compressing on every request is compressing
once and caching the result, which is the same trade as any cache: memory and staleness in exchange for work not done.

## What not to cache

```text
a response containing a token
a response derived from a token
a health or readiness check
anything the client must see fresh after a write
```

The last row is the one that bites in an API with a mutation endpoint: a client records a loan and immediately reads the
catalogue, and a `max-age=60` on the read hands back the shelf from before the write. Where a response changes on a write, the
honest header is `no-store`, and the caching that helps is at the HTTP layer above, keyed on the URL rather than on the data.

## Check yourself

Add an `ETag` to one endpoint and confirm a `304` with `curl -H 'If-None-Match: ...'`, then add `Cache-Control: private,
no-store` to the route that returns the signed-in account and read the header back. Finally raise `minimum_size` to a hundred
bytes and see the `content-encoding` appear on a response that had none.
