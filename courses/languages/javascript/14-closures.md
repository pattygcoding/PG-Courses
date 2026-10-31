---
title: Closures
summary: A function remembers where it was defined, which gives you private state and a class of leak.
chapter: Functions and scope
minutes: 13
status: draft
---

## A function carries its scope

```js
function makeCounter() {
  let count = 0;

  return () => {
    count += 1;
    return count;
  };
}

const next = makeCounter();

console.log(next(), next());     // 1 2
```

`makeCounter` has returned and its local `count` should be gone. It is not, because the returned arrow holds a
reference to the scope it was created in, and that scope stays alive as long as the function does. That reference
is the closure.

Each call to `makeCounter` creates a new scope, so two counters do not share anything:

```js
const first = makeCounter();
const second = makeCounter();

console.log(first(), second());    // 1 1
```

## Private state without a class

```js
function makeStack() {
  const items = [];

  return {
    push(value) {
      items.push(value);
    },
    size() {
      return items.length;
    },
  };
}

const stack = makeStack();
stack.push(1);

console.log(stack.size());        // 1
console.log(stack.items);          // undefined
```

The array is reachable only through the methods, which is encapsulation using nothing but scope. A class with a
private field does the same thing with syntax, and the difference is that a class copies the methods onto the
prototype once while the factory creates a new function per instance. The class wins on memory for many instances,
and the factory wins when the behaviour varies per instance.

## Three shapes a closure is good at

```js
const once = (fn) => {
  let called = false;

  return (...args) => {
    if (!called) {
      called = true;
      return fn(...args);
    }
  };
};

const memoize = (fn) => {
  const cache = new Map();

  return (key) => {
    if (!cache.has(key)) {
      cache.set(key, fn(key));
    }

    return cache.get(key);
  };
};

const withLogging = (fn) => (...args) => {
  console.log('calling with', args.length, 'arguments');
  return fn(...args);
};
```

`once`, `memoize` and a logging wrapper all work by capturing state in a scope and returning a function. A memoized
function keeps its cache for as long as the returned function exists, which is the behaviour you want and also the
thing to check when memory grows.

## A closure keeps what it captured alive

```js
function attach(element) {
  const data = new Array(1000).fill('x');

  element.addEventListener('click', () => {
    console.log(data.length);          // data cannot be collected
  });
}
```

A listener that captures a large object keeps that object alive for as long as the listener is attached. Remove the
listener when the element goes away, or capture the value you need rather than the object it came from:

```js
const size = data.length;

element.addEventListener('click', () => {
  console.log(size);
});
```

That version captures a number rather than the array, and the array becomes collectable. Memory leaks in JavaScript
are almost always a closure or a collection holding something longer than intended.

## A helper function captures a value per call

```js
const callbacks = [];

for (var index = 0; index < 3; index += 1) {
  callbacks.push(makeCallback(index));
}

function makeCallback(value) {
  return () => value;
}

console.log(callbacks.map((callback) => callback()));    // [ 0, 1, 2 ]
```

Passing the value in creates a new scope per call, which is what the older answer to the `var` loop looked like.
`let` in the loop does the same thing with less code, which is why the helper is now rare.

## Reading a closure in the debugger

A breakpoint inside a closure shows a scope section with the captured variables, which is the fastest way to answer
"where does this value come from". A value that is not a parameter and not a local is captured, and the debugger
names the scope it came from.

## Check yourself

Write a counter factory and confirm two counters are independent. Then wrap a function with `memoize`, call it
twice with the same argument, and print the call count to show the second call did not run the body.
