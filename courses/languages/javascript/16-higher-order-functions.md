---
title: Higher-order functions
summary: Passing behaviour around, the callback signature that catches everyone, and when a loop reads better.
chapter: Functions and scope
minutes: 13
status: draft
---

## A function is a value

```js
const byValue = (a, b) => a.value - b.value;

records.sort(byValue);
records.filter((record) => record.value > 10);
records.map((record) => record.key);
```

A function that takes a function is a higher-order function, and it is how the language lets you supply the part
that varies. `sort` needs an order, `filter` needs a test and `map` needs a transformation, so each one takes the
answer as an argument.

The version without higher-order functions is a copy of the loop per behaviour:

```js
function keysOf(records) {
  const keys = [];

  for (const record of records) {
    keys.push(record.key);
  }

  return keys;
}
```

That is fine for one operation and turns into six almost identical functions. Passing the transformation is what
`map` does, and the reason the array methods exist.

## Name the function when it earns a name

```js
const isLarge = (record) => record.value > 1024;
const toKey = (record) => record.key;

const large = records.filter(isLarge).map(toKey);
```

A named function is testable on its own, appears in a stack trace by name and can be reused. An inline arrow is
fine for a one-off operation that a reader can see in full, and a file where every callback is three lines long
inline is harder to follow than one with names.

## The callback signature, and the trap it sets

The array methods call the callback with three arguments: the value, the index and the array.

```js
console.log([1, 2, 3].map(parseInt));      // [ 1, NaN, NaN ]
```

`parseInt` takes a string and a radix, so the index arrives as the radix: `parseInt('1', 0)` is 1, `parseInt('2', 1)`
is `NaN` because radix 1 is invalid, and `parseInt('3', 2)` is `NaN` because `3` is not a binary digit. Passing a
function with a different signature than the method expects is the whole bug, and the fix is a wrapper:

```js
console.log([1, 2, 3].map((value) => parseInt(value, 10)));    // [ 1, 2, 3 ]
```

The same trap applies to `Number` versus `parseInt` and to any function whose second parameter means something
else.

## Returning a function

```js
function multiplier(factor) {
  return (value) => value * factor;
}

const triple = multiplier(3);

console.log(triple(4));          // 12
```

The returned function closes over `factor`, which is the pattern behind a configured validator, a logger with a
level and a query builder:

```js
const atLeast = (minimum) => (value) => value >= minimum;

const isAdult = atLeast(18);

console.log([16, 21].filter(isAdult));     // [ 21 ]
```

## Designing with a function parameter

```js
function countBy(records, keyOf) {
  const counts = new Map();

  for (const record of records) {
    const key = keyOf(record);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

console.log(countBy(records, (record) => record.level));
console.log(countBy(records, (record) => record.key.length));
```

One function covers every grouping, and each call site says what it groups by. That is the shape to reach for when
you notice two functions that differ only in the middle.

## What it costs

```js
const total = records.map((record) => record.value).reduce((sum, value) => sum + value, 0);
```

Two function allocations per call of the enclosing function, which the engine handles cheaply enough that the
readability wins. Reusing one function defined outside the loop removes them:

```js
const valueOf = (record) => record.value;
const add = (sum, value) => sum + value;

const total = records.map(valueOf).reduce(add, 0);
```

That matters in a hot loop over millions of items and nowhere else.

## When a loop is clearer

```js
let total = 0;

for (const record of records) {
  if (record.value > threshold) {
    total += record.value;
  } else if (total > 0) {
    break;
  }
}
```

A pipeline with four chained methods and a captured accumulator is harder to read than that loop, and `break` has
no clean equivalent in the array methods. Choose the form a reader can follow in one pass, since both compile to a
loop over the same data.

## Check yourself

Call `[1, 2, 3].map(parseInt)`, explain the result, and fix it. Then write a `countBy` that takes a key function
and call it twice with different keys.
