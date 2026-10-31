---
title: Reshaping data
summary: Indexing a list by key, joining two lists, and the four transformations that cover most reporting code.
chapter: Arrays and data
minutes: 13
status: draft
---

## Index a list by a key

```js
function indexBy(records, keyOf) {
  return new Map(records.map((record) => [keyOf(record), record]));
}

const byKey = indexBy(records, (record) => record.key);

console.log(byKey.get('report.csv'));
```

One pass builds a lookup, and every later `get` is O(1) instead of a scan. This is the transformation that removes the
nested loop from a piece of code, and spotting a `find` inside a `map` is how you find the place that needs it:

```js
// A scan per record, which is quadratic.
const joined = orders.map((order) => ({
  ...order,
  customer: customers.find((customer) => customer.id === order.customerId),
}));

// One lookup built once, then constant time per record.
const byId = indexBy(customers, (customer) => customer.id);

const joined = orders.map((order) => ({
  ...order,
  customer: byId.get(order.customerId),
}));
```

Ten orders against ten customers is a rounding error either way. Ten thousand against ten thousand is a hundred
million comparisons, which is the difference between a page and a timeout.

## Join two lists

```js
function join(left, right, keyOf, combine) {
  const byKey = indexBy(right, keyOf);

  return left.map((record) => {
    const match = byKey.get(keyOf(record));

    if (!match) {
      throw new Error(`no match for ${keyOf(record)}`);
    }

    return combine(record, match);
  });
}
```

An inner join, an outer join and a left join differ in one line: what happens when `match` is missing. Deciding that
explicitly at the call site is what stops a `null` propagating into the result.

```js
const joined = orders.map((order) => ({
  ...order,
  customer: byId.get(order.customerId) ?? null,      // a left join: keep the order, no customer
}));
```

## Group and aggregate

```js
const byLevel = Object.groupBy(records, (record) => record.level);

const totals = records.reduce((sums, record) => {
  sums.set(record.level, (sums.get(record.level) ?? 0) + record.value);
  return sums;
}, new Map());
```

Grouping keeps the records; aggregating reduces each group to a number. `Object.groupBy` gives the first in one line,
and the second is a `reduce` with a `Map` accumulator or two passes over the grouped result:

```js
const totals = Object.fromEntries(
  Object.entries(byLevel).map(([level, group]) => [
    level,
    group.reduce((sum, record) => sum + record.value, 0),
  ]),
);
```

Two passes are easier to read and slower by a constant factor. For a report over a few thousand rows, take the
readable version.

## Pivot a list into a table

```js
function pivot(records, rowOf, columnOf, valueOf) {
  const columns = [...new Set(records.map(columnOf))].toSorted();
  const rows = [...new Set(records.map(rowOf))].toSorted();

  const cells = new Map(
    records.map((record) => [`${rowOf(record)}|${columnOf(record)}`, valueOf(record)]),
  );

  return rows.map((row) => ({
    row,
    values: columns.map((column) => cells.get(`${row}|${column}`) ?? null),
  }));
}
```

Three passes: the distinct columns, the distinct rows, and a lookup for the cells. The composite key is a string
because a `Map` keyed by an array would compare by identity and never match. A `Map` keyed by a tuple is what a
language with value types gives you for free, and the string key is the workaround.

## Collect distinct values

```js
const levels = [...new Set(records.map((record) => record.level))];
const sorted = levels.toSorted();

console.log(sorted);
```

A `Set` gives the distinct values in first-seen order, and one `toSorted` puts them in a stable order for a report.
That pair replaces the older `filter` and `indexOf` combination, which was quadratic.

## Deriving one value from many

```js
const summary = records.reduce(
  (totals, record) => ({
    count: totals.count + 1,
    sum: totals.sum + record.value,
    max: Math.max(totals.max, record.value),
    min: Math.min(totals.min, record.value),
  }),
  { count: 0, sum: 0, max: -Infinity, min: Infinity },
);

console.log(summary);
```

One pass produces four numbers, where four separate passes over the same array would each be a line and a walk. A
fresh object per element is the cost, and for a report it does not matter; for a million records, mutate the
accumulator instead, since nothing outside the `reduce` can see it.

## Sorting is the step that changes the answer

```js
const top = values.toSorted((a, b) => b.value - a.value).slice(0, 10);
```

A report whose order is unspecified is a report whose output changes between runs, which makes a diff useless. Sort
before taking a top ten, and sort by something stable enough that two rows with equal values keep a defined order.
The next lesson covers comparators properly, including the trap that `sort` on numbers does not do what it looks like.

## Check yourself

Write `indexBy` and use it to remove a nested `find` from a loop. Then group records by one field, total a second
field within each group, and print the groups in a sorted order.
