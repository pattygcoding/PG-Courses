---
title: The runtime gap
summary: Everything the checker cannot see, the four escapes that switch it off, and how to measure a codebase.
chapter: Working with the ecosystem
minutes: 12
status: draft
---

## The list of things a type cannot check

- **Data from outside the program.** A network response, a file, an environment variable, a query parameter, a message. The
  types describe what the code expects, and something has to check that the value matches. That is the schema at the
  boundary, and it is the single most important limitation in this course.
- **What a function does.** A signature says the shape of the arguments and the return. A function that returns the wrong
  rows for a right-shaped return type passes every check.
- **That a change in one place was made in the other.** A duplicated shape, a string used as a key, a translation file, an
  SQL query written by hand.
- **Anything typed with an assertion.** `as`, `!`, `any` and `@ts-expect-error` all remove a check, and each one is a place
  where a claim is being made rather than verified.
- **The behaviour of a dependency.** A `@types` package or a hand-written declaration is a description, and the package
  can do something else.
- **Time and state.** A value typed `Row` is a `Row` at one moment. An object mutated by a callback after a check is the
  case the narrowing lesson covered.

## The four escapes

```ts
const row = JSON.parse(text) as Row;           // an assertion
const key = row!.key;                            // a non-null assertion
function load(input: any) { }                    // a switch-off that spreads
// @ts-expect-error the types are wrong here      // a suppression
```

Each has a legitimate use and each is where a guarantee is given back:

| Escape | Legitimate when |
| --- | --- |
| `as` | the value was checked immediately before, or a library's types are wrong and cannot be fixed |
| `!` | a value is assigned in a lifecycle the compiler cannot see |
| `any` | never, in favour of `unknown` and a check |
| `@ts-expect-error` | a known upstream bug, with a comment saying what and why |

`any` is the only one with no good case, because `unknown` does everything `any` does except permit use without a check. A
codebase that has replaced every `any` with `unknown` and every `as` with a validation function is measurably safer, and
the replacement is mechanical.

```bash
rg -c '\bas any\b|: any\b|as unknown as' src
```

A count of those per directory is a rough but genuinely useful measure, and it is more informative than the strict flags a
project has turned on. The flags narrow where a mistake can hide; the escapes are where it is hiding.

## Types are erased and erasure has consequences

- **No `instanceof` for an interface.** There is nothing at run time to check.
- **No reflection.** A type cannot be enumerated, so a form library cannot generate a form from one.
- **No serialisation.** A `JSON.stringify` loses the type, and a `JSON.parse` has none.
- **No runtime cost.** The annotations do not exist, so a generic function is a function with no type argument and a union
  is nothing at all.
- **Except for the four constructs that emit.** An `enum`, a `namespace` with a value, a parameter property and a
  decorator generate code, which is what `erasableSyntaxOnly` reports.

The last pair is the trade in one line: the whole type system is free at run time, and everything that would need
information at run time is either absent or an explicit exception.

## What the type system does buy

1. **Every path is checked.** A type error is reported even in a branch no test exercises, which no test suite achieves.
2. **A change produces a list.** Changing a type reports every call site, which is a refactor tool and a review aid.
3. **A signature is documentation that cannot go stale.** A comment can be wrong; a type that disagrees with the code is a
   compile error.
4. **A domain can be described.** A discriminated union says which states exist and which do not, which is a design
   activity as much as a checking one.
5. **The editor can help.** Completion, go-to-definition and rename work because the compiler knows the shapes.

Those five are worth the build step, the configuration and the discipline. They are not worth confusing with correctness,
which is a property of the program rather than of its types.

## The habit that keeps it honest

Every place the program receives a value, ask what has checked it. The list is short and it is the same list every time: a
schema at the network edge, a schema for the environment, a check for a file that is read, and a test for the code in
between. Everything else is a value the program produced itself, which the compiler has already checked.

The second habit is to read the error rather than work around it. An error that is inconvenient is usually the compiler
being right about a case that is possible, and the `as` that makes it go away is the point where a real bug becomes a run
time surprise. The time to use an assertion is when you have read the error and can say exactly why the case cannot
happen.

## Check yourself

Count the `any`, `as` and `@ts-expect-error` occurrences in a codebase and pick the one that would be most valuable to
remove. Then find a value that arrives from outside and check whether anything validates it.
