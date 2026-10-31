---
title: The proxy
summary: Code that runs before any route does, why it is the last resort, and what it is good for.
chapter: The app around the pages
minutes: 13
status: draft
---

## A new name for a known feature

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/catalogue") {
    const url = request.nextUrl.clone();
    url.pathname = "/books";

    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  response.headers.set("x-northside-proxy", "1");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image).*)"],
};
```

`proxy.ts` sits at the project root, beside `app/`, and its function runs before anything is routed. In version 16 the file
and the function were both renamed: what was `middleware.ts` exporting `middleware` is now `proxy.ts` exporting `proxy`, and
the codemod `npx @next/codemod@canary middleware-to-proxy` does the rename.

Two changes matter more than the name. The proxy runs on the Node.js runtime by default, where the old middleware defaulted
to Edge, and it is meant to be deployed to a CDN in front of the application, which is why the docs say not to rely on shared
modules or globals inside it.

## The conditions in the two functions

The first function in that file is a redirect, and the second adds a header to every response. Both are verified with `curl`:

```bash
curl -s -i http://localhost:3000/catalogue | head -3
```

```text
HTTP/1.1 308 Permanent Redirect
location: /books
```

```bash
curl -s -i http://localhost:3000/about | grep x-northside
```

```text
x-northside-proxy: 1
```

A 308 rather than a 307 or a 302 because the move is permanent: the old URL should be forgotten by anything that follows it,
and a permanent redirect is what tells a crawler to update its index.

## The matcher

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|opengraph-image).*)"],
};
```

Without a matcher the proxy runs on every request, including the ones for the stylesheet, the JavaScript and the images. A
redirect or a check in there would then break the assets the page needs to render at all, which is the classic version of
this mistake: the login page redirects to itself forever because its own CSS is being treated as a protected page.

The expression above is a negative lookahead: everything except the framework's static paths. Writing it as an allow list is
the other approach and is easier to read when there are only a few paths to protect:

```ts
export const config = { matcher: ["/loans/:path*", "/api/:path*"] };
```

## What it is for

| Use | Why the proxy is the right place |
| --- | --- |
| an old URL that must keep working | it happens before the router, so it is cheap |
| a bulk redirect from a path prefix | one rule for a thousand URLs |
| a header a downstream service needs | it applies to every response |
| a geolocation or A/B route | the decision is about the request, not the page |
| a cheap rejection of an unauthenticated request | the expensive render never starts |

That is a real list, and it is shorter than most applications' use of middleware. The docs are direct about the reason: the
proxy discourages better designs. An authentication check that belongs beside the data it protects is a check that a future
route handler cannot forget.

## What it should not do

```ts
// the shape to avoid
export function proxy(request: NextRequest) {
  const token = request.cookies.get("session");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

That reads like a session check and is not one, for two reasons.

It runs everywhere, so an API route behind it is protected by the presence of a cookie rather than by a permission, and a
forged cookie is a cookie. And it cannot rely on the database or on the modules the application uses, because it may run
outside the application entirely. A `fetch` in there is also on the path of every request, before anything useful has
happened.

The version that holds up: the proxy redirects a request with no cookie at all, because that is a cheap and honest
optimisation, and every page and route handler that reads protected data checks the permission itself. The checking belongs
where the data is, and the redirect is a courtesy.

## Reading the result

Two signals confirm the file is live. The build output lists it:

```text
ƒ Proxy (Middleware)
```

and every response carries the header the function set:

```bash
curl -s -D - http://localhost:3000/ -o NUL | grep -i x-northside
```

```text
x-northside-proxy: 1
```

The header is the cheap check to put in an application whose proxy is doing something subtler: it proves the file ran, even
when the visible behaviour is unchanged.

## Check yourself

Add a proxy rule that redirects `/catalog` and `/books/` (with the trailing slash) to `/books`, then check both with `curl -i`
and confirm the status codes. Then move the rule into a `next.config.ts` redirect instead and say which of the two you would
keep, and why.
