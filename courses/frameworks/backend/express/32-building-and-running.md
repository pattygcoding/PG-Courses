---
title: Building and running
summary: Two tsconfigs, one compiled output, and the import extension that makes production work.
chapter: Shipping
minutes: 13
status: draft
---

## Why the build is two commands

```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc -p tsconfig.build.json",
  "start": "node dist/server.js",
  "typecheck": "tsc -p tsconfig.json --noEmit",
  "test": "vitest run"
}
```

In development the source runs directly through `tsx`, which strips types on the fly and restarts the process on a change.
Nothing is written to disk and a type error does not stop the server, which is the right behaviour while editing.

`npm run build` produces the artifact: JavaScript in `dist`, source maps beside it, and the same directory structure the
source had.

```text
dist/
  app.js
  app.js.map
  server.js
  config.js
  db.js
  lifecycle.js
  middleware/
  repositories/
  routes/
```

The two configs exist because `tsc` does two jobs. `tsconfig.json` checks `src` and `test` and writes nothing, and
`tsconfig.build.json` extends it with `noEmit: false`, `outDir: "dist"` and an `include` of `src` alone. A test file that
reached `dist` would be shipped to production, which is the failure the second config prevents.

## The extension that looks wrong

```ts
import { createApp } from "./app.js";     // the file on disk is app.ts
```

That is what makes the compiled output runnable. TypeScript does not rewrite specifiers, so a source import of `./app.ts`
compiles to an import of `./app.ts` in the output, and Node looks for a file that is not there.

```bash
node src/server.ts
```

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../src/app.js' imported from '.../src/server.ts'
```

The reverse mistake, and the reason the development script uses `tsx`. Node 24 strips the types out of a `.ts` file and does
not resolve `./app.js` to `./app.ts`, so the source directory cannot be run by `node` directly. `tsx` can, which is what it is
for, and the compiled `dist` needs no help at all:

```bash
npm run build
node dist/server.js
```

```text
{"level":30,"time":"2026-10-31T15:35:16.440Z","port":3000,"env":"development","msg":"listening"}
```

## NODE_ENV, and what it should change

| Value | Behaviour this project wants |
| --- | --- |
| `development` | readable logs, seed on boot, detail in errors |
| `test` | in-memory database, silent logger, no rate limit |
| `production` | JSON logs, a real secret, no seed, no stack traces to clients |

The value is read through the config schema like everything else, so the wrong spelling fails at startup rather than behaving
like development. Two rules keep it useful: the application behaves one way per value rather than branching on it in twenty
places, and anything that must never happen in production is impossible by construction rather than by a check.

```ts
seed(database, { reset: config.NODE_ENV === "test" });
```

That line is the shape to aim for: the dangerous behaviour is opt-in from the environment that wants it, and production does
the default thing, which is nothing.

## What runs at start

```ts
const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL);
const database = openDatabase(config.DATABASE_PATH);
seed(database, { reset: config.NODE_ENV === "test" });

const app = createApp({ config, database, logger });
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "listening");
});
```

Four steps in an order that matters. The config is parsed first so a bad environment stops before a port is bound. The logger
comes next so everything after it can log. The database is opened and the schema applied, which is what makes the first request
work rather than the first request after a migration script somebody forgot. Then the application is built and the port opens.

The seed and the schema are both "run at boot" here, and both have a production version that is a separate step:

| Development | Production |
| --- | --- |
| schema applied at boot | a migration command in the deploy, before the new process starts |
| seed inserts four books | nothing, or an explicit job against an empty database |

Running migrations at boot in production means every instance races to apply them, and a rollback has to undo a change that
happened in whichever instance started first. The version that holds up is one step in the deploy, before the new image starts
serving.

## The order to check a change in

```bash
npm run typecheck && npm test && npm run build
```

Each command is slower than the last and catches something the previous one cannot. A type error is seconds and never reaches
another developer; a failing test is a minute and never reaches a review; a failing build is the last chance before a deploy,
and in this project it is the same compiler that checked the types a moment earlier, which is the reason `typecheck` and
`build` are separate scripts rather than one.

The habit worth keeping: run the three in that order before pushing, and let the deploy run the same three. A pipeline that
runs different commands from the ones on a laptop is a pipeline that passes while the laptop fails.

## Check yourself

Build the project, run `node dist/server.js`, and make a request to confirm the output works. Then delete a `.js` extension
from one import, run the build, and read what `tsc` says, which is the earlier failure of the same mistake. Finally set
`NODE_ENV=production` locally and find the first thing that stops working without a production secret.
