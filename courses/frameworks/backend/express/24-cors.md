---
title: CORS
summary: Why a browser blocks a cross-origin request, what a preflight is, and the wildcard that cannot be combined.
chapter: API concerns
minutes: 13
status: draft
---

## The browser is the enforcer

```text
an HTML page on https://shop.example.com
  calls fetch("https://library.example.com/books")
```

That request is cross-origin, and the browser sends it only if the response says the page is allowed to read the answer. The
server does not enforce anything: CORS is a set of response headers that tell a browser what to permit, which is why `curl`
never notices and why "it works in Postman" is the most common sentence in a CORS conversation.

The algorithm is two requests for anything unusual:

```text
OPTIONS /books                          the preflight, sent before the real one
Access-Control-Request-Method: POST
Origin: https://shop.example.com

HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://shop.example.com
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE
Access-Control-Allow-Credentials: true
Vary: Origin, Access-Control-Request-Headers
```

Then the browser sends the `POST` it wanted to send. A simple request, which is a `GET` or a form-shaped `POST` with no
custom headers, skips the preflight and is checked on the response instead.

## One line, and what it means

```ts
app.use(cors({ origin: true, credentials: true }));
```

`origin: true` reflects the requesting origin back in the header, so any site may call the API. `credentials: true` adds the
header that lets a browser send cookies and read the response when it does.

That combination is correct for this application and wrong for most others, because the catalogue is public data and the token
travels in a header rather than a cookie. The version that stops one site from using another's API is an allow list:

```ts
const allowed = new Set(["https://shop.example.com", "https://admin.example.com"]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowed.has(origin)) {
        callback(null, true);

        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
```

The `!origin` branch matters. A request with no `Origin` header is not a browser cross-origin request: it is a server, a
`curl`, or a same-origin call, and refusing it breaks health checks and server-to-server clients while adding no security.

## The wildcard, and the pair that cannot mix

```ts
app.use(cors({ origin: "*", credentials: true }));   // the browser refuses this combination
```

`Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` together would let any site read an authenticated
response from any user who visits it, so the specification forbids the pair. A browser rejects the response, the request fails,
and the error message in the console says so.

| What you want | What to set |
| --- | --- |
| a public API, no cookies | `origin: "*"`, credentials off |
| one known front end, with cookies | that origin, credentials on |
| several known front ends, with cookies | an allow list, credentials on |
| anything with a wildcard and cookies | not possible, and the reason is above |

## Vary, and the caching bug it prevents

```text
Vary: Origin, Access-Control-Request-Headers
```

`Vary` tells a cache that the response depends on a request header, so a response generated for one origin is not served to
another. Without it, a shared cache can hand `Access-Control-Allow-Origin: https://shop.example.com` to a browser on a
different site, which is either a broken request or a permission granted to the wrong place. The middleware sets it for you,
and it is the header to check when a CORS failure appears only behind a CDN.

## Where the middleware goes

```ts
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "64kb" }));
```

Before the routers, so the preflight is answered without reaching a route. The CORS middleware answers `OPTIONS` itself, which
is why an `OPTIONS` request to a route returns 204 with the headers above and never runs a handler.

Two consequences of that position:

- A preflight never carries a body, so it never needs parsing, and answering it early saves a route lookup.
- A CORS failure is not the server refusing anything. The request happened, the database was read, and the browser threw the
  answer away.

## What CORS is not

| Not | Why |
| --- | --- |
| authentication | it decides which page may read a response, not who the caller is |
| a server-side check | a script with `curl` ignores every header it sets |
| protection for a public API | the data is the protection, or the token is |
| a fix for a 404 from an API | a missing `Access-Control-Allow-Origin` and a missing route look similar in a console and are different problems |

The last row is worth keeping in mind, because a CORS error in a browser console is reported for any response the browser
refuses to hand over, including a 500 from a server that never set the headers at all.

## Check yourself

Send a preflight with `curl` and read the headers, then change the allow list to one origin and send a preflight with
another. Then switch to `origin: "*"` with credentials on and find the browser's refusal in the console, which is the one
error message in this lesson that comes from the client.
