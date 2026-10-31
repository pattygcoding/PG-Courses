---
title: Dates, times and durations
summary: One type holding a timestamp, the arithmetic it does not do, and the forms that are safe to store.
chapter: Generators and metaprogramming
minutes: 13
status: draft
---

## A Date is a number of milliseconds

```js
const at = new Date('2024-03-01T00:00:00Z');

console.log(at.getTime());              // 1709251200000
console.log(+at);                        // the same number
console.log(new Date(0).toISOString());   // '1970-01-01T00:00:00.000Z'
```

A `Date` holds one number, the milliseconds since the epoch in UTC, and every getter formats that number into fields.
It has no time zone of its own and no calendar, only a display rule applied on read.

Two getters return different values for the same instant, and mixing them is the most common date bug:

```js
const at = new Date('2024-03-01T12:00:00Z');

console.log(at.getHours());          // depends on the machine's time zone
console.log(at.getUTCHours());        // 12, always
console.log(at.toISOString());         // '2024-03-01T12:00:00.000Z'
```

Use the `UTC` getters or `toISOString` for anything that has to be the same everywhere, and the local ones only at the
point a value is shown to a person.

## Parsing is not as consistent as it looks

```js
console.log(new Date('2024-03-01').toISOString());          // '2024-03-01T00:00:00.000Z'
console.log(new Date('2024-03-01T00:00:00').toISOString());   // local time, not UTC
```

A date only ISO string is treated as UTC, and adding a time without an offset makes it local. Mixing the two forms in
one codebase produces values that are hours apart, which is the bug that appears when a service runs in a different
zone from the machine that wrote the test.

A non-ISO format such as `2024/03/01` is parsed by the engine's own heuristics and the result is implementation
defined, so it can differ between engines. Two rules follow: always write ISO with an explicit `Z` or offset, and
parse with `Date.parse` only for a format you control.

```js
console.log(new Date('nonsense').toString(), Number.isNaN(new Date('nonsense').getTime()));
```

```text
Invalid Date true
```

An unparseable string gives an invalid date rather than throwing, and `getTime()` returns `NaN`, so every later
comparison is false and every arithmetic result is `NaN`. Check `Number.isNaN(date.getTime())` at the boundary where
the value arrives.

## Arithmetic goes through the fields

```js
const jan31 = new Date('2024-01-31T00:00:00Z');
jan31.setUTCMonth(jan31.getUTCMonth() + 1);

console.log(jan31.toISOString());        // '2024-03-02T00:00:00.000Z'
```

February has no 31st, so the date rolls over into March, and the answer shifts again in a leap year. "One month later"
is not a well defined operation on a `Date`, which is one of the reasons the type is being replaced by `Temporal`.

Adding a fixed amount of time is exact, because it is arithmetic on the timestamp:

```js
const later = new Date(Date.now() + 90 * 60 * 1000);

console.log(later.toISOString());
```

Adding days that way crosses a daylight saving transition as exactly 24 hours, so a local time computed from it can
land an hour off. Adding days to a calendar date means the fields, and adding a duration means the timestamp.

## Comparing and measuring

```js
const start = new Date('2024-03-01T00:00:00Z');
const end = new Date('2024-03-02T00:00:00Z');

console.log(start < end);            // true
console.log(end - start);             // 86400000, the difference in milliseconds
```

A comparison converts the date to its number, so `<` and `>` work and `===` does not, because it compares two objects
by reference. Use `getTime()` when the intent is equality:

```js
console.log(start.getTime() === new Date('2024-03-01T00:00:00Z').getTime());    // true
```

For elapsed time inside a process, `performance.now()` is the right clock: it is monotonic, so a system clock
adjustment does not make a duration negative.

```js
const started = performance.now();

work();

console.log(`${(performance.now() - started).toFixed(1)} ms`);
```

## What to store and send

| Form | Use for |
| --- | --- |
| ISO string with `Z` | storing and sending an instant |
| epoch milliseconds | a compact number, or an index |
| `Intl.DateTimeFormat` | showing a value to a person |
| `YYYY-MM-DD` | a calendar date with no time |

An ISO string is readable, sorts lexicographically in the same order as it does chronologically, and every language
can parse it. A calendar date such as a birthday is a `YYYY-MM-DD` string and not an instant, because turning it into
one requires a time zone nobody agreed on.

## Durations as numbers

```js
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

console.log(2 * HOUR + 30 * MINUTE);
```

Named constants in milliseconds are the convention, and they read well enough at a call site. A formatter such as
`Intl.RelativeTimeFormat` or a small helper turns the number back into words for a user.

## Check yourself

Parse the same date with and without a time and print both ISO strings. Then add one month to the 31st of a month and
read the result, and check whether a `new Date('nonsense')` passes an `isNaN` check.
