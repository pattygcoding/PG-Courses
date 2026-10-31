---
title: this and binding
summary: Four rules that decide what this is, the callback that loses it, and the arrow that never has it.
chapter: Functions and scope
minutes: 13
status: draft
---

## this depends on how the function was called

```js
const record = {
  key: 'a',
  label() {
    return `key is ${this.key}`;
  },
};

console.log(record.label());           // 'key is a'

const detached = record.label;
console.log(detached());                // TypeError or 'key is undefined'
```

`this` is not the object the method was defined on. It is decided at the call site, and `record.label()` sets it to
`record` while `detached()` leaves it as `undefined`, which in a module or a class (both strict) is a `TypeError`
when the body reads a property.

Four cases cover almost everything:

| Call | `this` |
| --- | --- |
| `object.method()` | `object` |
| `fn.call(x)`, `fn.apply(x)`, `fn.bind(x)` | `x` |
| `new Fn()` | the new object being constructed |
| `fn()` | `undefined` in strict mode, the global object otherwise |

Method calls on a chain take the last object: `a.b.c()` sets `this` to `a.b`.

## Losing this in a callback

```js
const counter = {
  count: 0,

  start() {
    setTimeout(function () {
      this.count += 1;                 // this is not counter
    }, 10);
  },
};
```

A plain function passed as a callback is called with no receiver, so `this` is `undefined`. Three fixes, in the
order I reach for them:

```js
// 1. An arrow, which keeps the enclosing this.
setTimeout(() => {
  this.count += 1;
}, 10);

// 2. Bind the method to the object.
setTimeout(this.increment.bind(this), 10);

// 3. Capture the object in a variable.
const self = this;
setTimeout(function () {
  self.count += 1;
}, 10);
```

The arrow is the shortest and the one that reads best. `self` and `that` are the older convention and were needed
before arrows existed.

## Arrow functions capture this, they do not have one

```js
const counter = {
  count: 0,

  start() {
    const tick = () => {
      this.count += 1;                 // this is counter, from start
    };

    tick();
  },
};
```

An arrow has no `this` of its own, so `this` inside it means the `this` of the enclosing function. That makes it
right for a callback inside a method and wrong as a method:

```js
const broken = {
  count: 0,
  increment: () => {
    this.count += 1;                   // this is the module scope, not broken
  },
};
```

## call, apply and bind

```js
function describe(prefix, suffix) {
  return `${prefix}${this.key}${suffix}`;
}

const record = { key: 'a' };

console.log(describe.call(record, '<', '>'));
console.log(describe.apply(record, ['<', '>']));

const bound = describe.bind(record);
console.log(bound('<', '>'));
```

`call` takes arguments one by one and `apply` takes them as an array, both invoking immediately. `bind` returns a
new function with `this` fixed, which is what makes it the tool for a callback. A bound function ignores a later
`call` with a different receiver, which is exactly what you want from a listener and confusing the first time it
happens.

## Detached methods in a class

```js
class Counter {
  count = 0;

  increment() {
    this.count += 1;
  }
}

const counter = new Counter();
const increment = counter.increment;

increment();                        // TypeError: Cannot read properties of undefined
```

Class bodies are strict, so a detached method has `this` of `undefined` rather than the global object. The fix is
an arrow property or a bind:

```js
class Counter {
  count = 0;

  increment = () => {
    this.count += 1;
  };
}
```

A field holding an arrow gets one function per instance rather than one per prototype, which is the cost of not
needing a bind at the call site.

## The thisArg argument

```js
const record = { key: 'a' };

['x', 'y'].forEach(function (value) {
  console.log(this.key, value);
}, record);
```

`forEach`, `map` and the rest take a second argument that becomes `this` inside a plain function callback. It is
rarely used because an arrow and a captured variable are clearer, and it is worth knowing when reading older code.

## Avoiding the problem

A function that takes what it needs as a parameter does not need `this` at all:

```js
function label(record) {
  return `key is ${record.key}`;
}
```

That version is easy to test, works when detached, and cannot be broken by a call site. `this` is the right
tool for a method on an object or a class and the wrong tool for a helper function, and most bugs around it come
from using it for the second.

## Check yourself

Write an object with a method that starts a timer, and break it with a plain function callback. Fix it three ways
and say which one you would keep. Then detach a class method and read the error.
