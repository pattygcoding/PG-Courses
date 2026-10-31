---
title: Generators
summary: A function that can pause, the iterator it returns for free, and the values you can send back in.
chapter: Generators and metaprogramming
minutes: 13
status: draft
---

## A generator pauses at each yield

```js
function* range(from, to) {
  for (let value = from; value <= to; value += 1) {
    yield value;
  }
}

console.log([...range(1, 4)]);        // [ 1, 2, 3, 4 ]
```

A `function*` returns a generator, which is both an iterator and an iterable. Calling it runs no code at all: the body
starts when the first value is requested and pauses at each `yield` until the next request. That is why a generator
works with `for...of`, a spread, destructuring and the iterator helpers, with no code to write for any of it.

```js
const generator = range(1, 3);

console.log(generator.next());     // { value: 1, done: false }
console.log(generator.next().value); // 2
console.log([...generator]);         // [ 3 ], the rest of it
```

The manual form is there when you need to read `done` yourself. Between the two calls above, the generator is suspended
inside the loop with `value` holding 2, and nothing else in the program can see that state.

## Values go in as well as out

```js
function* accumulate() {
  let total = 0;

  while (true) {
    const amount = yield total;
    total += amount;
  }
}

const running = accumulate();

running.next();              // { value: 0 }
running.next(5);             // { value: 5 }
running.next(2);             // { value: 7 }
```

The first `next()` starts the body and runs to the first `yield`, and its argument is discarded because there is no
`yield` waiting for it yet. Every later argument becomes the value of the `yield` expression that the generator is
paused at. That is a coroutine, and it is how a state machine with an external driver is written.

## Delegating with yield*

```js
function* headers() {
  yield 'key';
  yield 'value';
}

function* body() {
  yield* headers();
  yield 'done';
}

console.log([...body()]);       // [ 'key', 'value', 'done' ]
```

`yield*` delegates to another iterable and yields everything it produces, which is the composition operator for
generators. It works on any iterable, so a generator can delegate to an array, a `Map` or another generator, and the
`return` and `throw` calls pass through to the delegate.

```js
function* walk(node) {
  yield node.value;

  for (const child of node.children ?? []) {
    yield* walk(child);
  }
}
```

That is a depth-first walk of a tree as an iterator, which is the shape a file walk or a document traversal wants. The
consumer decides how much of the tree to visit, and nothing is built until it is asked for.

## Stopping a generator early runs the cleanup

```js
function* reading(lines) {
  try {
    for (const line of lines) {
      yield line.trim();
    }
  } finally {
    console.log('closing');
  }
}

for (const line of reading(lines)) {
  if (line === 'stop') {
    break;
  }
}
```

```text
closing
```

A `for...of` loop that ends early calls the generator's `return` method, which resumes it with a return and runs the
`finally` block. That is how a generator that reads a file or holds a lock releases it when the consumer stops, and it
is the reason to consume a generator with a loop rather than by calling `next` by hand.

```js
const iterator = reading(lines);

iterator.next();
iterator.return();          // the same cleanup, called explicitly
```

## An infinite generator is safe

```js
function* ids() {
  let next = 1;

  while (true) {
    yield next++;
  }
}

const [first, second] = ids();

console.log(first, second);        // 1 2
```

Nothing runs past the second value, so an endless generator costs nothing until it is consumed further. That is how a
coroutine passes for a lazy sequence, and it is the difference from a function that returns an array, which has to
finish before the caller sees anything.

```js
const firstThree = ids().take(3).toArray();
```

## Where generators fit

| Task | Generator fits |
| --- | --- |
| A sequence defined by a rule | yes, `range`, `ids`, `primes` |
| Walking a tree or a graph | yes, with `yield*` |
| A state machine driven from outside | yes, values in through `next` |
| A transformation of a list | no, `map` and `filter` say it better |
| Anything that must be an array | no, collect it and return the array |

A generator is slower than a loop over an array, because each `yield` suspends a frame. For the use cases above the
clarity is worth it, and for a transformation of a collection the array methods are both faster and shorter.

## Check yourself

Write `range` as a generator, spread it, and consume it twice to see that the second iteration of the same generator
object is empty. Then write a generator that takes a value through `next`, and one that uses `yield*` on a tree.
