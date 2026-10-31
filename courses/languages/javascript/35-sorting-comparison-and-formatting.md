---
title: Sorting, comparison and formatting
summary: The comparator contract, locale-aware ordering, and the Intl types that format for a person.
chapter: Arrays and data
minutes: 14
status: draft
---

## Sort converts to strings by default

```js
console.log([10, 9, 1].sort());                       // [ 1, 10, 9 ]
console.log([10, 9, 1].sort((a, b) => a - b));        // [ 1, 9, 10 ]
```

Without a comparator, `sort` converts each element to a string and compares the text, which puts `10` before `9`. The
default is right for a list of words and wrong for everything else, and numeric data is the case that catches people
because it looks like it worked on a small example.

## A comparator returns a number

```js
const byValue = (a, b) => a.value - b.value;

records.toSorted(byValue);
```

Negative means the first argument comes first, positive means it comes second, and zero means the order between them
is not decided. A comparator that returns a boolean is the common mistake, and it does not throw:

```js
console.log([3, 1, 2].sort((a, b) => a > b));        // [ 3, 1, 2 ], unchanged
```

`a > b` is `true` or `false`, which convert to `1` and `0`. Nothing returns a negative number, so the sort decides
that no element should move and the array comes back as it was.

`sort` mutates and returns the array, and the copy is `toSorted`. The sort is stable, which has been guaranteed since
2019, so elements that a comparator reports as equal keep their relative order:

```js
const rows = [
  { level: 'a', value: 2 },
  { level: 'a', value: 1 },
];

console.log(rows.toSorted((x, y) => x.level.localeCompare(y.level)));
```

```text
[ { level: 'a', value: 2 }, { level: 'a', value: 1 } ]
```

Stability is what makes a two-key sort work: sort by the second key first, then by the first, and the ties keep the
order from the first pass.

## Several keys

```js
const order = (a, b) =>
  a.level.localeCompare(b.level) ||
  b.value - a.value ||
  a.key.localeCompare(b.key);

records.toSorted(order);
```

`localeCompare` returns a number, so `||` moves to the next comparison whenever a key ties. That chain is compact and
gets unreadable past three keys, where a comparator factory is clearer:

```js
const by = (...comparators) => (a, b) => {
  for (const compare of comparators) {
    const result = compare(a, b);

    if (result !== 0) {
      return result;
    }
  }

  return 0;
};
```

## Missing values need a rule

```js
const byValue = (a, b) => (a.value ?? -Infinity) - (b.value ?? -Infinity);

records.toSorted(byValue);       // records with no value come first
```

`undefined - number` is `NaN`, and a comparator that returns `NaN` leaves the order undefined and engine-dependent.
Decide where the missing values go, in the comparator, so the output of the report is the same on every run.

## Locale-aware ordering

```js
const collator = new Intl.Collator('en');

console.log(['b', 'a', 'C'].sort());                          // [ 'C', 'a', 'b' ]
console.log(['b', 'a', 'C'].sort(collator.compare));            // [ 'a', 'b', 'C' ]
```

The default sort compares UTF-16 code units, so every uppercase letter comes before every lowercase one. A collator
orders text the way a reader of that language expects, and it handles accents, case and scripts.

```js
console.log(['file10', 'file2'].sort(new Intl.Collator('en', { numeric: true }).compare));
```

```text
[ 'file2', 'file10' ]
```

The `numeric` option compares embedded numbers as numbers, which is what a list of filenames, versions or hostnames
wants. Other options worth knowing are `sensitivity` for whether case and accents matter, and `caseFirst`.

Build the collator once and reuse it. `localeCompare` creates one on every call, which is measurable in a comparator
over ten thousand records.

## Formatting numbers

```js
const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

console.log(gbp.format(1234.5));                                   // '£1,234.50'
console.log(new Intl.NumberFormat('en-GB', { notation: 'compact' }).format(1234567));   // '1.2M'
console.log(new Intl.NumberFormat('en-GB', { style: 'percent' }).format(0.075));         // '8%'
```

`Intl.NumberFormat` handles grouping, the decimal separator, the currency symbol and the compact notation, and it is
the only correct way to put a number in front of a person. The `maximumFractionDigits` option is what a report uses to
fix the precision without `toFixed`, which does not know about locales.

## Formatting dates

```js
const medium = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' });

console.log(medium.format(new Date('2024-03-01T12:00:00Z')));
```

```text
1 Mar 2024
```

`DateTimeFormat` takes the same kind of options, with `dateStyle` and `timeStyle` as the short forms and field options
such as `year`, `month` and `hour` for anything specific. Naming a `timeZone` is what makes the output of a test or a
report deterministic, because otherwise it follows the machine the code runs on.

```js
console.log(new Date('2024-03-01').toISOString());      // '2024-03-01T00:00:00.000Z'
```

`toISOString` is the machine-readable form, always UTC, always the same width. Use it for storage and for the wire,
and `Intl` for anything a person reads.

## Units and lists

```js
console.log(new Intl.NumberFormat('en-GB', { style: 'unit', unit: 'megabyte' }).format(128));
console.log(new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' }).format(['a', 'b', 'c']));
```

```text
128 MB
a, b and c
```

`ListFormat` is the one that produces a correct sentence for a list rather than `a, b, c` with a comma where a reader
expects the word and. It is a small thing that a user notices immediately.

## Check yourself

Sort the same array of numbers with and without a comparator and explain both results. Then sort a list of filenames
with a numeric collator and a list of names with a plain collator, and format one number as currency and one date in
medium style.
