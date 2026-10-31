---
title: Primitives and objects
summary: Seven primitive types, everything else, and the difference between copying a value and sharing one.
chapter: Types and coercion
minutes: 13
status: draft
---

## Seven primitives

```js
typeof 'text'        // 'string'
typeof 42            // 'number'
typeof 42n           // 'bigint'
typeof true          // 'boolean'
typeof undefined     // 'undefined'
typeof Symbol('id')  // 'symbol'
typeof null          // 'object'
```

The last line is a bug from the first version of the language that was never fixed, so a null check cannot use
`typeof`. Compare against `null` directly, and use `=== null` rather than a falsy check, because `0` and `''`
are also falsy.

Everything that is not a primitive is an object: an array, a function, a date, a regular expression, a `Map`, a
class instance, and `{}`.

```js
typeof []                      // 'object'
typeof function () {}          // 'function'
Array.isArray([])               // true
Array.isArray({})               // false
null instanceof Object          // false
```

`typeof` reports `'function'` for anything callable, which is a kind of object with a call behaviour. `Array.isArray`
is the test for an array because `typeof` cannot tell one from a plain object.

## Primitives are copied, objects are shared

```js
let a = 1;
let b = a;
b = 2;

console.log(a);            // 1, unchanged

const first = { key: 'a' };
const second = first;
second.key = 'b';

console.log(first.key);    // 'b', the same object
```

A primitive is copied on assignment, and each variable holds its own value. An object is not copied: both names
point at one object, so a change through either name is visible through the other.

That difference reaches into every function you write:

```js
function rename(record) {
  record.key = 'renamed';        // visible to the caller
}

function replace(record) {
  record = { key: 'new' };        // local only, the caller sees nothing
}
```

The first changes the object the caller passed. The second rebinds the local parameter to a different object and
leaves the caller's object alone. Neither is wrong; confusing the two is how a function appears not to work.

## Arrays are objects with a length

```js
const values = [1, 2, 3];

values.push(4);              // the object changes
console.log(values.length);   // 4
```

`const` stops the name being rebound, and nothing more:

```js
const values = [1, 2, 3];
values = [4];                 // TypeError: Assignment to constant variable
values.push(4);                // fine, the array itself changed
```

Use `const` by default and reach for a frozen object when the contents must not change, which is a later lesson.

## Why `'abc'.length` works on a primitive

```js
console.log('abc'.length);          // 3
console.log('abc'.toUpperCase());    // 'ABC'

const boxed = new String('abc');
console.log(typeof boxed);            // 'object'
console.log(boxed === 'abc');          // false
```

A string is a primitive with no properties. When you read one, the engine wraps it in a temporary `String` object,
reads the property and throws the wrapper away. That is why a method call works and why it cannot change the
original: `'abc'.toUpperCase()` returns a new string.

`new String('abc')` creates a real object, which is one of the few things in the language with no good use. It is
truthy when empty, it does not compare equal to its own text, and `typeof` says `object`.

## Arguments are passed by value

```js
function addTag(record, tag) {
  record.tags = [...(record.tags ?? []), tag];
}

const row = { key: 'a' };
addTag(row, 'new');

console.log(row.tags);       // [ 'new' ]
```

The reference to the object was copied into the parameter, which is why the function can change what the object
contains. The `[...]` builds a new array rather than mutating the old one, which is a habit the immutability
lesson comes back to.

## Check yourself

Print `typeof` for a string, a number, a bigint, a boolean, `undefined`, a symbol, `null`, an array, a function
and a `Map`. Then pass an object to two functions, one that mutates a property and one that reassigns the
parameter, and print the object after each.
