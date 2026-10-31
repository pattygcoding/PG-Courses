---
title: Configuration and environment
summary: A typed config file, where a secret may live, and the file that runs before the server starts.
chapter: The app around the pages
minutes: 12
status: draft
---

## A typed config

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  output: "standalone",
};

export default nextConfig;
```

`next.config.ts` is TypeScript, which means a misspelled option is a type error rather than an option that does nothing. The
three keys are the ones this application needs:

| Option | Effect |
| --- | --- |
| `cacheComponents` | component-level caching, dynamic by default, Partial Prerendering |
| `partialPrefetching` | a prefetch fetches the shell rather than the whole route |
| `output` | `standalone` writes a self-contained server into `.next/standalone` |

Turbopack's own configuration lives in the same file rather than in a separate `turbopack.config.js`, which is the migration
the upgrade codemod performs:

```ts
const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: { underscore: "lodash" },
  },
};
```

Two older options are gone rather than deprecated. `runtime` cannot be set anywhere, because Cache Components requires
Node.js, and the runtime configuration API was removed, so a value that needs to reach the browser is a `NEXT_PUBLIC_`
variable or a prop.

## Environment variables

```bash
NEXT_PUBLIC_SITE_URL=https://library.example.com
DATABASE_URL=postgres://localhost/library
```

Two namespaces, one rule each:

| Prefix | Visible to | Use for |
| --- | --- | --- |
| `NEXT_PUBLIC_` | the browser and the server | a public URL, an analytics id |
| none | the server only | a database URL, an API key, a secret |

```ts
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
```

That is the sitemap's only environment read, and it is the safe kind: a public base URL, inlined at build time, with a
sensible fallback so a build on a laptop works.

The dangerous kind is a secret with the public prefix, which is a mistake that is invisible in code and visible in a bundle.
The check is worth running once per project:

```bash
grep -r "NEXT_PUBLIC_" .next/static | head
```

If a key that grants access appears in that output, it is public, whatever the intent was.

## Files and precedence

| File | Loaded |
| --- | --- |
| `.env` | always |
| `.env.local` | always, and ignored by git |
| `.env.development` | `next dev` |
| `.env.production` | `next build` and `next start` |
| `.env.test` | tests |

`.env.local` wins over the others, which is what makes it the right place for anything on a machine and the wrong place for
anything in a repository. On a platform, the variables are set in the platform and the files are not involved at all.

One consequence of the build-time inlining is worth knowing before it surprises you in a container: a `NEXT_PUBLIC_` value is
baked into the built JavaScript, so changing it needs a rebuild. A server-only variable is read at runtime, so it can change
with a restart. That difference decides where a value belongs.

## instrumentation.ts

```ts
export async function register() {
  // start a tracer, a metrics client, an error reporter
}
```

`instrumentation.ts` at the project root is called once when the server starts, before any request is handled. It is where a
tracing or metrics library is initialised, and it is the honest place for that work, because an import in a page would run it
per render.

It also has a hook for errors, `onRequestError`, which is the one that catches a failure that never reached a boundary.

## The files that are not configuration

Three files in the root look like configuration and are not:

| File | What it is |
| --- | --- |
| `next-env.d.ts` | generated types, regenerated on every build, never edited |
| `.next/` | build output, ignored by git, deleted by a clean build |
| `.next/types/routes.d.ts` | the generated `PageProps`, `LayoutProps` and `RouteContext` |

The third is generated during `next dev`, `next build`, or directly with `next typegen`, which is the command to run when an
editor cannot see a type the build can.

## Check yourself

Add a `NEXT_PUBLIC_` variable and a server-only one, read both in a page, and find each of them in the build output. Then
decide where they belong in a container deployment where the same image runs in two environments, and say what has to change
to switch between them.
