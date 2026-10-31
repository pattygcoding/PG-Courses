---
title: Cookies and headers
summary: Request data is a promise, it cannot be read inside a cached scope, and writing a cookie re-renders.
chapter: Mutations
minutes: 13
status: draft
---

## Reading a cookie

```ts
import "server-only";

import { cookies } from "next/headers";

/** The cookie that says a librarian is at the desk. */
export const DESK_COOKIE = "desk";

export async function isDeskOpen(): Promise<boolean> {
  const store = await cookies();

  return store.get(DESK_COOKIE)?.value === "open";
}
```

`cookies()` returns a promise, like `params` and `searchParams`, and the store has `get`, `set`, `delete` and `has`.
Reading request data is what makes a route dynamic: the moment a page calls this, the framework knows the render depends on
the request.

The file is a module the whole application imports, and it starts with `server-only`, which is what stops it from being
imported into a client component by accident.

## Writing one

```ts
export async function setDeskAction(open: boolean): Promise<void> {
  const store = await cookies();

  if (open) {
    store.set(DESK_COOKIE, "open", { httpOnly: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
  } else {
    store.delete(DESK_COOKIE);
  }

  revalidatePath("/loans");
}
```

A cookie may only be written from a Server Action or a Route Handler, because it is part of the response and a render does not
own the response. Writing one from a server component throws, and the message says which context it wanted.

The options are worth setting deliberately:

| Option | Why |
| --- | --- |
| `httpOnly` | the browser's JavaScript cannot read it, which is what you want for anything that grants a permission |
| `sameSite` | `lax` lets a top-level navigation send it and blocks most cross-site requests |
| `path` | `/` for a cookie the whole application shares |
| `maxAge` | a desk that closes itself at the end of the shift |
| `secure` | in production, so the cookie is only sent over HTTPS |

Next.js re-renders the current page after a cookie write, which is why the desk button flips in the same roundtrip with no
client state:

```text
before  [ Open the desk ]
click   the action sets desk=open and revalidates /loans
after   [ Close the desk ]
```

## Request data inside a cached scope

This is the rule to carry from the caching chapter into this one: a cached function cannot read a cookie or a header.

```ts
"use cache";
cacheLife("hours");

const store = await cookies();   // this is the mistake
```

The reason is the cache key. An entry is shared by everybody, and a cookie is different for everybody, so an entry built from
one visitor's cookie would be served to the next visitor. The docs' recommended pattern is to read the value outside and pass
it in:

```ts
// in the page, or in the component above
const theme = (await cookies()).get("theme")?.value ?? "dark";

// in the cached function
export async function getCatalogue(theme: string) {
  "use cache";
  // theme is now part of the cache key, so each theme has its own entry
}
```

There is a third option for session-specific data that cannot be refactored this way: the `'use cache: private'` directive
caches it per session rather than in the shared store. It is the escape hatch, and it is better to pass a value when you can.

## Headers

```ts
import { headers } from "next/headers";

const list = await headers();
const agent = list.get("user-agent");
const forwarded = list.get("x-forwarded-for");
```

Headers are a promise for the same reason, and the rules are the same: reading one makes the route dynamic, and none of them
may be read inside a cached scope.

Two uses come up more than the rest. The first is language, where the header is a preference rather than a decision and the
answer is usually a `Vary` header so a CDN does not serve one visitor's page to another. The second is anything a proxy added,
which in this application is a header the proxy sets:

```ts
response.headers.set("x-northside-proxy", "1");
```

## The rest of the request APIs

| API | Use |
| --- | --- |
| `cookies()` | read and write a cookie |
| `headers()` | read a request header |
| `draftMode()` | turn on preview mode for content before it is published |
| `connection()` | wait until a request is really here, rather than a build |
| `userAgent()` | a parsed user agent, when you need one |

`connection()` is the odd one and worth knowing for one specific job. It tells the framework "this code must only run at
request time", which is what you reach for when a component has to opt out of a prerender without reading anything:

```ts
import { connection } from "next/server";

await connection();
```

The metadata warning from the streaming chapter names it as the fix for a marker component inside a boundary, and that is
exactly its purpose: a deliberate, visible way to say "not at build time".

## Dynamic on purpose

Every one of these APIs has the same effect, and it is worth restating it as a design decision rather than a side effect:
reading the request makes a route dynamic, and the framework will refuse to prerender a route that reads it outside a
`Suspense` boundary. That refusal is the feature. A page that quietly became dynamic because somebody added a cookie read is
the bug it prevents.

## Check yourself

Add a `theme` cookie that the root layout reads, and put the theme on `<html className>`. Then open the page in two browsers
with different themes and confirm both are right, and explain what would have happened if the layout had read the cookie
inside a cached function.
