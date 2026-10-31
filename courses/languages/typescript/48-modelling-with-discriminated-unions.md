---
title: Modelling with discriminated unions
summary: Making the illegal states unrepresentable, and the cost of the shapes that do it.
chapter: Modelling
minutes: 13
status: draft
---

## A shape that allows too much

```ts
type Response = {
  status: number;
  body?: string;
  error?: string;
};
```

That type accepts a 200 with an error message and a 500 with a body, and it cannot express that a 204 has neither. Every
function that reads it has to check a combination the domain does not allow, and those checks are guesses about which
combinations are real.

```ts
type Response =
  | { status: 200; body: string }
  | { status: 204 }
  | { status: 500; error: string };
```

The union makes the illegal states unrepresentable. A 200 has a body and no error, a 204 has neither, and a 500 has an
error. Nothing has to check a combination that cannot exist, and adding a status means deciding what it carries.

That is the whole technique, and the property to aim for: a type where every value it accepts is a value the program can
handle. The failure it prevents is called an impossible state, and the reason to care is that an impossible state forces a
branch to handle something that cannot happen.

## The discriminant is a literal property

```ts
type State =
  | { kind: 'idle' }
  | { kind: 'loading'; startedAt: number }
  | { kind: 'loaded'; rows: Row[] }
  | { kind: 'failed'; error: Error };
```

Every member has `kind` with a different literal, which is what lets the compiler narrow. The property can be named
anything; the pattern needs the same name with a literal type on every member.

```ts
function message(state: State): string {
  switch (state.kind) {
    case 'idle':
      return 'nothing yet';
    case 'loading':
      return `loading since ${state.startedAt}`;
    case 'loaded':
      return `${state.rows.length} rows`;
    case 'failed':
      return state.error.message;
  }
}
```

Inside each arm the compiler knows the whole shape, so `state.rows` is reachable in the `loaded` arm and not before. An
exhaustive check with `assertNever` is worth adding here, because a new state is a case each function has to decide
about.

## The alternative and its cost

```ts
type State = {
  loading: boolean;
  rows: Row[];
  error: Error | null;
};
```

That is the flag-based version of the same thing, and it is what most code starts as. It accepts `loading: true` with an
error and a full set of rows, so every reader has to decide what to do about a combination nobody intended. The union
removes the question.

The cost of the union is at the construction site:

```ts
function load(): State {
  return { kind: 'loading', startedAt: Date.now() };
}
```

Each return has to name its discriminant, which is one more word than the flag version and the place the guarantee comes
from. A helper per state is usually worth having:

```ts
const loading = (startedAt: number): State => ({ kind: 'loading', startedAt });
const failed = (error: Error): State => ({ kind: 'failed', error });
```

Those two lines keep the construction readable and put each shape in one place.

## Nested unions

```ts
type Payment =
  | { method: 'card'; last4: string; brand: 'visa' | 'mastercard' }
  | { method: 'transfer'; iban: string }
  | { method: 'credit'; accountId: string };

type Order =
  | { kind: 'draft' }
  | { kind: 'placed'; payment: Payment }
  | { kind: 'shipped'; tracking: string };
```

A union can hold another union, and a switch over the outer discriminant narrows to the inner one. That is how a nested
domain is modelled: one union per level, each with its own discriminant, and the compiler tracks them together.

It also shows where a model gets too big. A union of six with a nested union of six is thirty six shapes, and no reader
holds that in their head. Splitting it into two functions with a narrower input each is usually the answer.

## A handler map per member

```ts
const HANDLERS: Record<State['kind'], (state: State) => string> = {
  idle: () => 'nothing yet',
  loading: (state) => `loading since ${state.startedAt}`,
  loaded: (state) => `${state.rows.length} rows`,
  failed: (state) => state.error.message,
};
```

The `Record` over the discriminant requires every key, so a new state is an error at the map with the missing key named.
The parameter type is the whole union in each handler, which means each one has to narrow again, and that is the cost of
this shape.

Where the handlers need their member's shape without a check, a mapped type fixes it:

```ts
type Handlers = {
  [K in State['kind']]: (state: Extract<State, { kind: K }>) => string;
};
```

`Extract<State, { kind: K }>` picks the member matching the key, so each handler gets its own shape and no narrowing is
needed inside it. That is a mapped type over the discriminant, and it is worth the ceremony for a state machine with real
behaviour per state, which is the next lesson.

## Where a union is the wrong model

- **A shape with twenty optional fields.** A union of twenty members is unreadable and a reader cannot tell which
  combinations are real. An options object with documented combinations is more honest.
- **A value from a system you do not control.** Modelling a JSON document as a union implies the document cannot be any
  other shape, and nothing has checked that. That is the subject of the boundary lesson after this one.
- **A genuinely open shape.** A table of custom fields is a `Record<string, unknown>` with a validation step. A union of
  the known fields is a claim that no others exist.

The union is a claim about the domain. It is worth making where the claim is true and worth avoiding where it is a guess.

## Check yourself

Take a type with a boolean flag and one or two optional properties and rewrite it as a discriminated union. Count the
branches that disappear in the code that reads it, then write a constructor function per member and check that the illegal
combinations are gone.
