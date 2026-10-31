---
title: Control flow and loops
summary: The branch statements, the loop statements, and the two that read as expressions.
chapter: Control flow, errors and regular expressions
minutes: 12
status: draft
---

## if and the truthy check

```js
if (records.length === 0) {
  console.log('nothing to do');
} else if (records.length === 1) {
  console.log('one record');
} else {
  console.log(`${records.length} records`);
}
```

The condition is coerced to a boolean, so anything that is not one of the eight falsy values passes. Write the
comparison you mean: `records.length === 0` says what it checks, and `!records.length` relies on the reader knowing
that `0` is falsy.

## Ternary, and the trap with &&

```js
const label = records.length === 1 ? 'record' : 'records';

console.log(`${records.length} ${label}`);
```

A ternary is an expression, so it can appear inside a template literal or a return. Nested ternaries stop being
readable after one level, and an `if` that assigns in each branch is clearer.

```js
const count = 0;
const message = count && 'records found';

console.log(message);        // 0
```

`&&` returns the left value when it is falsy, so `count && ...` gives `0` rather than `false` or a string. That is
the reason a render function that shows the result of `&&` sometimes prints a zero. Use a comparison:

```js
const message = count > 0 && 'records found';
```

## switch compares with ===

```js
switch (level) {
  case 'info':
  case 'debug': {
    console.log('quiet enough to keep');
    break;
  }
  case 'warn': {
    console.log('worth a look');
    break;
  }
  default: {
    console.log('unhandled level');
  }
}
```

A `case` is a strict comparison, so `case '1'` does not match the number `1`. Two labels in a row share a body, which
is the fallthrough that is intentional; every other fallthrough is a missing `break`. Braces inside a case give each
body its own scope, so a `const` declared in one case cannot collide with another.

The `default` position earns a thought: an enum-like value from a file or a request should hit a case that handles the
unknown rather than falling through to a default that pretends it is normal.

## The four loops

```js
for (let index = 0; index < records.length; index += 1) {          // counted
  console.log(records[index].key);
}

for (const record of records) {                                    // values
  console.log(record.key);
}

for (const key in object) {                                         // keys, including inherited
  if (Object.hasOwn(object, key)) {
    console.log(key);
  }
}

while (queue.length > 0) {                                          // condition first
  process(queue.pop());
}
```

`for...of` is the loop to reach for over anything iterable, and it is the only one that works with a `Map`, a `Set`
and a string. `for...in` walks the keys of an object and includes inherited ones, which is why it needs the
`Object.hasOwn` guard and why `Object.keys` is usually the better choice for data.

A counted loop is for when the index is genuinely needed, such as building a two dimensional index or stepping by more
than one.

## do...while runs at least once

```js
let input;

do {
  input = read();
} while (input === undefined);
```

The body runs before the condition is checked, which is the right shape for a retry that must happen at least once.
The variable has to be declared outside the loop, which is the reason this loop is rare.

## break, continue and labels

```js
outer: for (const row of rows) {
  for (const cell of row) {
    if (cell === 'stop') {
      break outer;
    }

    if (cell === null) {
      continue;
    }

    console.log(cell);
  }
}
```

A label on the outer loop is the only way to break out of two loops at once, and it is worth using once rather than
setting a flag that every level checks. A label is not a `goto`: it can only name a loop, and the jump is out of it.

## Guard clauses beat nesting

```js
function render(record) {
  if (!record) return '';
  if (!record.key) return `unnamed: ${record.value}`;
  if (record.value < 0) return `${record.key}: negative`;

  return `${record.key}: ${record.value}`;
}
```

An early return for each case that leaves keeps the interesting path at one level of indentation and the exceptions
visible at the top. The nested alternative puts the main path three levels deep inside three `if`s, which is where a
reader loses track of what is guaranteed by the time the return is reached.

## Check yourself

Write an `if` chain as a `switch` and back, then run `count && 'message'` with a count of zero and fix it. Finally
write a labelled `break` out of two nested loops and compare it with a version using a flag.
