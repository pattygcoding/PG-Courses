---
title: Locale-aware text
summary: Case, collation, word boundaries and plural rules, all of which differ by language.
chapter: Generators and metaprogramming
minutes: 12
status: draft
---

## Uppercase and lowercase are locale dependent

```js
console.log('ISTANBUL'.toLowerCase());                  // 'istanbul'
console.log('ISTANBUL'.toLocaleLowerCase('tr'));          // 'ıstanbul'
```

Turkish has a dotless `ı` and a dotted `İ`, and the mapping between cases is different from English. Code that
compares or matches text after a case conversion needs the locale, and a locale-insensitive comparison can be wrong
for a language whose rules you did not know about.

```js
console.log('İ'.toLocaleLowerCase('tr').length);       // 1
console.log('İ'.toLowerCase().length);                  // 2
```

The English rule turns `İ` into `i` followed by a combining dot, which is two code units. That is the reason
`toUpperCase` on a string is not length preserving either, and why a case-insensitive database index is a database
feature rather than something to build in JavaScript.

```js
const folded = (text) => text.normalize('NFC').toLocaleLowerCase('en');
```

Normalise and fold with a stated locale when the comparison has to be stable, and keep the original text for display.

## Collation orders text the way a reader expects

```js
const german = new Intl.Collator('de');

console.log(['z', 'a', 'ä'].sort());                     // [ 'a', 'z', 'ä' ]
console.log(['z', 'a', 'ä'].sort(german.compare));          // [ 'a', 'ä', 'z' ]
```

The default sort puts `ä` after `z`, because the code unit for `ä` is higher. A collator for the language puts it next
to `a`, which is the order a German reader expects. The options are worth knowing:

| Option | Effect |
| --- | --- |
| `numeric` | `file2` before `file10` |
| `sensitivity` | whether case and accents matter |
| `caseFirst` | uppercase or lowercase first |
| `usage` | `'sort'` for ordering, `'search'` for matching |

`usage: 'search'` is the one to use for a filter box, because it treats a query as a comparison rather than an order
and handles the differences between scripts better.

## Segmenter finds the boundaries

```js
const words = new Intl.Segmenter('en', { granularity: 'word' });
const segments = [...words.segment('one two')].map((part) => part.segment);

console.log(segments);           // [ 'one', ' ', 'two' ]
```

`split(' ')` breaks on spaces and gets punctuation, multiple spaces and scripts without spaces wrong. A segmenter
returns every segment including the separators, with an `isWordLike` flag, so a word count filters on that flag rather
than guessing.

```js
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

console.log([...graphemes.segment('a\u0301b')].length);       // 2
```

Grapheme granularity is what a truncation needs. Slicing a display name at 20 characters by code unit can cut an
accent off a letter or leave half an emoji; counting graphemes is the only version that matches what a person sees.

```js
function truncate(text, limit) {
  const parts = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text)];
  return parts.length <= limit ? text : `${parts.slice(0, limit - 1).map((p) => p.segment).join('')}…`;
}
```

## Plural rules

```js
const plural = new Intl.PluralRules('en');

console.log(plural.select(1), plural.select(0), plural.select(2));
```

```text
one other other
```

English has two forms; Polish has four and Arabic has six. `select` returns the category name, and the category maps to
a message in whatever translation system the project uses. The alternative, `count === 1 ? 'file' : 'files'`, is wrong in
most languages, and it is the kind of bug that only a reader of that language notices.

```js
const messages = { one: '# file', other: '# files' };

messages[plural.select(count)].replace('#', String(count));
```

## Relative time

```js
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

console.log(relative.format(-1, 'day'), relative.format(3, 'day'), relative.format(-2, 'hour'));
```

```text
yesterday in 3 days 2 hours ago
```

With `numeric: 'auto'`, one day ago becomes `yesterday` rather than `1 day ago`, which is what a reader prefers. The
list of units covers seconds through years, and the plural handling is inside the formatter.

## Names for languages and regions

```js
const regions = new Intl.DisplayNames(['en'], { type: 'region' });
const languages = new Intl.DisplayNames(['en'], { type: 'language' });

console.log(regions.of('GB'), regions.of('US'), languages.of('fr'));
```

```text
United Kingdom United States French
```

Every code comes back as a name in the reader's language without a table in the repository. `Intl.DisplayNames` also
handles currency, script and calendar codes, which is how a settings page shows a currency name rather than `GBP`.

## Building these objects is the expensive part

```js
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
```

Constructing an `Intl` formatter compiles locale data, which takes milliseconds. Creating one inside a loop or a render
function is a real cost, so build them once at module scope and reuse them.

Support also varies. Node ships full ICU data, while a small browser build or a stripped runtime may have only English,
in which case a formatter silently falls back rather than failing. A library that has to be exact about that checks
`Intl.NumberFormat.supportedLocalesOf(['pl'])` and handles an empty result.

## Check yourself

Lowercase the word `ISTANBUL` with and without the Turkish locale and compare. Then sort three accented words with a
collator and without, count the graphemes in a string with a combining accent, and format a plural for one and for two.
