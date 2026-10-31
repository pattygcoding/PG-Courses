---
title: Idioms and traps
summary: The habits worth keeping, the mistakes this language makes easy, and how to check a value before trusting it.
chapter: Idioms and the edges
minutes: 13
status: draft
---

## The traps, in one place

Each of these appears somewhere earlier in the course and each one has caught a working programmer:

| Code | What happens |
| --- | --- |
| `typeof null` | `'object'` |
| `[1, 10, 2].sort()` | `[1, 10, 2]`, compared as text |
| `'5' + 1` | `'51'` |
| `'5' - 1` | `4` |
| `0.1 + 0.2 === 0.3` | false |
| `NaN === NaN` | false |
| `Boolean('0')` | true |
| `if (count && 'found')` | `0` when the count is zero |
| `arr.length = 2` | truncates the array |
| `delete arr[1]` | leaves a hole |
| `[1, , 3].map((v) => v)` | the hole is skipped |
| `[1, 2, 3].map(parseInt)` | `[1, NaN, NaN]` |
| `json['toString']` | a function, not `undefined` |
| a `for...in` loop | inherited keys are included |
| `Object.freeze(obj).nested.x = 1` | the nested object changes |
| `value == null` | true for both `null` and `undefined` |
| `a || 'default'` with `a` of `0` | `'default'` |
| `regex.test(x)` with the `g` flag | alternating results |
| `new Date('2024-03-01')` | parsed as UTC, and a time makes it local |
| a `JSON.parse(JSON.stringify(x))` clone | loses dates, maps and `undefined` |
| `{ ...instance }` | loses the prototype |
| `Object.assign({}, body)` | can replace the target's prototype |
| `async` inside `forEach` | nothing waits |
| `new Array(3)` | three holes, not `[3]` |
| a `bigint` through `JSON.stringify` | throws |
| a `Map` through `JSON.stringify` | `{}` |

None of these is a bug in the language. They are the cost of a language designed in ten days and extended for thirty
years, and knowing them is what makes the code predictable.

## The habits that avoid most of them

```js
// === everywhere, except for the nullish double check.
if (value == null) { }

// ?? for a missing value, || only for an empty one.
const name = input ?? 'unnamed';
const list = values || [];

// Object.hasOwn rather than a truthy check on a lookup.
if (Object.hasOwn(statusMap, status)) { }

// A Map for keys that come from outside.
const byKey = new Map();

// A new array rather than a mutation.
const sorted = values.toSorted(by);

// The types, not just the shape.
Number.isInteger(value);
Array.isArray(value);
Number.isFinite(value);
```

`Number.isInteger` and `Array.isArray` are the two checks that catch a wrong type at the boundary where a value arrives.
`typeof` cannot distinguish an array from an object, and a string that looks like a number is a string.

## Structure worth keeping

- One reason to change per module, so a file's purpose fits in its name.
- A function that takes what it needs as a parameter, rather than reaching for `this` or a module-level variable.
- Early returns for the cases that leave, so the interesting path is at one level of indentation.
- `const` by default, `let` when reassigned, and no `var`.
- Named functions for anything more than a one line callback, because a stack trace names them.
- Pure functions for the logic and a thin layer for the input and output, which is what makes a test cheap to write.
- Throw for a bug, return a value for a case the caller expects.

## Reading a value before trusting it

```js
console.log({ value, type: typeof value, isArray: Array.isArray(value) });
```

Logging an object of names and values rather than a sentence is the single most useful debugging habit in this language,
because the types are visible and the values keep their structure in the console. The alternative is a string that says
`[object Object]` for the thing you needed to see.

## A checklist for a code review

1. Every `==` except a nullish check is a `===`.
2. Every promise is awaited or has a `catch`.
3. Every array that must not change is copied or built by a copying method.
4. Every key from outside is read with `Object.hasOwn`, or the container is a `Map`.
5. Every `await` in a loop is deliberate.
6. Every `sort` on numbers has a comparator.
7. Every `delete` on an object is a spread instead.
8. Every `catch` does something other than log.

That list is short enough to hold in mind and it covers most of what a review finds in this language.

## Check yourself

Predict the result of five rows from the trap table without running them, then run all five and compare. Then take the
review checklist and apply it to the last file you wrote in JavaScript.
