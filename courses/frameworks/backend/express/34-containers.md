---
title: Containers
summary: A multi-stage image, a non-root user, and the signal that has to reach the right process.
chapter: Shipping
minutes: 14
status: draft
---

## The image

```dockerfile
# syntax=docker/dockerfile:1

# Build with the whole toolchain, run with none of it.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/library.db
ENV UPLOAD_DIR=/data/uploads

# The database lives on a volume, so a new container keeps the library.
RUN mkdir -p /data && chown -R node:node /data

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
```

Five decisions, and each one is worth the line:

| Line | Why |
| --- | --- |
| two stages | the compiler, the test runner and the types never reach the runtime image |
| `npm ci` | installs from the lockfile exactly, and fails when it and `package.json` disagree |
| `npm prune --omit=dev` | the dev dependencies leave before the second stage copies them |
| `USER node` | the process is not root, so a compromise is contained |
| the exec form `CMD` | node is PID 1 and receives the signals |

The last row is the one that breaks graceful shutdown invisibly. `CMD node dist/server.js` as a shell string runs the command
through `/bin/sh`, so PID 1 is the shell, `SIGTERM` goes to the shell, and node keeps running until the platform's kill timer
runs out. The JSON form makes node the process the platform signals.

The base image is `node:24-alpine`, which is small because it uses musl rather than glibc. That is a real trade: a dependency
with a native build can behave differently there, and where one does, the answer is `node:24-slim` for a few dozen more
megabytes and a familiar platform.

## What is not copied

```text
src/            compiled into dist, and not needed at run time
tests           they ran in CI, and the image is not the place
the .env file   secrets come from the platform
data/           a volume, not an image layer
uploads/        the same
```

A build context that includes those is a slower build and, for the last three, a leaked secret in a layer that a later one
cannot remove. The file that says so is a `.dockerignore` beside the Dockerfile:

```text
node_modules
dist
data
uploads
test
scratch
*.log
.env
```

`node_modules` in particular: copying it in with the source would overwrite what `npm ci` produced with whatever the host
happens to have, which is how a build passes on one machine and fails on another.

## Checking that it is alive

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health/ready').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
```

A health check has to exit non-zero to fail, and it has to use something in the image. `node -e` with `fetch` needs no extra
package, and it points at the readiness route rather than the liveness one, so a container with a broken database is marked
unhealthy rather than restarted forever.

`--start-period` is the grace window before failures count, which stops a slow first start from being killed in a restart
loop. It should be longer than the slowest honest start, which for this application is milliseconds.

## The volume, and the second container

```bash
docker build -t library-api .
docker run -p 3000:3000 -v library-data:/data library-api
```

The volume is what makes the database outlive the container. Without it, every deploy starts with an empty library, and the
seed is the only thing in it.

There is a limit to that, and it is the biggest structural consequence of choosing SQLite:

```text
one container    the volume is the database, and a restart keeps it
two containers   two volumes, two databases, and a load balancer choosing between them
```

The second row is where SQLite stops being the right answer, and the change is smaller than it sounds: a `DATABASE_URL` that
points at PostgreSQL, a driver swap in one file, and the queries stay as they are. The container lesson is where the decision
gets made rather than a detail to discover later.

## What the platform needs

| Setting | Value |
| --- | --- |
| port | whatever `PORT` is set to, which the process reads |
| stop signal | `SIGTERM` |
| stop grace period | longer than the shutdown deadline in the code |
| health check | the readiness route |
| volume | mounted at the data path |
| secrets | environment variables, not the image |

The grace period and the deadline are a pair, and the numbers have to agree: a platform that waits five seconds for a process
that waits ten will kill it mid-drain. Pick the shorter one in the platform and let the code's deadline be the backstop.

## Check yourself

Build the image, run it with a volume, add a book, and restart the container to confirm the book is still there. Then change
the `CMD` to the shell form, send a `SIGTERM` with `docker stop`, and watch the shutdown log never appear, which is the
difference this lesson opened with.
