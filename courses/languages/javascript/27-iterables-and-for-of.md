---
title: Iterables and for-of
summary: One protocol that for-of, spread, destructuring and the Map constructor all use.
chapter: Control flow, errors and regular expressions
minutes: 13
status: draft
---

## The protocol is a method

```js
const values = [1, 2, 3];
const iterator = values[Symbol.iterator]();

console.log(iterator.next());      // { value: 1, done: false }
console.log(iterator.next().value); // 2
console.log(iterator.next());        // { value: 3, done: false }
console.log(iterator.next());         // { value: undefined, done: true }
```

An object is iterable when it has a `Symbol.iterator` method that returns an iterator, and an iterator is an object
with a `next` method returning `{ value, done }`. `done: true` ends the iteration, and the value alongside it is
ignored.

That is the whole protocol, and it is what `for...of` calls. Every construct that works on "something with items" uses
it:

```js
const values = new Set([1, 2]);

console.log([...values]);                  // spread
const [first] = values;                     // destructuring
console.log(Array.from(values));             // conversion
console.log(new Map([['a', 1]]));             // a Map from pairs
```

The same method is why a `Set`, a `Map`, a string and a `NodeList` all work in a `for...of` loop without special
cases.

## Writing an iterable

```js
class Range {
  constructor(from, to) {
    this.from = from;
    this.to = to;
  }

  [Symbol.iterator]() {
    let current = this.from;
    const last = this.to;

    return {
      next() {
        if (current > last) {
          return { done: true };
        }

        return { value: current++, done: false };
      },
    };
  }
}

console.log([...new Range(1, 4)]);        // [ 1, 2, 3, 4 ]
```

The iterator holds the state, so two loops over the same `Range` are independent. That is a property worth preserving:
an iterable returns a fresh iterator each time, while an object that is its own iterator cannot be looped twice.

A generator does the same thing in three lines, which is what the generators chapter is about.

## Iterating what you already have

```js
for (const [key, value] of new Map([['a', 1]])) {
  console.log(key, value);
}

for (const character of 'abc') {
  console.log(character);
}

for (const value of new Set([1, 2, 2])) {
  console.log(value);          // 1, then 2
}
```

A string iterates by code point, which is why `for...of` over text handles an emoji correctly where an index loop does
not. An object is not iterable, so iterating one is `Object.entries`, `Object.keys` or `Object.values`.

## for-in is a different thing

```js
const record = { key: 'a', value: 1 };

for (const name in record) {
  console.log(name);           // the keys, and any inherited enumerable ones
}
```

`for...in` walks enumerable keys including inherited ones, and the order is the same rule as `Object.keys`. Use it for
a plain object and guard it, or use `Object.keys`, which returns an array you can also map over. `for...of` on an
object throws:

```text
TypeError: record is not iterable
```

## Iterator helpers

```js
const doubled = [1, 2, 3, 4].values().map((value) => value * 2).take(2);

console.log([...doubled]);        // [ 2, 4 ]
```

`map`, `filter`, `take`, `drop`, `flatMap`, `reduce` and `toArray` exist on iterators, and unlike the array versions
they are lazy: nothing runs until something asks for a value. `[1, 2, 3].values().map(...).toArray()` is the eager
form.

```js
function* naturals() {
  let value = 1;

  while (true) {
    yield value++;
  }
}

console.log(naturals().filter((value) => value % 7 === 0).take(3).toArray());
```

```text
[ 7, 14, 21 ]
```

An infinite iterator is safe here because `take` stops asking, and the generator is never asked for a value after that.
That is the difference between a lazy iterator and an array: an array has to hold every element, and an iterator only
has to produce the next one.

The helpers are recent, so check the runtime before relying on them in a library.

## Stopping an iterator early

```js
function* withCleanup() {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log('cleaning up');
  }
}

for (const value of withCleanup()) {
  console.log(value);
  break;
}
```

```text
1
cleaning up
```

A `for...of` loop that ends early calls the iterator's `return` method, which runs a `finally` block inside a
generator. That is how a streaming loop closes a file or a connection when the body stops it, and it is the reason to
prefer `for...of` over calling `next` by hand: the manual version has to remember to close.

## Lazy versus eager

| | Array | Iterator |
| --- | --- | --- |
| Holds every element | yes | no |
| Reusable | yes | no, it is consumed |
| `.map` runs immediately | yes | no |
| Chains without intermediates | no | yes |
| Length | `length` | unknown until consumed |

An array is the right thing to return from a function, because a caller can read it twice. An iterator is the right
thing to pass through a chain, because a million element pipeline through an array allocates a million element
intermediate for each step.

## Check yourself

Write the `Range` iterable, spread it into an array, and loop over it twice to confirm each loop gets its own iterator.
Then chain `filter` and `take` on an infinite generator and collect the result with `toArray`.
