---
title: Error modelling
summary: A result type for an expected failure, an exception for a bug, and the union that names what can go wrong.
chapter: Modelling
minutes: 13
status: draft
---

## A thrown error is invisible to the type system

```ts
function parse(text: string): Row[] {
  throw new SyntaxError(`bad text: ${text}`);
}
```

The signature says `Row[]` and says nothing about throwing. A caller has no way to know which failures are possible and
the compiler will not ask, so a failure that should be handled becomes a crash or an ignored promise rejection.

```ts
const rows = parse(text);
```

That compiles and it throws. In a language with checked exceptions the signature would say so; here the type has to carry
it, or the caller has to read the implementation.

## A result type makes the failure part of the contract

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parse(text: string): Result<Row[], ParseError> { }
```

Now the signature says there are two outcomes and the caller has to deal with both, because the value is a union and the
narrowing lesson applies:

```ts
const result = parse(text);

if (!result.ok) {
  return result.error;
}

return result.value.length;
```

Reading `result.value` before checking `ok` is an error, which is the entire benefit: the branch that handles the failure
cannot be forgotten.

## A union of named failures

```ts
type ParseError =
  | { kind: 'empty' }
  | { kind: 'line'; line: number; text: string }
  | { kind: 'too-many-rows'; count: number };
```

A discriminated union of the ways a function can fail is what a caller needs and what an `Error` subclass hierarchy cannot
express as tightly. A switch over `kind` is exhaustive, so the handler has to decide about every failure, and a new failure
kind is a compile error in every handler.

```ts
function describe(error: ParseError): string {
  switch (error.kind) {
    case 'empty':
      return 'the input was empty';
    case 'line':
      return `line ${error.line}: ${error.text}`;
    case 'too-many-rows':
      return `${error.count} rows is too many`;
  }
}
```

The `line` member carries the data the message needs, and the union carries it in the member rather than on the error
object, which is the same illegal-states argument as the modelling lesson.

## Where a result type is the wrong answer

```ts
function add(a: number, b: number): Result<number, never> { }
```

A `Result` whose error type is `never` is a function that cannot fail, and the wrapper is pure noise. The same goes for
arithmetic, a string operation, or any function whose failure would be a bug.

The distinction I use:

- **An expected failure** belongs in the result type. The caller has a sensible response: a form submits with the
  validation errors, an import reports which rows were skipped, a lookup reports that the key is absent.
- **A bug** belongs in an exception. An index out of range, a state that cannot happen, a dependency that is not
  configured. No caller can do anything useful, and the best outcome is a loud failure with a stack.
- **A failure the caller cannot handle** belongs in an exception that documents itself with a class. A connection that
  drops is not something an intermediate function can fix.

The mistake in both directions is common: a `Result` for a bug produces a chain of `if (!result.ok) throw` that converts
it back to an exception, and a thrown error for an expected failure produces a `try` around a call whose failure the
caller was supposed to handle.

## An Error subclass keeps the stack

```ts
export class NotFoundError extends Error {
  override readonly name = 'NotFoundError';

  constructor(readonly key: string) {
    super(`no row for key ${key}`);
  }
}
```

A subclass is what to throw for a failure the caller cannot handle, because it keeps the stack, works with `instanceof`
and is recognised by logging tools. `override readonly name` is worth setting, because the default name is `'Error'` and a
log line that says `Error` for every failure is not useful.

```ts
try {
  await load(key);
} catch (error) {
  if (error instanceof NotFoundError) {
    return null;
  }

  throw error;
}
```

The `instanceof` check narrows, and rethrowing the rest is the pattern for handling one kind of failure and leaving the
others alone. Replacing the error with a new one loses the stack, so where a message needs adding, `cause` is the tool:

```ts
throw new Error(`could not load ${key}`, { cause: error });
```

`cause` chains the original error, and a logger that prints the chain gives the whole story. Losing the original is one of
the two mistakes made most often in a catch block; the other is swallowing it entirely.

## The boundary converts to a union

```ts
function toParseError(error: unknown): ParseError {
  if (error instanceof SyntaxError) {
    return { kind: 'line', line: 0, text: error.message };
  }

  throw error;
}
```

Inside a module, throws; at the boundary, a union. That division keeps the `try` blocks at the edges of the module instead
of in every function, and it means the union of failures a module can produce is written down once. A caller from outside
sees `Result<Row[], ParseError>` and never has to know that a `SyntaxError` was involved.

## Check yourself

Take a function that throws for a failure a caller might handle and convert it to a result type with a union of named
failures. Then write the handler and check that the compiler catches a member you forget.
