---
title: Freezing, copying and cloning
summary: Three different kinds of copy, what freezing actually prevents, and the clone that handles a Date.
chapter: Types and coercion
minutes: 13
status: draft
---

## const is about the binding, not the value

```js
const record = { key: 'a' };

record.key = 'b';                     // allowed, the object changed
record = { key: 'c' };                 // TypeError: Assignment to constant variable
```

`const` stops the name pointing somewhere else. Use `Object.freeze` when the object itself must not change:

```js
const record = Object.freeze({ key: 'a' });

record.key = 'b';
console.log(record.key);               // 'a'
```

The write is ignored in a script and throws a `TypeError` in strict mode, which modules and classes are. Either
way the object is unchanged, and either way a mistake is easy to miss in a script that is not strict.

## Freezing is shallow

```js
const record = Object.freeze({ key: 'a', nested: { count: 1 } });

record.nested.count = 2;

console.log(record.nested.count);        // 2
console.log(Object.isFrozen(record.nested));   // false
```

Only the top level is frozen. A deep freeze needs a walk over the object graph:

```js
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);

    for (const key of Reflect.ownKeys(value)) {
      deepFreeze(value[key]);
    }
  }

  return value;
}
```

That walk has to handle cycles, and a frozen object cannot be extended, so calling it on something a library still
wants to decorate breaks that library. Freezing is worth it for a small configuration object and rarely worth it
for a domain model.

There are three related operations, and the differences matter:

| Call | Prevents |
| --- | --- |
| `Object.preventExtensions` | adding a property |
| `Object.seal` | adding or removing a property |
| `Object.freeze` | any change, including a value |

## A spread copy is shallow

```js
const original = { key: 'a', nested: { count: 1 } };
const copy = { ...original };

copy.key = 'b';
copy.nested.count = 2;

console.log(original.key);            // 'a', the top level was copied
console.log(original.nested.count);    // 2, the nested object is shared
```

The spread copies the properties, so a property holding an object copies the reference to that object. That is why
an immutable update has to rebuild every level it changes:

```js
const updated = {
  ...original,
  nested: { ...original.nested, count: 2 },
};
```

`Object.assign({}, original)` does the same thing and is longer. The difference is that a spread copies own
enumerable properties into an object with the default prototype, so a class instance loses its prototype:

```js
class Point {
  constructor(x) {
    this.x = x;
  }

  distance() {
    return Math.abs(this.x);
  }
}

const p = { ...new Point(3) };

console.log(p.x);                                  // 3
console.log(typeof p.distance);                     // 'undefined'
```

## structuredClone is a real clone

```js
const original = {
  key: 'a',
  at: new Date('2024-03-01T00:00:00Z'),
  tags: new Map([['k', 1]]),
  seen: new Set([1]),
  missing: undefined,
};

const copy = structuredClone(original);

console.log(copy.at instanceof Date);       // true
console.log(copy.tags instanceof Map);       // true
console.log(copy.seen instanceof Set);        // true
console.log('missing' in copy);                // true
console.log(copy.at === original.at);           // false, a new Date
```

`structuredClone` handles the built-in types properly, keeps `undefined`, follows cycles and produces a deep copy
in one call. It is the built in clone, available in Node and in browsers.

It refuses two things:

```text
DOMException: () => 1 could not be cloned.
```

A function cannot be cloned, and neither can a class instance beyond its own enumerable properties, because the
prototype is not part of the clone. A symbol keyed property is also left out.

## The JSON round trip is not a clone

```js
const copy = JSON.parse(JSON.stringify(original));
```

That one line is common and lossy in five ways at once:

| Input | After the round trip |
| --- | --- |
| a `Date` | an ISO string |
| a `Map` or a `Set` | `{}` |
| `NaN` or `Infinity` | `null` |
| a property holding `undefined` | gone |
| a `bigint` | a `TypeError` |

It also throws on a cycle. Use it when you want JSON and nothing more, which is a smaller set of cases than it
looks.

## Copying an array

```js
const values = [1, 2, 3];

const spread = [...values];
const fromValues = Array.from(values);
const sliced = values.slice();
const mapped = values.map((value) => value);
```

All four produce a new array with the same elements, and all four are shallow, so an array of objects shares
those objects. `structuredClone(values)` is the deep version.

## When mutation is right

A local array built in a loop and never shared is better mutated than rebuilt on every step, and a large data
structure is expensive to copy. The rule worth keeping is about ownership: mutate what you own and pass on, and
copy what a caller handed you.

## Check yourself

Freeze an object with a nested property, change both levels, and print what changed. Then clone the same object
with `structuredClone` and with a JSON round trip and list the differences between the two results.
