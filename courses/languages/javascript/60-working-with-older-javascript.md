---
title: Working with older JavaScript
summary: Reading code written before 2015, and the order to modernise it in without breaking anything.
chapter: Idioms and the edges
minutes: 13
status: draft
---

## What older code looks like

```js
var Cache = (function () {
  function Cache(limit) {
    this.limit = limit;
    this.items = {};
  }

  Cache.prototype.get = function (key) {
    return this.items[key] || null;
  };

  Cache.prototype.set = function (key, value) {
    this.items[key] = value;
  };

  return Cache;
})();
```

That is a module written before modules existed: an immediately invoked function that returns a constructor, with
methods on the prototype. It is not wrong, it works, and every part of it has a modern equivalent.

```js
class Cache {
  #items = new Map();

  constructor(limit) {
    this.limit = limit;
  }

  get(key) {
    return this.#items.get(key) ?? null;
  }

  set(key, value) {
    this.#items.set(key, value);
  }
}
```

## The ladder

Modernise in this order, one step at a time, with the tests passing between each:

1. **Modules.** Move a file into an ES module with `import` and `export`, and set `"type": "module"`. This changes
   loading, so it is the step to do first and alone.
2. **`const` and `let`.** Replace every `var`, checking for the hoisting behaviour the code relied on.
3. **Arrow functions and template literals.** Mostly mechanical, and the `this` change is the trap.
4. **`async` and `await`.** Replace callbacks and promise chains where it makes the code read better, keeping the error
   handling equivalent.
5. **Classes.** Replace a constructor function and its prototype when the object is genuinely a type.
6. **The newer operators.** `??`, `?.`, `Object.fromEntries`, `toSorted`, `at`, `structuredClone`, and the rest of what
   this course covered.

Doing the whole ladder in one commit produces a diff nobody can review and a bug that takes a day to find. Doing it in
six commits means each one is checkable, and the tests after each one are what confirm it.

## Do not migrate without a test

The first job on unfamiliar old code is a test that pins the current behaviour, even the parts that look wrong. A
characterisation test of that kind is not documentation of intent; it is a safety net that tells you when a change altered
something.

```js
test('keeps the existing shape of the response', () => {
  assert.deepStrictEqual(buildReport(rows), {
    total: 3,
    items: [{ key: 'a' }, { key: 'b' }, { key: 'c' }],
  });
});
```

That test looks trivial and it is the one that catches a `for...in` loop that used to include an inherited key. Write it
before the refactor, not after.

## Where a mechanical change breaks something

```js
function Cache(limit) {
  this.limit = limit;

  var self = this;

  this.get = function (key) {
    return self.items[key] || null;
  };
}
```

The `self` variable exists because an inner function does not inherit `this`. Turning that inner function into an arrow
removes the need for `self`, and turning it into an arrow while leaving `self` in place is harmless. The reverse change,
making an arrow into a `function`, breaks every `this` inside it.

| Change | What breaks |
| --- | --- |
| `var` to `let` | a variable read before its declaration, or reused across blocks |
| `function` to arrow | `this`, `arguments`, `new`, and a method on an object |
| a callback to `async` | the caller has to await it, or nothing waits |
| a promise chain to `await` | a `catch` that only covered part of the chain |
| `'use strict'` removed | an accidental global becomes silent again |
| a prototype method to a class field arrow | one function per instance instead of one per prototype |

The third row is the one that produces a bug rather than an error, because an `async` function returns a promise whether
or not the caller awaits it.

## Feature detection for an old runtime

```js
if (typeof Array.prototype.toSorted !== 'function') {
  Array.prototype.toSorted = function (compare) {
    return [...this].sort(compare);
  };
}
```

A polyfill adds a missing method, and it is only correct if it matches the specification, including the edge cases the
method is specified for. Writing one for a small method is reasonable; writing one for `Promise` or `Intl` is not, and
the published versions exist because the detail matters.

A transpiler is the other half, converting syntax the target cannot parse:

```json
{
  "targets": "> 0.5%, last 2 versions, not dead"
}
```

The `targets` field is what decides how much work the transpiler does. Transpiling for a browser nobody uses produces
longer, slower output for nothing, which is why the target is a decision rather than a default.

## Keeping the surface the same

```js
export function buildReport(rows) { }

// Internally rewritten, same signature, same return shape.
```

A refactor of a library keeps its exported names, its argument order and its return shape, and changes only what is
inside. A consumer should not be able to tell from the outside, which is what makes the change safe to publish as a patch
version.

When the surface has to change, the ladder for that is separate: add the new function, mark the old one deprecated, keep
both for a release, then remove. Two of those three steps are the ones people skip, which is why a library upgrade
becomes a project.

## Check yourself

Take a function using `var` and a callback, and modernise it one change at a time with a test passing after each. Then
find a `for...in` loop and decide whether it should be `Object.keys`, `Object.entries` or a `Map`.
