---
title: Arrays and mutation
summary: The methods that change an array, the ones that return a new one, and the holes that make both surprising.
chapter: Arrays and data
minutes: 13
status: draft
---

## Creating an array

```js
const literal = [1, 2, 3];
const fromLength = Array.from({ length: 3 }, (_, index) => index);   // [ 0, 1, 2 ]
const fromIterable = Array.from(new Set([1, 2]));                      // [ 1, 2 ]
const ofValues = Array.of(3);                                           // [ 3 ]
```

`Array.from` takes anything iterable or array-like and an optional mapping function, which is how a range is built
without a loop. `Array.of(3)` is a one element array holding `3`, where `new Array(3)` is an array of length three
with no elements in it:

```js
console.log(Array.of(3).length, new Array(3).length);      // 1 3
console.log(1 in new Array(3));                              // false
```

That difference is the reason `Array.of` exists, because `new Array(3)` looks like an array with one element and is
not.

## Holes are real and inconsistent

```js
const sparse = [1, , 3];

console.log(sparse.length);              // 3
console.log(1 in sparse);                 // false, there is no element there
console.log(sparse.map((v) => v * 2));     // [ 2, <1 empty item>, 6 ]
console.log(sparse.filter(() => true));     // [ 1, 3 ], the hole is gone
console.log(JSON.stringify(sparse));        // '[1,null,3]'
```

A hole is not the same as an element holding `undefined`, and the methods disagree about what to do with it: `map`
skips it and keeps the hole, `filter` drops it, `for...of` treats it as `undefined`, and `JSON.stringify` writes
`null`. Arrays with holes come from `delete`, from `new Array(n)` and from assigning past the end.

The rule: never `delete` an element from an array, and never rely on `new Array(n)` filling anything. Use `splice` or
a filtered copy to remove, and `Array.from({ length: n }, ...)` to build.

```js
const values = [1, 2, 3];

delete values[1];

console.log(values.length, 1 in values);     // 3 false, the hole is still counted
```

## Length is writable

```js
const values = [1, 2, 3, 4];

values.length = 2;

console.log(values);          // [ 1, 2 ]
```

Setting `length` shorter truncates the array, and setting it longer adds holes. Neither is a mistake the language
prevents, and the shorter case is the one that appears in real code, usually by accident when a length from another
array is assigned.

## The methods that change the array

```js
const values = [1, 2, 3];

values.push(4);                  // [ 1, 2, 3, 4 ]
values.pop();                     // [ 1, 2, 3 ]
values.unshift(0);                 // [ 0, 1, 2, 3 ]
values.shift();                     // [ 1, 2, 3 ]
values.splice(1, 1, 'x');            // [ 1, 'x', 3 ]
values.reverse();                     // [ 3, 'x', 1 ]
values.sort();                         // [ 1, 3, 'x' ]
values.fill(0, 0, 1);                   // [ 0, 3, 'x' ]
```

All of them return something: `push` and `unshift` return the new length, `pop` and `shift` return the removed
element, `splice` returns the removed elements, and the rest return the array itself so calls can chain.

`push` and `pop` touch the end and are cheap. `unshift` and `shift` move every element, so they are O(n) and a queue
built on them is quadratic. A `Deque`-like queue wants an index or a `Map`, and a stack is fine with `push` and `pop`.

## The methods that return a new array

```js
const values = [3, 1, 2];

const sorted = values.toSorted();
const reversed = values.toReversed();
const replaced = values.with(0, 9);
const spliced = values.toSpliced(1, 1, 'x', 'y');

console.log(values);          // [ 3, 1, 2 ], unchanged
console.log(sorted, replaced);
```

```text
[ 1, 2, 3 ] [ 9, 1, 2 ]
```

The four copying versions of the mutating methods arrived recently, and they are what an immutable update wants. The
same ones written the old way were `[...values].sort()`, which is easy to get wrong by forgetting the copy:

```js
const sorted = values.sort();      // also sorts values, and returns it
```

`slice`, `concat`, `flat`, `flatMap` and `filter` all return a new array too, so the two groups are worth keeping
apart in your head: a method that returns a differently shaped array is a copy, and a method whose name is a verb in
the imperative is usually a mutation.

## Searching

```js
const values = [1, 2, 3, 2];

console.log(values.indexOf(2));            // 1
console.log(values.lastIndexOf(2));         // 3
console.log(values.includes(2));             // true
console.log(values.find((v) => v > 1));       // 2
console.log(values.findLast((v) => v < 3));    // 2
console.log(values.findIndex((v) => v > 1));    // 1
```

`indexOf` uses strict equality, so it cannot find `NaN`, and `includes` uses SameValueZero, so it can. `find` and
`findIndex` take a predicate, which is what a search over objects needs since two objects are never `===` unless they
are the same reference.

```js
console.log(Array.isArray(values), Array.isArray({ length: 1 }));
```

```text
true false
```

`Array.isArray` is the only reliable test, because `typeof` says `object` and `instanceof` fails across realms.

## Nested arrays are not multi-dimensional

```js
const grid = [
  [1, 2],
  [3, 4],
];

console.log(grid[1][0]);        // 3
console.log(grid.length);        // 2, the number of rows
```

A grid is an array of arrays, so every row can have a different length and a copy is shallow: `[...grid]` shares the
rows. `flat` unpacks one level by default and `flat(Infinity)` unpacks every level.

## Check yourself

Build an array with `Array.from({ length: 5 }, ...)`, remove one element with `splice` and with `filter`, and compare
the results. Then sort an array three ways, mutating and not, and confirm which of them changed the original.
