---
title: Strings and Unicode
summary: UTF-16 code units, why length surprises you, and the methods that handle text properly.
chapter: Types and coercion
minutes: 13
status: draft
---

## A string is a sequence of code units

```js
console.log('😀'.length);                // 2
console.log([...'😀'].length);            // 1
console.log('😀'.codePointAt(0));          // 128512
console.log(String.fromCodePoint(128512));  // '😀'
```

A string is a sequence of UTF-16 code units, and a character outside the basic plane takes two of them. So
`length` is the number of code units, `[0]` and `charAt(0)` return half a character, and a slice at the wrong
index produces a broken string rather than an error.

Spreading a string iterates code points, which is one step closer:

```js
console.log([...'héllo'].length);         // 5
```

A code point is not always one character either. An accented letter can be two code points, and an emoji with a
skin tone or a family group is several joined by zero width joiners:

```js
const family = '👨‍👩‍👧';

console.log(family.length);               // 8
console.log([...family].length);           // 5
console.log([...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(family)].length);   // 1
```

`Intl.Segmenter` with grapheme granularity is the only way to count what a person would call characters. Reach
for it when truncating a display name or a caption, and use `length` when the byte or code unit count is what
matters.

## Accented text compares unequal to the same text typed differently

```js
console.log('é'.normalize('NFC').length);       // 1
console.log('e\u0301'.normalize('NFD').length);   // 2
```

The first string is one code point for `é`. The second is `e` followed by a combining acute accent, which
renders identically and is not equal to it. Text that arrives from a keyboard, a paste or a file can be either
form.

```js
const same = (a, b) => a.normalize('NFC') === b.normalize('NFC');
```

Normalise before comparing, storing or using text as a key. `NFC` is the composed form, which is what most
systems store and what the web standard recommends.

## Reading parts of a string

```js
console.log('abc'.at(1));                    // 'b'
console.log('abc'.at(-1));                    // 'c'
console.log('abc'[9]);                        // undefined
console.log('hello world'.slice(0, 5));        // 'hello'
console.log('hello world'.slice(-5));           // 'world'
```

`at` accepts a negative index and counts from the end, which `charCodeAt` and the bracket form do not. `slice`
takes a start and an end, both optional, and a negative index counts from the end. `substring` swaps its
arguments when the start is greater than the end and `substr` takes a length rather than an end, so `slice` is
the one to remember.

## Searching and replacing

```js
console.log('report.csv'.startsWith('report'));      // true
console.log('report.csv'.endsWith('.csv'));            // true
console.log('a-b-c'.includes('-'));                     // true
console.log('a-b-c'.indexOf('b'));                       // 2
console.log('a-b-c'.replaceAll('-', '+'));                // 'a+b+c'
console.log('  a  '.trim());                               // 'a'
```

`replace` changes the first match and `replaceAll` changes every one, and both accept a string or a regular
expression. `indexOf` returns -1 when nothing matches, which is a value a truthy check gets wrong:

```js
if ('abc'.indexOf('z')) {
  console.log('this runs, because -1 is truthy');
}
```

Use `includes` for a boolean and `indexOf` only when you need the position.

## Padding, repeating and splitting

```js
console.log('abc'.padStart(5, '-'));      // '--abc'
console.log('ab'.repeat(3));               // 'ababab'
console.log('a,b,,'.split(','));            // [ 'a', 'b', '', '' ]
```

An empty field from a trailing comma appears in the result as `''`, so a parser that splits on a delimiter has to
decide what an empty field means rather than assuming it will not happen.

## Template literals and tagged templates

```js
const key = 'report';
const line = `key=${key} value=${1 + 1}`;

console.log(line);         // key=report value=2
```

A template literal interpolates any expression and spans lines without an escape. Conversion of the interpolated
value uses the same rules as `String()`, with one exception worth knowing:

```text
TypeError: Cannot convert a Symbol value to a string
```

A symbol cannot be interpolated, which is deliberate: it would hide the copy that makes an identifier unique.

A tag function receives the literal parts and the values separately, which is how a library escapes or
interprets them:

```js
const tag = (strings, ...values) => strings.raw.join('|') + values.join(',');

console.log(tag`x${1}y${2}z`);       // x|y|z1,2
```

`strings.raw` holds the parts with escapes untouched, which is what `String.raw` uses:

```js
console.log(String.raw`C:\reports\new`);
```

```text
C:\reports\new
```

That is the reason to use a tagged template for a Windows path or a regular expression, where `\n` in a normal
template literal would be a newline.

## Strings are immutable

```js
let text = 'report';
text.toUpperCase();

console.log(text);          // 'report', the call changed nothing
text = text.toUpperCase();   // now it is 'REPORT'
```

Every method returns a new string. Building one in a loop by adding to a variable is fine in every current
engine, which optimises the pattern, so the old advice about array joins is no longer needed.

## Check yourself

Print the `length` and the spread length of a string containing an emoji, and the grapheme count from
`Intl.Segmenter`. Then compare `'é'` typed two ways with and without `normalize`, and split a line with a
trailing delimiter to see the empty field.
