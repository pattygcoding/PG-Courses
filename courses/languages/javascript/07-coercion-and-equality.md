---
title: Coercion and equality
summary: How a value turns into another type, the seven falsy values, and why === is the only comparison to write.
chapter: Types and coercion
minutes: 14
status: draft
---

## The eight falsy values

```js
const values = [false, 0, -0, 0n, '', null, undefined, NaN];
const truthy = [[], {}, '0', 'false', ' ', -1, Infinity];

console.log(values.every((value) => !value));      // true
console.log(truthy.every((value) => Boolean(value)));   // true
```

Everything else is truthy, including an empty array and an empty object. `'0'` and `'false'` are non-empty
strings, so both are truthy, which is why `if (input)` is not a check for "the user did not type anything".

## `+` is the only operator that prefers text

```js
console.log('5' + 1);      // '51'
console.log('5' - 1);      // 4
console.log(1 + true);      // 2
console.log([] + []);       // ''
console.log([] + {});       // '[object Object]'
console.log([1, 2] + [3]);   // '1,23'
```

`+` concatenates when either operand becomes a string, and adds when both become numbers. Every other arithmetic
operator converts to a number, which is why `-` on two strings gives the number you expected and `+` gives a
concatenation.

An array becomes a string by joining its elements with a comma, so `[]` becomes `''` and `[1, 2]` becomes `'1,2'`.
An object becomes `'[object Object]'` unless it defines its own conversion. Those two facts explain every
`'[object Object]'` that has ever appeared in a user's browser.

## To a number, and from a number

```js
console.log(+[]);               // 0
console.log(+{});               // NaN
console.log(+'0b101');           // 5
console.log(Number('12px'));     // NaN
console.log(parseInt('12px'));    // 12
console.log(Number(''));          // 0
```

`Number` converts the whole string and gives `NaN` if any part does not fit. `parseInt` reads as much as it can
from the left and ignores the rest, which is convenient for `'12px'` and dangerous for anything else. Pass the
radix explicitly when parsing an identifier that may have a leading zero:

```js
console.log(parseInt('08', 10));      // 8
```

`Number('')` is `0` and `Number('  ')` is `0`, so empty input becomes a valid zero rather than an error. That is
a common source of a value that is quietly wrong, and a trim and a check is the fix.

## Converting to a string

```js
console.log(String(42));            // '42'
console.log(String(null));           // 'null'
console.log(`${undefined}`);          // 'undefined'
console.log([1, 2].toString());       // '1,2'
console.log(JSON.stringify({ a: 1 }));  // '{"a":1}'
```

Template literals and `String()` convert with the same rules. `JSON.stringify` is a different operation: it
produces JSON, which is valid only for the types JSON has, and it drops a function or an `undefined` property
rather than converting it.

## Loose equality has its own algorithm

```js
console.log(null == undefined);     // true
console.log(null === undefined);    // false
console.log('0' == false);           // true
console.log('' == 0);                // true
console.log([] == false);            // true
console.log('0' === false);          // false
```

`==` converts the operands to a common type, and the algorithm behind those conversions is long enough that no
one remembers it. That is the whole argument for `===`: it compares type first, so a value of one type is never
equal to a value of another.

The one case worth keeping is the double check for nullish, because it reads as a sentence and covers both
missing values:

```js
if (value == null) {
  console.log('missing');
}
```

## `Object.is` and the two values `===` gets wrong

```js
console.log(NaN === NaN);            // false
console.log(Object.is(NaN, NaN));    // true
console.log(Object.is(0, -0));       // false
console.log(0 === -0);                // true
```

A `NaN` is not equal to itself under `===`, which is why `Number.isNaN` and `Number.isFinite` exist and why
`[NaN].includes(NaN)` is true while `[NaN].indexOf(NaN)` is -1. The `includes` method uses `Object.is`-like
semantics for `NaN` and treats `0` and `-0` as equal, which is the comparison the language calls SameValueZero.

## Comparisons compare strings character by character

```js
console.log(1 < 2 < 3);      // true
console.log(3 > 2 > 1);      // false
```

The second line is not a typo. `3 > 2` is `true`, and `true > 1` compares `true` with `1`, which converts `true`
to `1`, so the answer is false. Comparisons do not chain, and writing them in a chain is how a range check becomes
always true.

```js
console.log([1, 10, 2].sort());       // [ 1, 10, 2 ]
```

Sorting converts to strings by default for the same reason: without a comparator, order is by text. The sorting
lesson covers the fix.

## Check yourself

Evaluate `'5' + 1`, `'5' - 1`, `[] + {}`, `+[]`, `+'12px'`, `Number('12px')` and `parseInt('12px')`, and explain
each result. Then find a `==` in a codebase you know and say whether `===` would change the behaviour.
