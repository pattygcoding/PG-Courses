---
title: Creating an application
summary: One command, eleven files, and the two options that decide what is static.
chapter: Getting started
minutes: 14
status: draft
---

## The command

```bash
npx create-next-app@latest pg-nextjs-verify --ts --app --no-tailwind --eslint --import-alias "@/*" --use-npm
```

The flags worth knowing:

| Flag | Does |
| --- | --- |
| `--ts` / `--js` | TypeScript or JavaScript, TypeScript by default |
| `--app` | the App Router, which is what this course uses |
| `--tailwind` | Tailwind, on by default; `--no-tailwind` leaves plain CSS |
| `--eslint` / `--biome` | which linter to configure |
| `--src-dir` | put the code under `src/`, which is optional and off by default |
| `--cache-components` | Cache Components; on by default in the generated config |
| `--react-compiler` | the React Compiler, off by default |
| `--empty` | skip the starter page |
| `--agents-md` | write an AGENTS.md pointing at version-matched docs |

An application with no Tailwind and no `src/` keeps the lessons about Next.js, and it is the smaller tree to read.

## What it writes

```text
.gitignore
eslint.config.mjs
next-env.d.ts
next.config.ts
package.json
package-lock.json
README.md
tsconfig.json
app/favicon.ico
app/globals.css
app/layout.tsx
app/page.tsx
app/page.module.css
public/file.svg
public/globe.svg
public/next.svg
public/vercel.svg
public/window.svg
```

Eleven files matter, in three groups:

| File | Why it is there |
| --- | --- |
| `app/layout.tsx` | the root layout, which wraps every route |
| `app/page.tsx` | the home page, at `/` |
| `app/globals.css` | the stylesheet, imported by the layout |
| `next.config.ts` | the framework's configuration |
| `tsconfig.json` | strict TypeScript, with `@/*` pointing at the project root |
| `eslint.config.mjs` | the flat ESLint config, with `eslint-config-next` |
| `next-env.d.ts` | the types Next.js needs, regenerated on build |
| `package.json` | the four scripts below |

The last command in the scaffold's output is worth noticing:

```text
Generating route types...
✓ Types generated successfully
```

Next.js writes `.next/types/routes.d.ts` before you have written a route. That file is where `PageProps<"/books/[id]">`
comes from, and the TypeScript page later in this course is about what it holds.

## The four scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

`next dev` compiles on demand and reloads the page on a change. `next build` produces the production output, including
the prerendered pages. `next start` serves that output with no compilation step. `eslint` is plain ESLint, because the
`next lint` command was removed in this version.

## The config file

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
```

Two options, and both are on in a new application:

- `cacheComponents` turns on component and function level caching, makes data fetching dynamic by default, and turns on
  Partial Prerendering. It also replaces the older `experimental.ppr`, `experimental.dynamicIO` and `experimental.useCache`
  flags with one switch.
- `partialPrefetching` makes a link's prefetch fetch part of the route rather than all of it, which is what lets a
  navigation paint a shell immediately.

The docs are explicit that `partialPrefetching` should be set rather than left out, because leaving it unset logs a
warning: Cache Components shipped before Partial Prefetching did. Both options are expected to become defaults that need
no configuration in the next major version, which is a good sign that they are the direction rather than an experiment.

An empty `next.config.ts` is also valid, and the caching page later shows what changes when `cacheComponents` is off.

## The first build

```bash
npm run build
```

```text
▲ Next.js 16.4.3 (Turbopack)
✓ Running next.config.ts took 24ms
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 1333ms
  Running TypeScript ...
  Finished TypeScript in 1128ms ...
```

Four things happen in order: the config runs, the framework compiles both sides with Turbopack, TypeScript is checked,
and then the pages that can be prerendered are built. The type check runs as part of the build here, which is why a type
error stops a deploy.

## Two warnings from npm

```text
16 moderate severity vulnerabilities

npm warn install-scripts 1 package has install scripts not yet covered by allowScripts:
npm warn install-scripts   unrs-resolver@1.12.2 (postinstall: node postinstall.js)
```

Read both rather than past them. The audit count is usually a transitive dependency's problem rather than yours, and
`npm audit fix --force` is the command that breaks an application by upgrading something across a major version. The
install-scripts warning is newer npm behaviour: a postinstall script is how a package runs code on your machine, and npm
now asks you to acknowledge which ones do.

## Check yourself

Create an application with the flags above, then run `npm run dev` and open `/`. Find the one file the browser fetched
that contains your component's HTML, and explain why `app/page.tsx` is not in the client bundle you can read.
