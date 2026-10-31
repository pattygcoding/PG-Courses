---
title: Building and self-hosting
summary: What next build writes, what standalone needs copied beside it, and the container that runs it.
chapter: Shipping
minutes: 15
status: draft
---

## The build

```bash
npm run build
```

```text
▲ Next.js 16.4.3 (Turbopack)
- Cache Components enabled
- Partial Prefetching enabled

  Creating an optimized production build ...
✓ Compiled successfully in 532ms
  Running TypeScript ...
  Finished TypeScript in 1068ms ...
  Generating static pages using 13 workers (15/15) in 661ms
  Finalizing page optimization ...

Route (app)                           Revalidate  Expire
┌ ◐ /                                         1m      1h
├ ○ /_not-found
├ ○ /about
├ ƒ /api/books
├ ƒ /api/books/[id]
├ ◐ /books
├   /books/[id]
│ ├ ◐ /books/dune                             1h      1d
│ └ ◐ [+2 more paths]
├ ◐ /loans
├ ○ /robots.txt
└ ƒ /sitemap.xml

ƒ Proxy (Middleware)

○  (Static)             prerendered as static content
◐  (Partial Prerender)  prerendered as static HTML with dynamic server-streamed content
ƒ  (Dynamic)            server-rendered on demand
```

That table is the deployment plan. The circles are files on disk that a CDN can serve. The half circles are files plus a
render. The ƒ routes need the server for every request, and the proxy needs wherever the runtime is.

## One thing to stop before you build

```text
Error: EBUSY: resource busy or locked, rmdir 'C:\...\pg-nextjs-verify\.next'
```

The build replaces `.next`, and a running server holds files inside it. On a development machine that is a mystery for about
a minute; in a container it cannot happen, because the build and the run are different stages.

## Two ways to run it

```bash
npm run start        # serves .next, needs node_modules and the project
node .next/standalone/server.js   # serves the same output with only what it needs
```

`next start` is the short answer for a machine that already has the project and its dependencies installed. The standalone
output is for a container, and it is opt-in:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

```text
.next/standalone/
  .next/
  node_modules/
  package.json
  server.js
```

The framework traces every import and copies only the files the server actually needs. In a small application that is a
handful of megabytes instead of the whole dependency tree.

## The two folders it does not copy

`standalone` is the server and its modules, and nothing else. Two things have to be put beside it:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

`server.js` expects both in those positions. Miss the first and every page renders without CSS or JavaScript, which looks like
a broken build rather than a missing copy. Miss the second and the images and the favicon are 404s while the pages are fine.

The Dockerfile is where that copy belongs, and it is the whole reason a container needs two lines that a local run does not:

```dockerfile
# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

Five decisions in that file, in order of how much they matter:

| Line | Why |
| --- | --- |
| three stages | the compiler, the type checker and the test tooling never reach the image |
| `npm ci` | installs exactly the lockfile, and fails when `package.json` and the lock disagree |
| `HOSTNAME=0.0.0.0` | the default `localhost` is unreachable from outside the container |
| a non-root user | a container that is breached is a container that is not root |
| `node server.js` | no npm in the runtime image, so no npm's overhead per request either |

## Running it

```bash
docker build -t northside-library .
docker run -p 3000:3000 northside-library
```

```text
▲ Next.js 16.4.3
- Local:         http://localhost:3000
- Network:       http://0.0.0.0:3000
✓ Ready in 0ms
```

`Ready in 0ms` is the difference from a development server: there is nothing to compile. The same output appears when the
standalone server is run directly, which is worth doing once before reaching for Docker:

```bash
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

## What the server is not

`next start` and the standalone server are single Node.js processes. They do not load balance, they do not restart after a
crash, and they do not terminate TLS. In a real deployment something in front of them does: a container platform, a reverse
proxy, or a process manager. That process also has to be the one that decides how many instances to run, and that decision has
a consequence this course has already met: the cache and the in-memory data of this application live inside one instance.

## Check yourself

Build the application, run the standalone server, and copy only `.next/standalone` to a clean directory without the two extra
folders. Load a page, write down exactly what is missing, then add the copies back one at a time and say which one fixed what.
