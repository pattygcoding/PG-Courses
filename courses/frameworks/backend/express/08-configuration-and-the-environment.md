---
title: Configuration and the environment
summary: One schema for the environment, checked at startup, so a missing value stops the process rather than a request.
chapter: Middleware and the app
minutes: 13
status: draft
---

## The problem with process.env

```ts
const port = Number(process.env.PORT ?? 3000);
const secret = process.env.AUTH_SECRET;
```

`process.env` gives you strings or nothing, everywhere, forever. Nothing says which values the application needs, a typo in a
name produces `undefined` at the line that uses it, and a missing secret is discovered by the first request that tries to
sign a token. The failure arrives in production, at the worst time, with a stack trace that points at the wrong file.

## One schema, parsed once

```ts
import { z } from "zod";

const Schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_PATH: z.string().min(1).default("data/library.db"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  AUTH_SECRET: z.string().min(16).default("development-secret-change-me"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  UPLOAD_DIR: z.string().min(1).default("uploads"),
});

export type Config = z.infer<typeof Schema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const result = Schema.safeParse(environment);

  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Invalid configuration:\n${problems}`);
  }

  return result.data;
}
```

The schema is the documentation. Reading it answers what the application needs, which values have defaults, and what shape
each one has, in one screen rather than across twenty files.

Three details are worth copying:

| Detail | Why |
| --- | --- |
| `z.coerce.number()` | the environment gives strings, and `PORT=3000` should be a number |
| defaults with a `min()` | a value absent in production and present in development is a decision, written down |
| the parameter defaulting to `process.env` | a test passes its own object and never touches the real environment |

That last line is the one that pays for itself. The test helper in this project builds a whole application with its own
configuration, and the reason it can is that `loadConfig` reads the object it was handed.

## It fails at startup

```ts
loadConfig({ PORT: "seven", NODE_ENV: "staging", AUTH_SECRET: "short" });
```

```text
Invalid configuration:
  NODE_ENV: Invalid option: expected one of "development"|"test"|"production"
  PORT: Invalid input: expected number, received NaN
  AUTH_SECRET: Too small: expected string to have >=16 characters
```

Every problem at once, with the name of the value as the environment spells it. The process exits before the port is bound,
which means a bad deploy fails a health check rather than serving errors.

The alternative, checking lazily at the point of use, spreads the same three problems across three requests and three stack
traces. Fail fast is cheaper to write and much cheaper to debug.

## Development, test, production

```ts
NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
```

One value, three behaviours worth naming:

| Environment | What changes |
| --- | --- |
| development | readable logs, seed data on boot, errors with detail |
| test | an in-memory database, a silent logger, no rate limit |
| production | JSON logs, a secret from the platform, no seed |

The temptation is a boolean such as `isProduction` scattered around. A name for the current environment and a comparison
where it matters is the same thing with fewer places to be wrong, and the enum means a typo like `"staging"` fails the
schema rather than silently behaving like development.

## Secrets, and where they live

| Where | Suitable for |
| --- | --- |
| a `.env` file, ignored by git | a laptop, and nothing else |
| the platform's environment | production |
| a secret manager, read at boot | production, when rotation matters |

A `.env` file that is committed is a secret published. The file to commit is `.env.example`, with the names and no values,
because the schema already says what is required and an example says what to call it.

Two rules that prevent most leaks:

- a value that signs, encrypts or grants access is never sent to a client and never logged;
- an endpoint that echoes the environment it runs in is a debugging tool, not a feature.

## The engines field

```json
"engines": { "node": ">=24" }
```

`node:sqlite` needs Node 24 to run without a flag, so the version is a real requirement of this application rather than a
preference. The field does not enforce itself on every platform, and it is still worth writing: it documents the floor, and
several hosts read it and refuse a Node version below it.

## Check yourself

Add a configuration value with no default, then start the application with it unset and read the error. Then write the same
value into the test helper and run the suite, which is the version that proves the schema is the only place the environment
is read.
