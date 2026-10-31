---
title: Generic patterns
summary: Four shapes that earn their type parameters, and the point where a generic stops being readable.
chapter: Generics
minutes: 13
status: draft
---

## A result type

```ts
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

function parseRow(text: string): Result<Row, 'empty' | 'malformed'> {
  if (!text) {
    return { ok: false, error: 'empty' };
  }

  return { ok: true, value: { key: text, value: 0 } };
}
```

That is a discriminated union with a generic payload, and it is the pattern for a function whose failure is part of its
contract rather than an exception. The caller switches on `ok`, the compiler narrows, and the failure cases are a union
the caller can be forced to handle.

```ts
const result = parseRow(text);

if (!result.ok) {
  throw new Error(`row could not be parsed: ${result.error}`);
}

console.log(result.value.key);
```

The pattern is worth it where the failure is expected and the caller decides what to do. Where every caller throws, a
thrown exception is shorter, and the JavaScript course makes that argument.

## A typed event map

```ts
type Events = {
  started: { id: number };
  finished: { id: number; ok: boolean };
};

class Emitter<E extends Record<string, unknown>> {
  private handlers = new Map<keyof E, Set<(payload: never) => void>>();

  on<K extends keyof E>(name: K, handler: (payload: E[K]) => void): void {
    const set = this.handlers.get(name) ?? new Set();

    set.add(handler as (payload: never) => void);
    this.handlers.set(name, set);
  }
}
```

Reading the two constrained parameters: `E` is the map of event names to payloads, and `K extends keyof E` means the
name must be one of the events, so `E[K]` is that event's payload type. A handler for `'finished'` gets
`{ id: number; ok: boolean }` and not a union of every payload.

One line in the body needs a cast, because a `Map` cannot express "the value type depends on the key". That is the
standard cost of this pattern: a `Map` field with one line of `as` and a public API that is fully typed.

```ts
emitter.on('finished', ({ id }) => console.log(id));
emitter.on('missing', () => { });
```

```text
error TS2345: Argument of type '"missing"' is not assignable to parameter of type 'keyof Events'.
```

## A table driven lookup

```ts
const PARSERS = {
  csv: (text: string) => text.split(','),
  json: (text: string) => JSON.parse(text) as string[],
} satisfies Record<string, (text: string) => string[]>;

type Format = keyof typeof PARSERS;

function parse(format: Format, text: string): string[] {
  return PARSERS[format](text);
}
```

`keyof typeof PARSERS` is `'csv' | 'json'`, derived from the object, so the format parameter and the table cannot drift.
`satisfies` checks that every value is a function of the right shape while keeping the exact keys, which an annotation
would have widened to `string`.

Adding a format to the table widens `Format` and every caller that needs to handle it is reported. Adding a case to a
`switch` over `Format` without adding it to the table is reported as well. That pair of checks is what makes a
configuration object worth typing carefully.

## A record of functions to a record of results

```ts
type Async = Record<string, () => Promise<unknown>>;

async function runAll<T extends Async>(
  tasks: T,
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const entries = await Promise.all(
    Object.entries(tasks).map(async ([name, task]) => [name, await task()] as const),
  );

  return Object.fromEntries(entries) as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
```

The mapped type in the return position is doing the work: for each key of the input, the result is whatever that
function returns once awaited. Call it with a table of three loaders and the result has three keys with three different
types, with no annotations at the call site.

```ts
const data = await runAll({
  rows: async () => [1, 2],
  name: async () => 'a',
});
```

`data.rows` is `number[]` and `data.name` is `string`. That is a mapped type and a conditional type in one signature,
which is the machinery of the next chapter, and it is the kind of signature a library writes rather than an application.

## Where a generic stops helping

- **One type parameter used once.** It adds noise and tells the caller nothing. Covered in the first generics lesson.
- **Four or more type parameters.** The signature stops fitting on a line and a caller cannot remember the order.
  Grouping them into a single object type is usually the answer.
- **A generic that only exists to pass a name through.** If every function in a chain has the same `<T>` and none of
  them does anything with it, a concrete type or `unknown` is shorter.
- **A signature that needs a comment to explain.** A type that cannot be read at the call site is a type a maintainer
  will change by guesswork.

The honest summary: a generic earns its place when it carries a relationship between two positions, as `first` does, or
when it lets a function work for any type without losing the type, as a wrapper does. Everything else is a type
parameter that costs a reader and returns nothing.

## Check yourself

Write the `Result` type and a function returning it, then narrow it at the call site. Then write the table driven lookup
with `satisfies`, add a key, and read the errors at every place that needed updating.
