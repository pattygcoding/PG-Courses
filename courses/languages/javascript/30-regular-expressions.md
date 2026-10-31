---
title: Regular expressions
summary: Groups, flags and the global state that makes a test loop wrong, plus the patterns that can hang your process.
chapter: Control flow, errors and regular expressions
minutes: 14
status: draft
---

## A literal or a constructor

```js
const pattern = /\d+/g;
const same = new RegExp('\\d+', 'g');

console.log(pattern.test('a12'));      // true
```

The literal form is compiled once when the script loads and cannot be changed. The constructor takes a string, which
is what a pattern built from data needs, and the cost is that every backslash needs escaping: `\\d` in a string where
`\d` appears in a literal.

```js
function hasTag(name, text) {
  const safe = name.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\[${safe}\\]`).test(text);
}
```

Building a pattern from a user's input without escaping it is a bug and a way of making a regular expression say
something other than intended. The escape above is the one to copy.

## The flags

| Flag | Effect |
| --- | --- |
| `g` | find every match rather than the first |
| `i` | case insensitive |
| `m` | `^` and `$` match at line breaks |
| `s` | `.` matches a newline as well |
| `u` | full Unicode mode, which is what `\p{...}` needs |
| `y` | sticky: match at `lastIndex` and nowhere else |
| `d` | include match indices in the result |
| `v` | the Unicode sets mode, a superset of `u` |

`u` is worth adding by default. Without it, a pattern works on the first 65,536 code points and behaves incorrectly on
anything outside that range.

## The global flag holds state

```js
const pattern = /a/g;

console.log(pattern.test('a'), pattern.lastIndex);    // true 1
console.log(pattern.test('a'), pattern.lastIndex);     // false 0
console.log(pattern.test('a'), pattern.lastIndex);      // true 1
```

A regular expression with `g` remembers where the last match ended, so the second call starts after the first match
and fails on a one character string. Testing a pattern in a loop then alternates between true and false, and the same
state makes `exec` behave the same way. Two ways out:

```js
const pattern = /a/g;
pattern.lastIndex = 0;              // reset, which is easy to forget
```

```js
const pattern = /a/;                 // no g: no state, nothing to reset
```

The habit worth keeping is the second: use `g` only where you want every match, such as `matchAll`, `replaceAll` or a
`while` loop over `exec`, and leave it off for a single test.

```js
const pattern = /\d+/g;
let match;

while ((match = pattern.exec(text)) !== null) {
  console.log(match[0], match.index);
}
```

That loop is the manual form, and `for (const found of text.matchAll(/\d+/g))` is the readable version. `matchAll`
requires the `g` flag and throws without it.

## Groups

```js
const date = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/;
const parts = date.exec('2024-03-01');

console.log(parts.groups.year, parts[1], parts.index);
```

A capturing group is a pair of parentheses, and it lands in the result by position and by name when it has one. A
group written `(?:...)` does not capture, which is what to use when the parentheses are there for grouping rather than
for reading a value:

```js
const price = /(?:GBP|USD) (\d+\.\d{2})/;
```

A backreference `\1` matches the same text a group matched, which is how a repeated character is expressed:

```js
console.log(/(\w)\1/.test('hello'));       // true, the double l
```

## Anchors, classes and quantifiers

```js
console.log(/^\d+$/.test('12a'));             // false
console.log(/^\d+$/.test('123'));               // true
console.log(/\bcat\b/.test('the cat sat'));       // true
console.log(/colou?r/.test('color'));              // true
console.log(/ab+?/.exec('abbb')[0]);                // 'ab', lazy rather than greedy
```

`\d`, `\w`, `\s` and their uppercase forms are shortcuts. `^` and `$` are the start and end of the string unless the
`m` flag makes them line boundaries. A quantifier is greedy by default and takes as much as it can, and adding `?`
makes it lazy so it takes as little as possible, which is what stops `.*` swallowing the rest of a line.

## Replacing with more than a string

```js
console.log('a-b-c'.replaceAll(/-(.)/g, (match, letter) => `+${letter.toUpperCase()}`));
console.log('a-b-c'.replace(/-(.)/, '+$1'));
```

```text
a+B+C
a+b-c
```

A replacement function receives the match, the groups and the offset, which is what a transformation that depends on
what matched needs. A string replacement uses `$1` for a group, `$&` for the whole match and `$<name>` for a named
one.

## Unicode property escapes

```js
console.log(/\p{Letter}+/u.test('abc'));      // true
console.log(/^\p{Letter}$/u.test('é'));         // true
```

`\p{...}` matches a Unicode property and needs the `u` or `v` flag. `\p{Letter}`, `\p{Number}`, `\p{Script=Greek}`
and `\p{Emoji}` cover the checks that used to need a long character class, and they are the correct way to ask whether
a character is a letter in any script.

## Where a regular expression is the wrong tool

```js
const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

That check rejects plainly wrong input and accepts plenty of nonsense, which is the honest limit of what a pattern
can do for an email address. Verifying one means sending a message to it. The same applies to a URL, a phone number
and a postal address: a pattern that tries to be exact is long, slow and still wrong at the edges.

Parsing structured text is the other case. A pattern over HTML or JSON produces something that works until the input
has a nested case, and a parser is the answer. Reach for a regular expression when the text is regular, which covers
most tokenisers, log lines and simple delimited formats.

## Catastrophic backtracking

```js
const pattern = /^(a+)+$/;      // do not copy this one
```

That pattern matches a run of `a`, and the nested quantifier gives the engine many ways to divide the same run. On
input that almost matches and then fails, the number of combinations grows exponentially, so a short string can keep a
core busy for minutes. A hostile string in a request body is enough to take a service down.

Three things to do about it:

- Avoid a quantifier inside a quantifier over the same characters, which is the shape above.
- Prefer a specific class such as `\d` to `.`, and an anchor to a scan, because both cut the alternatives the engine
  has to try.
- Run an untrusted pattern against a timeout, or use a library that is not a backtracking engine.

## Check yourself

Run `test` three times in a row with a pattern that has the `g` flag and explain the alternating results, then replace
it with `matchAll`. Then write one pattern with a named group and a lazy quantifier and print the groups from `exec`.
