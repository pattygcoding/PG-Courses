---
title: Typesafe configuration
summary: The environment as unknown, one parse at startup, and a config object the rest of the program can trust.
chapter: Working with the ecosystem
minutes: 12
status: draft
---

## The environment is untyped

```ts
const url = process.env.DATABASE_URL;
```

`url` is `string | undefined`, which is honest: an environment variable that was not set is absent, and there is nothing
in the type system that could know which ones a deployment provides. Every read needs a check, and the checks are spread
through the code that reads them.

```ts
connect(process.env.DATABASE_URL);
```

```text
error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
```

That error is the correct answer and it is annoying in the right way: the value might be missing and nobody has decided
what to do about it.

## Parse once at startup

```ts
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const env = EnvSchema.parse(process.env);
```

One parse at startup turns an unknown record into a typed object, and the process fails immediately with a message naming
the variable that is missing or wrong. That failure at startup is the important part: a configuration mistake becomes a
crash on deploy rather than an `undefined` that appears three hours later under load.

`z.coerce.number()` is doing a real job there: an environment variable is always a string, so `PORT` arrives as `'3000'`
and the schema converts it. Every value from the environment needs that treatment, and forgetting it is the most common
configuration bug in a Node service.

## The config module

```ts
export type Config = {
  databaseUrl: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
};

export const config: Config = {
  databaseUrl: env.DATABASE_URL,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,
};
```

The rest of the program imports `config` and reads `config.port` as a `number`. Nothing else touches `process.env`, the
mapping from a snake case variable to a camel case property happens in one file, and the `Config` type is the thing to
inject in a test.

```ts
function createApp(config: Config): App { }
```

A function that takes the config rather than importing it is the version that a test can drive with a value, which is the
dependency injection lesson applied to configuration. The module-level `config` export is convenient and it makes the
module harder to test, so the two are worth using together: the module exports the parsed object for the application and
the type for anything that should take one.

## Documenting the environment

```ts
export { };

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      PORT: string;
    }
  }
}
```

That augmentation makes `process.env.DATABASE_URL` a `string`, which removes the `| undefined` and is a claim the compiler
cannot check. It is worth doing on top of a schema rather than instead of one: the schema is what makes the claim true, and
the augmentation is what stops the rest of the program from re-checking it. Without the schema, the augmentation is a
promise that a missing variable will produce an `undefined` where the type says `string`.

The nesting matters. In a `.d.ts` file that is an ambient declaration, a bare `declare namespace NodeJS` block works:

```ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
  }
}
```

Inside a module, the same block does nothing at all, because a namespace declared in a module is scoped to that module
rather than merged into the global one. It has to be inside `declare global`, which is the form at the top of this section.
The symptom of getting it wrong is the easiest thing in this lesson to miss: the augmentation compiles, the property stays
`string | undefined`, and nothing reports a problem. Hovering `process.env.DATABASE_URL` is how to confirm which form you
have.

## Feature flags

```ts
const FlagsSchema = z.object({
  NEW_IMPORT: z.enum(['on', 'off']).default('off'),
});

type Flags = { newImport: boolean };
```

A flag is a configuration value like any other, and the honest part is the default: a flag that defaults to off is the
version that can be deployed before the code behind it is ready. Reading a flag with `process.env.NEW_IMPORT === 'true'`
is the pattern to avoid, because a typo in the value is a silent off and the type is a `boolean` either way.

## Secrets

A parsed config object is the wrong place for a secret in one specific sense: it is a value that ends up in a log line or
an error report. The type system cannot help with that, and the habit that does is a separate loader for secrets with a
redacting `toJSON` and a rule that a config object is never logged whole. That is a real risk in a service that logs its
configuration at startup, which is a common and otherwise useful habit.

## Check yourself

Write a schema for three environment variables including a number and a default, parse `process.env` at startup, and export
a typed config object. Then remove one variable and read the failure message.
