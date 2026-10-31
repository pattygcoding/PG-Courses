---
title: Object literals and computed keys
summary: Five ways to build a key, the order keys come back in, and the three tests for whether a key exists.
chapter: Objects and classes
minutes: 13
status: draft
---

## Building an object

```js
const key = 'report';
const value = 128;

const record = {
  key,                                  // shorthand
  value,
  ['total_' + key]: value * 2,           // computed
  tags: ['a', 'b'],
  describe() {                          // method shorthand
    return `${this.key}: ${this.value}`;
  },
};

console.log(record.total_report);        // 256
```

The shorthand form uses the variable name as the key, which is what makes `{ key, value }` from two parameters work.
A computed key is any expression in brackets, evaluated once when the literal is built.

Later keys overwrite earlier ones, which is how a spread with an override works:

```js
const base = { level: 'info', verbose: false };
const options = { ...base, verbose: true };

console.log(options);       // { level: 'info', verbose: true }
```

That is the immutable update pattern in one line, and it is worth remembering that the spread copies the properties
rather than the objects they point at.

## Reading a key

```js
console.log(record.key);            // dot, for a known name
console.log(record['key']);          // brackets, for a computed name
console.log(record.missing?.key);     // undefined rather than a TypeError
```

Use a dot for a name you can see in the source, since it is checked by tooling and by the reader. Brackets are for a
key that is data, such as a column name from a file, and that is also where the value must be checked before use.

```text
TypeError: Cannot read properties of undefined (reading 'key')
```

That error names the access, not the value that was wrong, so the fix is upstream: find out why the object is
undefined. The optional chain `?.` stops the error and gives `undefined`, which is convenient and also removes the
signal, so use it where the absence is expected rather than to silence a bug.

## Three tests for whether a key exists

```js
const record = { key: 'a', value: undefined };

console.log('key' in record);                 // true
console.log(Object.hasOwn(record, 'key'));     // true
console.log('value' in record);                 // true
console.log(record.value !== undefined);         // false
```

`in` and `Object.hasOwn` answer the question properly. Comparing against `undefined` cannot tell a missing key from
a key whose value is `undefined`, which matters when a value is genuinely absent rather than unset.

The difference between `in` and `Object.hasOwn` is the prototype chain: `'toString' in record` is true because `in`
walks the chain, and `Object.hasOwn(record, 'toString')` is false because the object does not have the method
itself. Use `Object.hasOwn` for data.

## Key order

```js
const record = { b: 1, 2: 2, a: 3, 1: 1 };

console.log(Object.keys(record));      // [ '1', '2', 'b', 'a' ]
```

Integer-like keys come first in ascending numeric order, and the rest follow in insertion order. A string that looks
like an integer but is not, such as `'01'`, counts as an ordinary key. That rule explains why a JSON document can
come back reordered and why relying on key order for anything but insertion order is unsafe.

## Iterating and rebuilding

```js
const record = { key: 'a', value: 1 };

for (const [name, value] of Object.entries(record)) {
  console.log(name, value);
}

const doubled = Object.fromEntries(
  Object.entries({ a: 1, b: 2 }).map(([name, value]) => [name, value * 2]),
);

console.log(doubled);        // { a: 2, b: 4 }
```

`Object.keys`, `Object.values` and `Object.entries` each allocate an array of the object's own enumerable keys.
`Object.fromEntries` takes an iterable of pairs, so a `Map` and an object of pairs meet in the middle:

```js
console.log(Object.fromEntries(new Map([['a', 1]])));    // { a: 1 }
```

## Grouping

```js
const records = [
  { key: 'a', level: 'info' },
  { key: 'b', level: 'warn' },
  { key: 'c', level: 'info' },
];

const byLevel = Object.groupBy(records, (record) => record.level);

console.log(Object.keys(byLevel));      // [ 'info', 'warn' ]
console.log(byLevel.info.length);         // 2
```

`Object.groupBy` and `Map.groupBy` collect elements into groups by a key function, which replaces the hand written
`reduce` everyone wrote before. The difference between them is the container of the result, and a `Map` is the one
to use when the keys are not strings.

```js
const lengths = Object.groupBy(['a', 'bb', 'cc'], (word) => word.length);

console.log(Object.keys(lengths));       // [ '1', '2' ]
```

Neither method is in an older runtime, so a polyfill or a `reduce` is needed if the code runs there.

## Deleting a key

```js
const record = { key: 'a', value: 1 };

delete record.value;

console.log(record);               // { key: 'a' }
console.log('value' in record);      // false
```

`delete` removes the key, and on an object used heavily it can push the engine into a slower shape because the set
of keys is expected to be stable across objects of the same kind. Building a new object without the key is usually
the better move:

```js
const { value, ...withoutValue } = record;
```

## Nested access

```js
const record = { meta: { tags: ['a'] } };

console.log(record.meta.tags[0]);                  // 'a'
console.log(record.meta?.tags?.[1] ?? 'none');       // 'none'
```

A chain of optional access returns `undefined` at the first missing link, and `??` supplies the default. That is the
way to read a shape you do not control, and the next lesson covers the same idea with destructuring.

## Check yourself

Build an object with a shorthand property, a computed key and a method. Print `Object.keys` for an object mixing
integer-like and string keys, and check for a key whose value is `undefined` with all three tests.
