---
title: Creating a project
summary: Node 24, TypeScript without a build step in development, and why the imports end in .js.
chapter: Getting started
minutes: 14
status: draft
---

## The install

```bash
mkdir library-api && cd library-api
npm init -y
npm install express@5 zod helmet cors express-rate-limit multer pino
npm install -D typescript tsx vitest supertest @types/express @types/node @types/supertest @types/cors @types/multer
```

```text
added 84 packages, and audited 85 packages in 3s
found 0 vulnerabilities
```

Two things in that output are worth a moment. Seven runtime dependencies is the whole framework plus five decisions, and the
audit is clean, which is normal for this stack rather than luck.

The versions this course was written against:

| Package | Version | Why it is here |
| --- | --- | --- |
| `express` | 5.3.0 | the router and the middleware chain |
| `zod` | 4.6.7 | schemas for request bodies and query strings |
| `helmet` | 8.3.0 | the security headers |
| `cors` | 2.8.6 | cross-origin requests |
| `express-rate-limit` | 8.7.2 | the sign-in limit |
| `multer` | 2.5.0 | multipart uploads |
| `pino` | 10.4.0 | structured logs |

`typescript` resolves to 7.0.2, which is the native compiler. It is faster and it checks the same programs, so nothing in
this course depends on which implementation you have.

## Three config files

```json
{
  "name": "library-api",
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src", "test", "vitest.config.ts"]
}
```

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "noEmit": false, "outDir": "dist", "rootDir": "src", "sourceMap": true },
  "include": ["src"]
}
```

Four choices in there are deliberate:

- **`"type": "module"`** makes the project ESM, so `import` works the way the language now expects and the top-level `await`
  in a script is legal.
- **`module: "nodenext"`** makes TypeScript resolve imports the way Node actually does, including the file extension rule
  below.
- **Two tsconfigs**, because the tests are typechecked but must not be compiled into `dist`. `npm run typecheck` checks
  everything; `npm run build` compiles `src` alone.
- **`noUncheckedIndexedAccess`** turns `rows[0]` into `T | undefined`, which is what stops a handler from crashing on an
  empty result set.

## Why the imports end in .js

In a Node ESM project, an import has to name the file that will exist at run time:

```ts
import { createApp } from "./app.js";
```

The file on disk is `app.ts`, and the import says `app.js`, which looks wrong and is not. TypeScript compiles `app.ts` to
`app.js`, so the specifier is correct in the output and stays correct when the tests import the source through `tsx`.

The mistake to make once is to run the source with Node directly:

```bash
node src/server.ts
```

```text
node:internal/modules/esm/resolve:272
    throw new ERR_MODULE_NOT_FOUND(
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/app.js' imported from '.../src/server.ts'
```

Node strips the types out of a `.ts` file, and it does not rewrite the specifier to a file that does not exist. That is why
development runs through `tsx`, which does resolve `./app.js` to `./app.ts`, and production runs the compiled `dist`
directory where the specifier was right all along.

## The folder layout

```text
src/
  app.ts                     createApp, and nothing about ports
  server.ts                  config, the database, listen, shutdown
  config.ts                  the environment, parsed
  errors.ts                  error classes and the problem document
  logger.ts                  pino, and the request id
  db.ts                      the schema, the seed, and the connection
  http.ts                    helpers for reading a request
  lifecycle.ts               one shutdown path
  repositories/              books.ts, loans.ts
  middleware/                validate.ts, require-role.ts, error-handler.ts
  routes/                    books.ts, loans.ts, auth.ts, health.ts, uploads.ts
test/                        one file per area, plus helpers.ts
```

The split that carries the most weight is `app.ts` against `server.ts`. `createApp` builds the application and never calls
`listen`, so a test can hand it to supertest and make requests without a port. `server.ts` is the only file that knows about
the environment, the database file and signals, and it is the file nothing imports.

## Check yourself

Create the project, add a `src/server.ts` that logs one line, then run it three ways: `npm run dev`, `node src/server.ts`
and `npm run build && npm start`. Record which of the three works and why, then check `dist` has a `.js` file beside every
`.ts` file you wrote.
