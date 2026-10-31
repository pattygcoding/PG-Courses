---
title: Destructuring and optional chaining
summary: Pulling values out by shape, defaulting when they are missing, and reading a chain that may not exist.
chapter: Objects and classes
minutes: 13
status: draft
---

## Object destructuring

```js
const record = { key: 'a', value: 1, level: 'info' };

const { key, level } = record;

const { value: size } = record;            // rename
const { missing = 'none' } = record;        // default

console.log(key, size, missing);            // 'a' 1 'none'
```

A default applies when the value is `undefined`, and not when it is `null`, `0` or `''`. That is the same rule as a
parameter default and the opposite of what `||` does, which is why `??` exists:

```js
const { level = 'info' } = { level: null };

console.log(level);          // null, the default did not apply
```

## Nested and rest

```js
const report = {
  key: 'a',
  meta: { tags: ['x', 'y'], owner: 'ada' },
};

const { meta: { owner }, meta: { tags: [first] } } = report;

const { key, ...rest } = report;

console.log(owner, first);      // 'ada' 'x'
console.log(rest);               // { meta: { tags: [ 'x', 'y' ], owner: 'ada' } }
```

A rest element collects what is left into a new object, which is the immutability pattern for removing a field or
overriding one:

```js
const updated = { ...rest, key: 'b' };
```

## Array destructuring

```js
const [first, second = 0, ...others] = [1];

console.log(first, second, others);      // 1 0 []

const [, , third] = ['a', 'b', 'c'];      // skip with empty slots
const [head, ...tail] = ['a', 'b', 'c'];

console.log(third, head, tail);            // 'c' 'a' [ 'b', 'c' ]
```

Any iterable destructures, not only an array:

```js
const [a, b] = new Set([1, 2]);
const [c] = 'text';

console.log(a, b, c);        // 1 2 't'
```

Swapping two variables needs no temporary:

```js
let a = 1;
let b = 2;

[a, b] = [b, a];

console.log(a, b);           // 2 1
```

## Destructuring in a parameter

```js
function render({ key, value = 0 }, { indent = 2 } = {}) {
  return { key, value, indent };
}

console.log(render({ key: 'a' }));       // { key: 'a', value: 0, indent: 2 }
```

Destructuring `undefined` throws, so a parameter that is itself optional needs a default of an empty object. That is
the `= {}` on the second parameter, and forgetting it is the most common error in a function like this.

```js
for (const [index, value] of Object.entries(record)) {
  console.log(index, value);
}
```

A `for...of` over `Object.entries`, a `Map` or a list of pairs destructures each pair at the top of the loop, which is
why `[key, value]` appears so often in current code.

## Optional chaining

```js
const record = { meta: { tags: ['x'] } };

console.log(record.meta?.owner);             // undefined
console.log(record.missing?.tags);            // undefined
console.log(record.meta?.tags?.[5]);           // undefined
console.log(record.optional?.());               // undefined
```

`?.` stops the whole chain and returns `undefined` when the value to its left is `null` or `undefined`. It works on a
property, an index and a call. It only guards the part of the chain to its left, so `record.missing.tags` still
throws while `record.missing?.tags` does not.

## The default for a missing value

```js
console.log(record.meta?.owner ?? 'nobody');      // 'nobody'
console.log(record.meta?.count ?? 0);              // 0
```

`??` uses the right side only for `null` and `undefined`, so a `0` or an `''` survives:

```js
console.log(0 ?? 5);          // 0
console.log(0 || 5);           // 5, the left side is falsy
```

`||` is right for "use the default when this is empty", and `??` is right for "use the default when this is
missing". Choosing the wrong one turns a legitimate zero or empty string into the default, which is a bug that
appears only when someone enters zero.

## A computed key in a pattern

```js
const column = 'value';
const { [column]: cell } = record;

console.log(cell);        // 1
```

That reads one field by a name that is itself data, which is what a report generator mapping a column definition to a
field needs. It is the destructuring equivalent of `record[column]`.

## Where destructuring stops helping

```js
const { a: { b: { c: { d } } } } = deep;
```

Three levels of nesting in a pattern is hard to read and hard to change. Take the outer object and destructure it on
the next line, or pass the value you need to a function that knows its own shape.

## Check yourself

Destructure a nested object with a rename, a default and a rest element, and print the parts. Then read a two level
chain with `?.`, supply a default with `??`, and compare the result of the same expression using `||`.
