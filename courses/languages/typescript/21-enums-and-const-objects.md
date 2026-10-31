---
title: Enums and const objects
summary: The one construct that generates code, the hole in a numeric enum, and what to use instead.
chapter: Classes and values
minutes: 13
status: draft
---

## An enum is a value and a type

```ts
enum Level {
  Quiet,
  Loud,
}
```

`Level` is a type with two members, and it is also a value with two properties, so it appears in both worlds. That dual
nature is what makes it different from everything else in the type system, and it is why it cannot be erased:

```js
var Level;
(function (Level) {
    Level[Level["Quiet"] = 0] = "Quiet";
    Level[Level["Loud"] = 1] = "Loud";
})(Level || (Level = {}));
```

The emitted object maps name to number and number to name, which is the reverse mapping that makes
`Level[0] === 'Quiet'` work. That costs a few bytes per enum and it is the reason an enum is a real value at run time
while a type alias is not.

## Values can be strings

```ts
enum Level {
  Quiet = 'quiet',
  Loud = 'loud',
}
```

A string enum emits an object with the string values and no reverse mapping, so it is smaller and it serialises as the
string rather than as a number. That is the version to use when the value crosses a boundary, and it is the one I would
write if I were writing an enum at all.

## A numeric enum accepts a number

```ts
enum Level {
  Quiet,
  Loud,
}

const parsed: number = Number(input);
const level: Level = parsed;
```

That compiles, and at run time `Level[99]` is `undefined`, so a value that is not a member passes the check. The reason is
that a numeric enum has to be usable where a number is computed or parsed, and the cost is that the check is weaker than
it looks.

A numeric literal is no longer accepted, which is a change from older versions:

```ts
const level: Level = 99;
```

```text
error TS2322: Type '99' is not assignable to type 'Numeric'.
```

A string enum does not have the hole at all:

```ts
enum Level {
  Quiet = 'quiet',
}

const level: Level = 'shout';
```

```text
error TS2322: Type '"shout"' is not assignable to type 'Level'.
```

That difference alone is the argument for a string member, and for a const object over an enum.

## const enum is the version to avoid

```ts
const enum Level {
  Quiet = 'quiet',
}

const level = Level.Quiet;
```

A `const enum` is inlined at the point of use rather than emitted as an object, so `Level.Quiet` becomes `"quiet"` in
the output. That works inside one program and breaks across a package boundary, because the consumer's compiler has to
read the declaration file to inline the value, which a single-file transpiler cannot do.

```json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

With that flag on, every construct that generates code is an error rather than a run time surprise:

```text
error TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
```

The same message covers a `const enum`, a plain `enum`, a `namespace` with a value and a constructor parameter
property, which is the complete list of things a strip-only runtime cannot handle. Turning the flag on in a project that
runs its source directly, through Node's strip mode or a transpiler, moves those failures from run time to compile time.
A `const enum` is legacy in any case, and there is no reason to add one to new code.

## A union of literals does the same job

```ts
type Level = 'quiet' | 'loud';

function setLevel(level: Level): void {
  // ...
}

setLevel('quiet');
```

A union of string literals is erased, needs no emitted object, serialises as the string, works with a `Map` and is
readable in an error message. It has three limits: it has no runtime list of the members, it has no reverse mapping, and
it cannot be iterated. Where one of those matters, a const object fills in.

## A const object with a derived union

```ts
const LEVEL = {
  quiet: 'quiet',
  loud: 'loud',
} as const;

type Level = (typeof LEVEL)[keyof typeof LEVEL];
```

`Level` is `'quiet' | 'loud'` derived from the object, and `LEVEL` is a runtime value that can be iterated and read. The
compiler checks the two against each other, so adding a key to the object widens the union in the same change. That is
the pattern I reach for instead of an enum, and it is the one a codebase that needs both a list and a type should use.

```ts
const VOLUME: Record<Level, number> = { quiet: 0, loud: 10 };
```

The `Record` over the union then requires every key, so the lookup table and the union cannot drift. That pair is the
exhaustiveness check from earlier, applied to a lookup.

## The lookup with a satisfies check

```ts
const HANDLERS = {
  quiet: () => 0,
  loud: () => 10,
} satisfies Record<Level, () => number>;
```

`satisfies` checks every key is present and every value is a function while keeping the exact type of the object, so a
caller can look a handler up by name and the compiler reports a missing one. `Record<Level, ...>` as an annotation would
do the same check and widen the value type, which is why `satisfies` is the better choice here.

## When an enum is right

- A public API that mirrors a numeric wire format, where the numbers are the contract and the names are documentation.
- A value that has to be iterated and also has to be a type, where the const object pattern would need two names.
- Code that must interoperate with an existing enum.

None of those is common in a new codebase, and the cost of an enum is real: an emitted object, a hole in the numeric
case, and the `const enum` trap. A union of literals or a const object covers the rest.

## Check yourself

Write a numeric enum, assign a number that is not a member and confirm it compiles. Then write the same thing as a
string enum and confirm it does not. Finally write the const object with a derived union and a `Record` over it, and add
a key to one and not the other to see which reports the mistake.
