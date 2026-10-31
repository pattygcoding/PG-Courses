---
title: State machines
summary: States, events and transitions as types, and the reducer that cannot be in an impossible state.
chapter: Modelling
minutes: 13
status: draft
---

## A machine is a union of states and a union of events

```ts
type State =
  | { kind: 'idle' }
  | { kind: 'loading'; requestId: number }
  | { kind: 'loaded'; rows: Row[] }
  | { kind: 'failed'; message: string };

type Event =
  | { type: 'fetch' }
  | { type: 'resolve'; rows: Row[] }
  | { type: 'reject'; message: string };
```

Both are discriminated unions, and the transition function takes one of each and returns a state. Nothing about the
machine is a flag, so a transition that does not exist cannot be expressed.

```ts
function transition(state: State, event: Event): State {
  switch (state.kind) {
    case 'idle':
      return event.type === 'fetch' ? { kind: 'loading', requestId: 1 } : state;
    case 'loading':
      if (event.type === 'resolve') return { kind: 'loaded', rows: event.rows };
      if (event.type === 'reject') return { kind: 'failed', message: event.message };
      return state;
    case 'loaded':
    case 'failed':
      return state;
  }
}
```

That version checks the event inside each state, which is where the interesting rules live, and the compiler is no help
with the combinations. The typed version below is more work and it makes each transition explicit.

## A transition table typed by the pair

```ts
type Transition = {
  idle: { fetch: Extract<State, { kind: 'loading' }> };
  loading: {
    resolve: Extract<State, { kind: 'loaded' }>;
    reject: Extract<State, { kind: 'failed' }>;
  };
  loaded: { retry: Extract<State, { kind: 'loading' }> };
  failed: { retry: Extract<State, { kind: 'loading' }> };
};
```

The table names which event is allowed in each state and what it produces, and `Extract<State, { kind: 'loaded' }>` is the
member of the state union with that discriminant rather than a copy of its shape. A transition that produces something
that is not a state member is a type error, and a state key that is not in the state union is a type error.

What the table does not give you is a `send` function that is both general and free of casts. Relating a key of
`Transition[From]` to the value it produces involves indexing a generic by a generic, and the compiler needs help:

```ts
function send<From extends State['kind'], E extends keyof Transition[From]>(
  state: Extract<State, { kind: From }>,
  event: E,
): Transition[From][E] {
  return { ...state, kind: 'loading' } as Transition[From][E];
}
```

The cast is doing real work and it is the reason the general form is usually not worth it. What the table is good for is
documentation that the compiler checks, and a `satisfies` check on a plain object of handler functions is often the more
practical version:

```ts
const TRANSITIONS = {
  idle: { fetch: () => ({ kind: 'loading', requestId: 1 }) },
} satisfies Partial<{ [K in State['kind']]: Record<string, State> }>;
```

That checks that every handler returns a state without trying to carry the state and the event through a generic.

## Where the typing earns its place

- **A form with several steps.** Each step has its own data, and a union of steps means a step cannot read another step's
  values without a check.
- **A fetch with a retry.** The retry count and the last error belong to the loading state, and the union keeps them
  there.
- **An order or a payment.** A domain where the allowed transitions are a business rule and an invalid transition is a bug
  rather than a style question.
- **A protocol.** A connection whose states offer different operations, which is what a client library ends up modelling.

Where the machine has two states, a union of the states with a switch is enough and a table is ceremony. The switch version
at the top of this lesson is the right shape for most code, and the table is for a machine whose rules are worth writing
down.

## A reducer per action

```ts
type Action =
  | { kind: 'add'; row: Row }
  | { kind: 'remove'; key: string }
  | { kind: 'clear' };

function reduce(rows: readonly Row[], action: Action): readonly Row[] {
  switch (action.kind) {
    case 'add':
      return [...rows, action.row];
    case 'remove':
      return rows.filter((row) => row.key !== action.key);
    case 'clear':
      return [];
  }
}
```

A reducer over a typed action union is the same idea applied to a collection, and it is the shape a store library expects:
the state is a type, the actions are a union, and the switch is exhaustive. The `readonly Row[]` in the signature is what
stops the reducer from mutating the array it was given, which is the property a store depends on.

```ts
const next = reduce(rows, { kind: 'remove', key: 'a' });
```

At the call site the action is a literal with its payload, and the compiler checks the payload against the action kind. A
mistyped action is an error at the dispatch, which is where the mistake is made.

## The library alternative

```ts
import { createMachine } from 'xstate';

const machine = createMachine({
  id: 'rows',
  initial: 'idle',
  states: {
    idle: { on: { FETCH: 'loading' } },
    loading: { on: { RESOLVE: 'loaded', REJECT: 'failed' } },
    loaded: { type: 'final' },
    failed: { type: 'final' },
  },
});
```

A library brings runtime state, an interpreter, subscriptions and a diagram, and its own types describe the configuration
so a transition to a state that does not exist is an error. The cost is a dependency, a configuration format and the
learning curve of its type inference, which for a four state flow is more than the machine is worth.

My rule: hand-roll the union and the reducer until the machine needs to be driven by events from outside, or until the
transitions need to be inspected at run time. Below that line the plain types are clearer, and above it the library is
carrying real weight.

## Check yourself

Write a state union and an event union for a form with two steps and a review, then write the transition function with a
switch and an exhaustive check. Add a state that needs the previous state's data and see what the types require.
