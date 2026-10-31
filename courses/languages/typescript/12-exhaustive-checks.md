---
title: Exhaustive checks
summary: Making the compiler tell you every place a new union member has to be handled.
chapter: Types and narrowing
minutes: 13
status: draft
---

## A discriminated union

```ts
type Event =
  | { kind: 'started'; id: number }
  | { kind: 'finished'; id: number; ok: boolean }
  | { kind: 'skipped' };
```

Every member carries a literal property with the same name and a different value. That property is the discriminant, and
it is what lets the compiler narrow a union of shapes and what makes an exhaustive check possible.

The name does not have to be `kind`; the pattern needs the same property name with a literal type on every member.

## The switch reports a missing arm

```ts
function describe(event: Event): string {
  switch (event.kind) {
    case 'started':
      return `started ${event.id}`;
    case 'finished':
      return event.ok ? 'finished' : 'failed';
  }
}
```

```text
error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

The missing member is not named, which is the weakness of this version: the compiler knows the function can fall through
the switch and says so, without saying which case is absent. Adding `noImplicitReturns` to the configuration makes the
same situation report as a missing return rather than an implicit `undefined`.

## The never binding names it

```ts
function assertNever(value: never): never {
  throw new Error(`unhandled case: ${JSON.stringify(value)}`);
}

function describe(event: Event): string {
  switch (event.kind) {
    case 'started':
      return `started ${event.id}`;
    case 'finished':
      return event.ok ? 'finished' : 'failed';
    case 'skipped':
      return 'skipped';
    default:
      return assertNever(event);
  }
}
```

`assertNever` takes a value of type `never`, so the `default` arm only compiles while every member has been handled. Add
a member to `Event` and the `default` arm stops compiling with a message naming the type that got through:

```text
error TS2345: Argument of type '{ kind: 'retried'; }' is not assignable to parameter of type 'never'.
```

That is the version worth having, because the failure is at the switch that forgot the new case rather than at the call
site that passed it.

## A default that returns something hides the member

```ts
function describe(event: Event): string {
  switch (event.kind) {
    case 'started':
      return `started ${event.id}`;
    default:
      return 'unknown';
  }
}
```

That compiles for ever. A new member is handled by the default, the function returns a string that is wrong, and nothing
reports it. A `default` arm is a decision to stop being exhaustive, and it should be a deliberate one.

The same trap comes from an optional chain returning a fallback or a `?? 'unknown'` at the end, which is why a check
like that is worth questioning in a switch over a closed set.

## A map keyed by the discriminant

```ts
const VOLUME: Record<Event['kind'], number> = {
  started: 0,
  finished: 10,
  skipped: 1,
};
```

A `Record` over the discriminant requires every key, so a missing member is an error at the map:

```text
error TS2741: Property 'skipped' is missing in type '{ started: number; finished: number; }'
but required in type 'Record<"started" | "finished" | "skipped", number>'.
```

That message names the missing key, which the switch version does not. Where the handlers are all the same shape, a map
is the better structure: it is exhaustive, it names what is missing, and a lookup replaces the switch.

```ts
function handle(event: Event): number {
  return VOLUME[event.kind];
}
```

For handlers that take different shapes, keep the switch and the `assertNever`.

## Exhaustiveness without a switch

```ts
function volume(level: Level): number {
  if (level === 'quiet') {
    return 0;
  }

  if (level === 'loud') {
    return 10;
  }

  const unreachable: never = level;
  return unreachable;
}
```

A binding to `never` works anywhere the compiler can see that the remaining type is empty, which makes it usable with an
`if` chain, a ternary or a lookup. The trick is the assignment: if anything is left in the type, it does not compile, and
the message names the member that got through.

```text
error TS2322: Type '"loud"' is not assignable to type 'never'.
```

## Where to put the check

- On any function that turns a closed set into a value, which is where a new member has to be thought about.
- On the boundary that converts an external value into a union, so a new member of the external set is noticed.
- Not on the place that only reads a discriminant, where a missing case is a value to skip rather than a decision.

Where a union has a sensible fallback, `?? 'unknown'` is honest and the `never` binding is noise. Where every member
needs a decision, the binding is the thing that stops a silent default.

## Check yourself

Write a discriminated union with three members, a switch over it with an `assertNever` in the default, and a
`Record<Kind, ...>` map of the same cases. Add a fourth member and read every error the compiler reports, then write out
which files each one names.
