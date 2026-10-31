---
title: The strict family
summary: What each check catches, with the error it produces, and the order to turn them on.
chapter: The compiler
minutes: 13
status: draft
---

## The nine flags behind strict

| Flag | Catches |
| --- | --- |
| `strictNullChecks` | a value that may be `null` or `undefined` |
| `noImplicitAny` | a parameter or a variable whose type cannot be inferred |
| `strictFunctionTypes` | a callback given a parameter type it cannot accept |
| `strictBindCallApply` | `call`, `apply` and `bind` with the wrong arguments |
| `strictPropertyInitialization` | a class field never assigned |
| `noImplicitThis` | `this` in a function with nothing to infer it from |
| `alwaysStrict` | emits `"use strict"` and checks the file as strict |
| `useUnknownInCatchVariables` | a `catch` variable used without a check |
| `strictBuiltinIteratorReturn` | an iterator's return type from a built-in |

`strictNullChecks` is the one that changes the most code, and it is covered in its own lesson. `noImplicitAny` is the one
that produces the most errors on a first migration, because every untyped parameter is one:

```ts
function total(rows) {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
```

```text
error TS7006: Parameter 'rows' implicitly has an 'any' type.
error TS7006: Parameter 'sum' implicitly has an 'any' type.
error TS7006: Parameter 'row' implicitly has an 'any' type.
```

`noImplicitThis` catches a function that uses `this` with nothing to infer it from:

```ts
function describe() {
  return this.name;
}
```

```text
error TS2683: 'this' implicitly has type 'any' because it does not have a type annotation.
```

The fix is the `this` parameter from the functions lesson, or a conversion to a function that takes what it needs.

## The flags that go beyond strict

These are the ones worth arguing about, because each changes how ordinary code is written.

**`noUncheckedIndexedAccess`** makes an index or a key return `T | undefined`:

```ts
const rows: Row[] = [];
const first = rows[0];
```

```text
error TS18048: 'first' is possibly 'undefined'.
```

That is correct for every index and it adds a check to every array access. The cost is real, the bug it catches is real,
and it is the flag I would add to a codebase with a lot of array work and skip in one that mostly uses `for...of` and
`map`. `for...of` is unaffected, which is worth knowing: the flag pushes code toward the iteration style that does not
have the hazard.

**`exactOptionalPropertyTypes`** separates an absent property from one present with `undefined`:

```text
error TS2375: Type '{ retries: undefined; }' is not assignable to type 'Options' with
'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the
target's properties.
```

That matters for a JSON body, a patch operation and a database update that only touches the fields it was given. It is the
most invasive of the extra flags, because a great deal of code passes `undefined` where a property is optional.

**`noImplicitOverride`** requires the keyword on a method that replaces one in a base class:

```text
error TS4114: This member must have an 'override' modifier because it overrides a
member in the base class 'Sink'.
```

It catches the case where the base class renamed a method and a subclass silently stopped overriding anything. That is a
bug that is invisible in review and expensive to find later, so this one is nearly free to adopt.

**`noFallthroughCasesInSwitch`** reports a case that runs into the next one:

```text
error TS7029: Fallthrough case in switch.
```

**`noImplicitReturns`** reports a branch that does not return when another does:

```text
error TS7030: Not all code paths return a value.
```

A missing `return` is a common source of an `undefined` at run time, and both flags are cheap.

## The order to turn them on

1. `strict` for a new file or a new project. There is no reason to write a new file without it.
2. `strict` for an existing project, one directory at a time, after `noImplicitAny` has been satisfied.
3. `noImplicitOverride` and `noFallthroughCasesInSwitch`, which rarely require a code change.
4. `noUncheckedIndexedAccess`, which requires a change at every index.
5. `exactOptionalPropertyTypes`, which requires a decision about what an absent property means.

Each step in its own pull request. A migration that turns five flags on at once produces a diff nobody can review, and a
review is where a wrong type is caught.

## What strict does not check

A strict project still accepts an `as` assertion, a `!`, an `any`, and a piece of data from a network response typed as a
domain object. The flags narrow where a mistake can hide; they cannot close the boundary, which is what the lesson on the
runtime gap is about. The practical measure of a codebase's type safety is how many of those four appear in it, and a grep
for them is worth running on any project you are joining.

## Check yourself

Turn each of `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and `noImplicitOverride` on individually in a
project and record how many errors each produces. Then decide, with the numbers in front of you, which ones to keep.
