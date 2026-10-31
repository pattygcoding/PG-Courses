---
title: Property descriptors and accessors
summary: The four attributes behind every property, and the getter that runs code when you read a name.
chapter: Objects and classes
minutes: 13
status: draft
---

## A property has more than a value

```js
const record = { key: 'a' };

console.log(Object.getOwnPropertyDescriptor(record, 'key'));
```

```text
{ value: 'a', writable: true, enumerable: true, configurable: true }
```

Four attributes: the value, whether it can be changed, whether it shows up in iteration and serialisation, and
whether the property can be redefined or deleted at all. An ordinary assignment sets all three flags to true, which
is why none of this is visible in normal code.

```js
Object.defineProperty(record, 'version', {
  value: 1,
  writable: false,
  enumerable: false,
});

console.log(record.version);                  // 1
console.log(Object.keys(record));              // [ 'key' ], version is hidden
console.log(JSON.stringify(record));            // '{"key":"a"}'
```

The defaults inside `defineProperty` are the opposite of an assignment: omitting `writable` or `enumerable` leaves
them false. That is the trap with this API, and the reason a property added this way seems to disappear.

## Non-writable is not frozen

```js
'use strict';

const record = {};

Object.defineProperty(record, 'version', { value: 1 });

try {
  record.version = 2;
} catch (error) {
  console.log(error.name, error.message);
}

console.log(record.version);           // 1
```

In strict mode the write throws, and in a script it does nothing quietly. Either way the value does not change, and
neither way is it an error at the point the code was written, which is the argument for freezing a whole object and
being done with it.

## Getters and setters

```js
const record = {
  first: 'Ada',
  last: 'Lovelace',

  get fullName() {
    return `${this.first} ${this.last}`;
  },

  set fullName(value) {
    [this.first, this.last] = value.split(' ');
  },
};

console.log(record.fullName);        // 'Ada Lovelace'

record.fullName = 'Grace Hopper';
console.log(record.first);            // 'Grace'
```

A getter is a function that runs when the name is read, so `record.fullName` looks like a property and behaves like
a call. A setter runs on assignment. Neither is a separate key on the object:

```js
console.log(Object.getOwnPropertyDescriptor(record, 'fullName'));
```

```text
{
  get: [Function: get fullName],
  set: [Function: set fullName],
  enumerable: true,
  configurable: true
}
```

A getter is not included by `JSON.stringify` unless it is enumerable and owned, and it is not included at all when
only a getter is defined and the key is added with `defineProperty` and the default `enumerable: false`.

## A computed value should be cheap

```js
class Window {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  get lengthMs() {
    return this.to - this.from;
  }
}
```

That getter is a subtraction, and a reader calling it in a loop pays for a function call each time. A getter that
does real work is a bug waiting for a hot path:

```js
class Report {
  get summary() {
    return this.rows.filter((row) => row.value > 1000).length;      // walks every row
  }
}
```

The name reads like a property, so nobody counts the cost. Make it a method when it does work, and a getter only
when it is a cheap derivation from what the object already holds.

## A getter can compute once

```js
function makeReport(rows) {
  let summary;

  return {
    rows,
    get summary() {
      summary ??= rows.filter((row) => row.value > 1000).length;
      return summary;
    },
  };
}
```

The first read computes and stores the result, and later reads return it. `??=` assigns only when the left side is
nullish, which is the short form of the check. That is lazy initialisation with a closure, and it is the shape a
copy on write cache takes.

## Why the flags matter

| Flag | Affects |
| --- | --- |
| `enumerable` | `Object.keys`, `for...in`, spread, `JSON.stringify` |
| `writable` | `=` and compound assignment |
| `configurable` | `delete`, redefining the property, changing a flag |

A property that is not enumerable is invisible to every copying operation, which is how a library adds metadata to
an object without it appearing in a spread or a JSON body. A property that is not configurable cannot be deleted,
which is how `Math.PI` is protected.

## Where this shows up in a framework

Vue 2 made a property reactive by redefining it with a getter and a setter, which is why adding a field to an object
after creation did not make it reactive. Vue 3 and most current reactivity systems use a `Proxy` instead, which
intercepts a missing key as well. Both approaches rest on the fact that reading a property is a place a library can
run code.

## Check yourself

Define three properties with `defineProperty`, leaving out one attribute on each, and print the descriptors,
`Object.keys` and `JSON.stringify` for the object. Then write a class with one cheap getter and one expensive one,
and convert the expensive one to a method.
