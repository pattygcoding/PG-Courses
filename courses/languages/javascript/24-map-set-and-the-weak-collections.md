---
title: Map, Set and the weak collections
summary: Keyed lookup with any key type, membership without duplicates, and the two containers that let go.
chapter: Objects and classes
minutes: 13
status: draft
---

## Map is a dictionary with any key

```js
const counts = new Map();

counts.set('a', 1);
counts.set(2, 'two');
counts.set({ id: 1 }, 'object key');

console.log(counts.get('a'));          // 1
console.log(counts.get(2));             // 'two'
console.log(counts.size);                // 3
console.log(counts.has('missing'));       // false
```

An object can only use a string or a symbol as a key, because every key is converted to one. A `Map` uses
SameValueZero, so a number stays a number, an object key is compared by identity, and `NaN` is a usable key.

| | Object | Map |
| --- | --- | --- |
| Key types | string and symbol | anything |
| Size | `Object.keys(x).length`, which allocates | `size` |
| Order | integer keys first, then insertion | insertion |
| Prototype keys | inherited names are visible to `in` | none |
| Iteration | needs `Object.entries` | built in |
| Spread into JSON | yes | no |

An object is the right container when the keys are a fixed set you can name in the source, and a `Map` when the keys
are data.

## Iterating a Map

```js
const counts = new Map([['a', 1], ['b', 2]]);

for (const [key, value] of counts) {
  console.log(key, value);
}

console.log([...counts.keys()]);           // [ 'a', 'b' ]
console.log(Object.fromEntries(counts));    // { a: 1, b: 2 }
```

A `Map` is iterable, so a `for...of` destructures each pair. `Object.fromEntries` converts one to a plain object,
which is the way to send a map over JSON, and `new Map(Object.entries(obj))` goes the other way.

```js
const counts = new Map();

for (const record of records) {
  counts.set(record.key, (counts.get(record.key) ?? 0) + 1);
}
```

That is the counting loop, and `?? 0` is doing the work of an entry API that `Map` does not have. Reach for
`Object.groupBy` or `Map.groupBy` when the value is a list of records rather than a count.

## Set is membership

```js
const seen = new Set();

if (!seen.has('a')) {
  seen.add('a');
}

console.log(seen.size);            // 1
```

Uniqueness uses SameValueZero, so `NaN` counts as one value and two objects with identical contents are two
members, because the objects are different references.

```js
const values = [1, 2, 2, 3, 3, 3];

console.log([...new Set(values)]);      // [ 1, 2, 3 ]
```

That one line removes duplicates from an array in insertion order, which is the most common use of a `Set`.

## Set algebra is built in

```js
const a = new Set([1, 2, 3]);
const b = new Set([3, 4]);

console.log([...a.union(b)]);                    // [ 1, 2, 3, 4 ]
console.log([...a.intersection(b)]);              // [ 3 ]
console.log([...a.difference(b)]);                 // [ 1, 2 ]
console.log([...a.symmetricDifference(b)]);         // [ 1, 2, 4 ]
console.log(a.isSubsetOf(new Set([1, 2, 3, 4])));    // true
console.log(a.isSupersetOf(b));                        // false
console.log(a.isDisjointFrom(b));                       // false
```

Those methods are recent, so an older runtime needs a loop or a library. Before them, an intersection was a filter:

```js
const shared = [...a].filter((value) => b.has(value));
```

The `has` call inside a filter is the pattern worth remembering either way, because it is O(1) per element where
`b.includes(value)` on an array is O(n).

## WeakMap and WeakSet hold keys without keeping them alive

```js
const timings = new WeakMap();

function measure(record) {
  timings.set(record, Date.now());
}

measure(record);

console.log(timings.has(record));        // true
```

A `WeakMap` accepts only objects as keys, has no `size`, is not iterable and does not keep its keys alive. When
nothing else references a key, the entry disappears, which is what makes it the right container for metadata about an
object you do not own: a cache keyed by the object, a private field before the syntax existed, a flag attached to a
DOM node.

A `Map` holding the same references would keep every key alive for as long as the map exists, which is a memory leak
with no symptom until the process grows.

```js
const processing = new WeakSet();

if (!processing.has(record)) {
  processing.add(record);
  // ...
}
```

A `WeakSet` is the same idea for a yes or no fact, such as "this object is already in the queue".

## Choosing a container

| Need | Container |
| --- | --- |
| A fixed set of named fields | object literal |
| A keyed lookup with keys you cannot name | `Map` |
| Unique values, membership, set algebra | `Set` |
| Order maintained with arbitrary keys | `Map` |
| Metadata about objects you do not own | `WeakMap` or `WeakSet` |
| Sorted keys, range queries | an array you sort, or a library |

`Object.groupBy`, `Map.groupBy` and the `Map` to object conversion cover the shapes that used to need a library, and
the two weak collections are the ones worth learning even though they come up rarely, because the alternative in the
cases they fit is a leak.

## Check yourself

Count occurrences in an array with a `Map`, then dedupe the same array with a `Set` and print both. Then run a union,
an intersection and a difference on two sets, and compare them with the filter version.
