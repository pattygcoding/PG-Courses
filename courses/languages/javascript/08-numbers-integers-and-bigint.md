---
title: Numbers, integers and BigInt
summary: One number type, why 0.1 plus 0.2 is not 0.3, and the integer type you reach for past 2 to the 53.
chapter: Types and coercion
minutes: 13
status: draft
---

## Every number is a double

```js
console.log(typeof 42, typeof 42.5);      // number number
console.log(0.1 + 0.2);                    // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);            // false
console.log((0.1).toFixed(20));             // '0.10000000000000000555'
```

There is one numeric type and it is an IEEE 754 double, so a decimal fraction has no exact binary
representation. `0.1` is stored as the nearest double, and adding two of them gives the nearest double to the
result, which is not the nearest double to `0.3`. Every language with floating point behaves this way.

The practical rules:

- Never compare two computed floats with `===`. Compare the absolute difference against a tolerance.
- Never store money as a float. Store minor units as an integer, or use a decimal library.
- A value that displays as `0.3` may not equal `0.3`, and `toFixed` rounds for display rather than fixing the
  value.

```js
const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;

console.log(close(0.1 + 0.2, 0.3));      // true
```

## Integers are exact up to a limit

```js
console.log(Number.MAX_SAFE_INTEGER);        // 9007199254740991
console.log(9007199254740993);                // 9007199254740992
console.log(Number.isSafeInteger(2 ** 53));    // false
```

A double has 53 bits of mantissa, so every integer up to 2^53 minus 1 is exact and anything above it loses the
low digits. The third line prints a number one smaller than the literal, silently, which is why an identifier
larger than that limit must not be a number.

The limit is the reason database identifiers arrive as strings or as `bigint`. A 64 bit identifier passed
through JSON as a number is already wrong by the time it reaches JavaScript.

## Infinity, NaN and negative zero

```js
console.log(7 / 0);            // Infinity
console.log(-7 / 0);           // -Infinity
console.log(0 / 0);            // NaN
console.log(Number.MAX_VALUE * 2);   // Infinity
```

Division by zero does not throw. It gives `Infinity`, or `NaN` when the numerator is also zero, and both
propagate quietly through the rest of the arithmetic. `Number.isFinite` is the check that catches both:

```js
console.log(Number.isFinite(7 / 0));     // false
console.log(Number.isNaN(0 / 0));         // true
console.log(Number.isNaN('x'));            // false, it is not a number at all
```

The global `isNaN('x')` converts its argument first and returns `true`, while `Number.isNaN('x')` returns
`false` because `'x'` is not the value `NaN`. Use the `Number` version.

`-0` exists and equals `0` under `===`. It shows up when a negative value rounds to zero, and it is only
visible through `Object.is`.

## Formatting

```js
console.log((255).toString(16));         // 'ff'
console.log((1e21).toString());           // '1e+21'
console.log((0.1).toFixed(1));             // '0.1'
console.log((1.005).toFixed(2));            // '1.00'
```

`toString(radix)` handles bases 2 to 36. Past a certain magnitude, `toString` switches to exponential notation
and `toFixed` stops working:

```js
console.log((1e21).toFixed(2));      // '1e+21'
```

`(1.005).toFixed(2)` returning `'1.00'` is the floating point representation again: the stored value is slightly
below 1.005, so it rounds down. Rounding a number for a report through a decimal library is the answer when the
digits matter.

```js
console.log(new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(1234.5));
```

```text
£1,234.50
```

`Intl.NumberFormat` handles separators, currency and locale, and it is the only correct way to format a number
for a person to read. The `Intl` lesson covers the rest of it.

## BigInt for integers beyond the limit

```js
const big = BigInt(2) ** 64n;

console.log(big);                 // 18446744073709551616n
console.log(typeof big);           // 'bigint'
console.log(10n / 3n);             // 3n
console.log(1n === 1);             // false
console.log(1n == 1);              // true
```

A `bigint` is an arbitrary precision integer. Division truncates toward zero, so `10n / 3n` is `3n`, and a
`bigint` never equals a number under `===` because the types differ.

The two types do not mix in arithmetic:

```text
TypeError: Cannot mix BigInt and other types, use explicit conversions
```

Convert explicitly with `BigInt(value)` or `Number(value)`, and remember that the conversion to a number can
lose precision, which is the reason the value was a `bigint` in the first place.

```text
TypeError: Do not know how to serialize a BigInt
```

`JSON.stringify` refuses a `bigint`, so a value that goes over the wire is either a string or a number that has
already lost its precision. Decide which when the identifier is created rather than when it is serialised.

## The methods worth knowing

```js
Number.parseInt('12px', 10);      // 12
Number.parseFloat('12.5%');        // 12.5
Number.isInteger(12.0);             // true
Number.isSafeInteger(2 ** 53);       // false
Math.trunc(4.7);                     // 4
Math.round(-2.5);                    // -2
Math.max(...[1, 5, 3]);               // 5
(5).toString(2).padStart(8, '0');      // '00000101'
```

`Math.round` rounds half toward positive infinity, so `-2.5` becomes `-2`. `Math.trunc` drops the fraction
without rounding, which is what a conversion to an integer usually means. `Number.parseInt` and `parseInt` are
the same function, and the `Number` namespace is the tidier place to find it.

## Check yourself

Print `0.1 + 0.2`, `0.1 + 0.2 === 0.3`, `Number.MAX_SAFE_INTEGER + 1`, `Number.MAX_SAFE_INTEGER + 2` and 2^53 as
a literal. Then compute the same large addition with `bigint` and compare the two answers.
