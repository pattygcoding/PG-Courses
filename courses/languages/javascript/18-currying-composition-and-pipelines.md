---
title: Currying, composition and pipelines
summary: Building a function out of other functions, and the point where the clever version stops being readable.
chapter: Functions and scope
minutes: 13
status: draft
---

## Currying turns a function into a sequence of one argument calls

```js
function add(a) {
  return (b) => a + b;
}

console.log(add(1)(2));       // 3
```

A curried function takes one argument and returns a function that takes the next, until it has enough. The useful
part is that a partial call can be stored:

```js
const increment = add(1);

console.log([1, 2, 3].map(increment));    // [ 2, 3, 4 ]
```

A generic currying helper does the same thing for an existing function:

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn(...args);
    }

    return (...rest) => curried(...args, ...rest);
  };
}

const multiply = curry((a, b, c) => a * b * c);

console.log(multiply(2)(3)(4));        // 24
console.log(multiply(2, 3)(4));         // 24
console.log(multiply(2)(3, 4));          // 24
```

`fn.length` is the argument count before the first default or rest, which is why a curried function should not use a
default on an argument it needs. Currying is worth it when one argument is fixed and the function is reused;
otherwise a two argument function and a wrapper are clearer.

## Composition applies functions in sequence

```js
const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);

const compose = (...fns) => (input) => fns.reduceRight((value, fn) => fn(value), input);

const trim = (text) => text.trim();
const lower = (text) => text.toLowerCase();
const slug = (text) => text.replaceAll(' ', '-');

const normalise = pipe(trim, lower, slug);

console.log(normalise('  Hello World  '));     // 'hello-world'
```

`pipe` reads left to right, in the order the steps happen. `compose` reads right to left, which matches the
mathematical notation and is harder to follow in a code review, so stick to `pipe` unless a library gives you
`compose`.

Both are one line and about ten lines of error messages the first time a step throws, because the stack shows the
`reduce` rather than the step that failed.

## Each step has to take one argument

```js
const parse = (text) => Number(text);
const double = (value) => value * 2;

const result = pipe(parse, double)('21');

console.log(result);        // 42
```

A step with two arguments breaks the chain, and the fix is to wrap it:

```js
const clamp = (min, max) => (value) => Math.min(Math.max(value, min), max);

const bounded = pipe(parse, clamp(0, 100));
```

A curried step fits a pipeline and a two argument function does not, which is the strongest practical argument for
currying.

## Point-free style, and where it goes wrong

```js
const keys = (records) => records.map((record) => record.key);

const names = records.map((record) => record.name.trim()).filter(Boolean);
```

The second line is a pipeline with a reader-friendly amount of detail. The point-free version removes the argument
names entirely:

```js
const map = (fn) => (list) => list.map(fn);
const filter = (fn) => (list) => list.filter(fn);

const names = pipe(map((record) => record.name), map(trim), filter(Boolean));
```

Every line is shorter and the data being transformed appears nowhere, which is the trade. Point-free style is
pleasant for arithmetic and string helpers and terrible for business rules, because a rule with no names in it
cannot be read.

## A pipeline of steps with names

```js
const steps = [
  { name: 'trim', run: (text) => text.trim() },
  { name: 'lower', run: (text) => text.toLowerCase() },
  { name: 'slug', run: (text) => text.replaceAll(' ', '-') },
];

function run(value, steps) {
  for (const step of steps) {
    value = step.run(value);
  }

  return value;
}
```

A list of named steps can be logged, reordered, filtered by configuration and tested one at a time. That is the
shape to use when the order or the set of steps is data rather than code, which is what a form validator or a
document transformation turns into.

## Where a pipeline is the wrong shape

```js
function prepare(input) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error('input is empty');
  }

  const parsed = JSON.parse(trimmed);

  return { ...parsed, key: parsed.key?.toLowerCase() };
}
```

That function has a branch and an error case in the middle, and a pipeline cannot express either without a step
that exists only to throw. Use named locals and a method when the transformation has decisions in it, and a
pipeline when it is a straight sequence of conversions.

## The pipeline operator is not in the language

```js
const slug = input |> trim |> lower;      // SyntaxError in every current release
```

The `|>` proposal is at stage 2 and is not implemented in Node or in any shipping browser, so the `pipe` function
above is the way to write this today. A library such as `lodash/fp` or `ramda` provides one that is well tested.

## Check yourself

Write `pipe` and `compose`, build a three step pipeline, and confirm they produce the same result from the same
steps. Then add a curried `clamp(min, max)` as a step and call the pipeline with a value that hits the bound.
