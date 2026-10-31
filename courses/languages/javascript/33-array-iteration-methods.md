---
title: Array iteration methods
summary: map, filter and reduce, what each returns, and the loop that does not stop when you break.
chapter: Arrays and data
minutes: 13
status: draft
---

## The three that carry most of the work

```js
const values = [1, 2, 3, 4];

const doubled = values.map((value) => value * 2);              // [ 2, 4, 6, 8 ]
const even = values.filter((value) => value % 2 === 0);          // [ 2, 4 ]
const total = values.reduce((sum, value) => sum + value, 0);      // 10
```

`map` returns a new array of the same length with each element transformed, `filter` returns a shorter array, and
`reduce` returns one value built from all of them. None of the three changes the original.

```js
const summaries = records.map((record) => `${record.key}: ${record.value}`);

const large = records.filter((record) => record.value > 1024);

const byLevel = records.reduce((groups, record) => {
  groups[record.level] ??= [];
  groups[record.level].push(record);
  return groups;
}, {});
```

The third is the one people find hard to read, and it is the one `Object.groupBy` replaces in current code.

## Reduce is general enough to be dangerous

```js
const counts = words.reduce((map, word) => {
  map.set(word, (map.get(word) ?? 0) + 1);
  return map;
}, new Map());
```

Every one of these is a `reduce`: a sum, a maximum, a group, a lookup built from a list, a promise chain. That
flexibility is why it appears in code that would read better as something else. If the accumulator is a number and the
operation is addition, `sum` through a loop or a helper is clearer; if the accumulator is an object built key by key,
`Object.groupBy` says it in one line.

```js
const max = values.reduce((best, value) => (value > best ? value : best), -Infinity);
const joined = lines.reduce((text, line) => `${text}${line}\n`, '');
```

## The rest of the toolkit

```js
const values = [1, 2, 3, 4];

values.find((value) => value > 2);          // 3, the element
values.findIndex((value) => value > 2);      // 2, the index
values.findLast((value) => value < 4);        // 3
values.some((value) => value > 3);              // true, stops at the first
values.every((value) => value > 0);              // true
values.flatMap((value) => [value, value]);        // [ 1, 1, 2, 2, 3, 3, 4, 4 ]
values.join(', ');                                 // '1, 2, 3, 4'
```

`some` and `every` short circuit, which makes them cheaper than a filter that builds an array and counts it. Both
have a rule for an empty array that is worth knowing:

```js
console.log([].every(() => false));         // true, there is no counterexample
console.log([].some(() => true));            // false, there is no example
```

`flatMap` maps and then flattens one level, which is the way to turn each record into zero or more output rows.
`join` is the one that produces a string, and its default separator is a comma.

## The methods skip holes, forEach included

```js
const sparse = [1, , 3];

sparse.forEach((value) => console.log(value));
```

```text
1
3
```

The callback is not called for a hole, and it receives three arguments: the value, the index and the array itself.
That third argument is why passing a function with a different signature causes trouble, which the higher-order
functions lesson covers with `map(parseInt)`.

## forEach cannot be stopped

```js
values.forEach((value) => {
  if (value === 3) {
    break;                 // SyntaxError, break is not allowed here
  }
});
```

`forEach` has no early exit, and `return` inside it only skips the current element. Where a loop needs to stop, use
`for...of` with a `break`, or one of the short-circuiting methods:

```js
for (const value of values) {
  if (value === 3) {
    break;
  }

  console.log(value);
}

const found = values.find((value) => value === 3);
const hasLarge = values.some((value) => value > 1000);
```

The current convention in most lint configurations is to avoid `forEach` altogether for the same reason: `for...of`
expresses a break, a return, an `await` and a `continue` without a special case.

## Chaining and the intermediates

```js
const report = records
  .filter((record) => record.value > 0)
  .map((record) => ({ key: record.key, size: record.value * 1024 }))
  .toSorted((a, b) => b.size - a.size)
  .slice(0, 10);
```

Each step allocates an array, so a chain over a million records makes four arrays. The readability is usually worth
it, and the case to watch is a chain inside a hot loop, where a single `for...of` doing everything in one pass is both
faster and, in that context, not much longer.

A chain is also where a `null` slips in unnoticed: a `map` that returns `undefined` for one record produces an array
with a hole in the logic rather than an error, and the failure appears three steps later. Filter the problem out or
throw at the point it appears.

```js
.map((record) => {
  if (!record.value) {
    throw new Error(`record ${record.key} has no value`);
  }

  return record.value;
})
```

## Where a loop is better

```js
let count = 0;

for (const record of records) {
  if (record.level === 'error') {
    if (count > 10) {
      break;
    }

    count += 1;
  }
}
```

That loop has a break and a nested condition, which no chain expresses cleanly. The test is whether the chain reads
as a sentence: filter, map, sort, take reads well; a chain with four nested conditionals inside its callbacks does
not.

## Check yourself

Write the same transformation as a chain and as a `for...of` loop, and time both over a large array. Then group an
array of records with `reduce` and again with `Object.groupBy`, and say which one you would keep in a code review.
