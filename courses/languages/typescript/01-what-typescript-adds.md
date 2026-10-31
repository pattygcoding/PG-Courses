---
title: What TypeScript adds
summary: A checker that runs before the program does, annotations that vanish, and the four constructs that do not.
chapter: Getting started
minutes: 13
status: draft
---

## The types are erased

```ts
type Row = { key: string; value: number };
interface Sink { write(line: string): void }

const row: Row = { key: 'a', value: 1 };
const limit = 10 as const;

function label(value: string): string {
  return value;
}

export { row, limit, label };
```

Compiled with `tsc`, that file becomes this:

```js
const row = { key: 'a', value: 1 };
const limit = 10;

function label(value) {
  return value;
}

export { row, limit, label };
```

The type alias is gone, the interface is gone, the annotation on `row` is gone, the `as const` is gone and the
return type of `label` is gone. What is left is the JavaScript you would have written by hand, which is the whole
proposition: the annotations are checked and then thrown away.

That means a type cannot change behaviour, cannot be observed at run time, and costs nothing. It also means a type
cannot validate anything, so a value that arrives from a file or a request needs a run time check no matter what its
type says. That gap is the subject of the last chapter.

## Four constructs that do emit code

Most of TypeScript is erased and four things are not:

```ts
enum Level { Quiet, Loud }

class Store {
  constructor(private readonly name: string) {}
}
```

```js
var Level;
(function (Level) {
    Level[Level["Quiet"] = 0] = "Quiet";
    Level[Level["Loud"] = 1] = "Loud";
})(Level || (Level = {}));

class Store {
    name;
    constructor(name) {
        this.name = name;
    }
}
```

An `enum` generates an object with a reverse mapping, a parameter property generates an assignment and a field, a
`namespace` with a value in it generates a function, and an experimental decorator generates a call. Everything else in
the type world is a comment the compiler reads and discards.

That has a practical consequence: a runtime that only strips the annotations cannot run those four. Node's own support
says so plainly:

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript enum is not supported in strip-only mode
```

## What the compiler does that a test cannot

```ts
type Event =
  | { kind: 'started'; id: number }
  | { kind: 'finished'; id: number; ok: boolean };

function describe(event: Event): string {
  switch (event.kind) {
    case 'started':
      return `started ${event.id}`;
  }
}
```

```text
error TS2366: Function lacks ending return statement and return type does not include 'undefined'.
```

The arm for `finished` is missing and the compiler says so, at the point the type changed, before anything runs. A test
finds that only if a test passes a `finished` event, and the test written when the union had one member would not.

```ts
type Config = { timeout: number };

const config: Config = { timeout: 1 };

config.timeOut = 2;
```

```text
error TS2551: Property 'timeOut' does not exist on type 'Config'. Did you mean 'timeout'?
```

That is a typo a test would not catch if no test read the property, and a refactor that renames a field reports every
call site that still uses the old name. Those are the two things a type checker is genuinely better at than a test
suite: it covers every path including the ones nothing exercises, and it answers a question about all of the code at
once.

## What it does not do

- It does not check what arrives at run time. `as Row` is an assertion, not a conversion, and it will happily tell the
  rest of the program that an object has a `value` when it does not.
- It does not prove the program correct. A function that adds one to a number is typed perfectly and can still be
  wrong about what it should add.
- It does not replace tests. It replaces the tests that only existed to check that a property exists.
- It does not make the code shorter. A well typed program is usually a little longer than the untyped one, and the
  length buys the guarantee.

## The cost

A build step, a configuration file, and a compiler version to keep current. The configuration is where most of the
frustration lives, and it is one chapter of this course. The compiler version matters because the type system improves
between releases, so an upgrade can report an error in code that was accepted before, which is usually the compiler
being more correct.

The other cost is the temptation to reach for `any` when a type is hard to write. `any` switches the checker off for a
value and everything computed from it, which spreads. The escape hatch worth using instead is `unknown`, which requires
a narrowing check before use.

## Check yourself

Compile the first snippet with `tsc` and read the emitted JavaScript, then delete one arm from the `Event` switch and
read the error. Finally find one `as` assertion in a codebase you know and say what would happen if the value were the
wrong shape.
