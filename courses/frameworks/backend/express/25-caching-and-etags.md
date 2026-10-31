---
title: Caching and ETags
summary: The weak hash Express adds to every response, the 304 it can answer with, and the client that cannot ask.
chapter: API concerns
minutes: 13
status: draft
---

## A header you did not ask for

```bash
curl -s -D - -o /dev/null http://localhost:3000/books/the-poetic-edda
```

```text
HTTP/1.1 200 OK
ETag: W/"92-ZQqQ2cB/Et3rzi2ZPgpvK12uBdE"
Content-Type: application/json; charset=utf-8
```

Express hashes the body and sets an `ETag`, so a client that already has this resource can ask whether it changed:

```text
GET /books/the-poetic-edda
If-None-Match: W/"92-ZQqQ2cB/Et3rzi2ZPgpvK12uBdE"

HTTP/1.1 304 Not Modified
```

The 304 has no body, which is the point: a client with a copy in hand spends one round trip and no bytes on a resource that
has not changed. That is worth having for a list endpoint a client polls.

The `W/` prefix means weak: the hash is of the bytes as sent, and two responses with the same meaning but different
whitespace have different tags. It is the right strength for JSON, where the exact bytes are what a client compares.

## The catch worth knowing

```ts
await fetch(url, { headers: { "if-none-match": etag } });
```

That line does not send the header. The Fetch specification lists `If-None-Match` as a forbidden request header, and a
browser or a Node fetch implementation silently drops it, so a test written this way always sees a 200 and looks like the
server is broken. A raw client does send it:

```ts
import { request } from "node:http";
```

```text
with the etag    -> 304
etag, no W/      -> 304
etag and no-cache -> 200
```

Three results, three facts. A strong tag also matches a weak one. And a request carrying `Cache-Control: no-cache` gets a
fresh 200 whatever the tag says, because that header means "revalidate, do not trust your copy", which is the escape hatch a
client uses after a write.

The lesson for testing is to reach for `http.request` or `curl` when the subject is a conditional request, and to remember
that the 304 a browser produces usually comes from its own cache rather than from code you can write.

## An ETag is only useful if the body is stable

```bash
curl -s -D - -o /dev/null http://localhost:3000/health | grep -i etag
sleep 2
curl -s -D - -o /dev/null http://localhost:3000/health | grep -i etag
```

```text
ETag: W/"22-EVUajpF+8W5DOGvEC80rSlJgfyI"
ETag: W/"22-wjgJowBB4IynG2kiiWOEq/7AaqM"
```

The health endpoint returns its uptime in seconds, so every response is a different body and every ETag is new. A client can
never match one, so the header costs bytes and buys nothing, and a `Cache-Control` on that route would be a lie.

The rule that follows: a response that embeds a timestamp, a random value or a counter is a response that cannot be cached,
and the honest thing is to say so rather than let the framework set a tag nobody can use.

## Cache-Control, the header that decides

```ts
response.set("Cache-Control", "public, max-age=60");
```

| Directive | Means |
| --- | --- |
| `public` | any cache may keep it, including a shared one |
| `private` | only the client's own cache |
| `no-store` | do not write it to disk or memory at all |
| `no-cache` | store it, but revalidate before every use |
| `max-age=60` | it is fresh for a minute, with no request at all |
| `must-revalidate` | after it goes stale, do not serve it without asking |
| `s-maxage=600` | a different, usually longer, life for a shared cache |

Three shapes cover almost every API response:

```ts
response.set("Cache-Control", "public, max-age=60");            // a public catalogue
response.set("Cache-Control", "private, no-store");             // anything about a signed-in person
response.set("Cache-Control", "private, max-age=0, must-revalidate");  // a resource that changes
```

The middle one is the important habit. A response that contains somebody's data must not go into a shared cache, and the
failure is quiet: an office full of people behind one proxy starts seeing each other's responses. `private, no-store` is the
default for anything derived from a token.

## Where caching already happens without you

```ts
app.use(express.static("public", { maxAge: "1h" }));
```

Static assets get a `Cache-Control` and an ETag from that line, which is the caching most APIs need and the part that is easy
to forget when the assets move behind a build tool. The pattern to copy: a filename with a content hash in it can be cached
for a year, because a new build produces a new name.

| Response | Cache-Control |
| --- | --- |
| a hashed asset | `public, max-age=31536000, immutable` |
| an unhashed asset | `public, max-age=3600` |
| an HTML page | `public, max-age=0, must-revalidate` |
| an API list, public | `public, max-age=60` |
| an API resource, personal | `private, no-store` |

## Check yourself

Ask for the catalogue with `curl -i`, keep the ETag, and send it back as `If-None-Match` to read the 304. Then add a
`Cache-Control: private, no-store` to a route that returns a signed-in user's data and confirm the header in the response, and
finally make the health endpoint return a fixed uptime and watch its ETag stop changing.
