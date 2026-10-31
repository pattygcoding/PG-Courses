---
title: Functions and parameters
summary: Three ways to write a function, the parameter features worth using, and what an arrow function leaves out.
chapter: Functions and scope
minutes: 13
status: draft
---

## Three ways to write one

```js
function parse(line) {              // declaration
  return line.split(',');
}

const format = function (record) {   // expression
  return `${record.key}`;
};

const total = (records) => records.length;   // arrow
```

A declaration is hoisted and named. An expression is a value assigned to a name, which is what lets it be passed
around. An arrow is shorter and behaves differently in two important ways that the `this` lesson covers.

An arrow with a single expression returns it without a `return`:

```js
const double = (value) => value * 2;
const object = (key) => ({ key });        // parentheses, or it looks like a block
```

## Defaults, rest and spread

```js
function makeRecord(key, value = 0, ...tags) {
  return { key, value, tags };
}

console.log(makeRecord('a'));
console.log(makeRecord('a', 1, 'x', 'y'));
```

```text
{ key: 'a', value: 0, tags: [] }
{ key: 'a', value: 1, tags: [ 'x', 'y' ] }
```

A default is used when the argument is `undefined`, which includes calling with too few arguments. `null` does not
trigger a default, which is a common surprise:

```js
function size(value = 10) {
  return value;
}

console.log(size(undefined));    // 10
console.log(size(null));          // null
```

A rest parameter collects the remaining arguments into a real array, and it must be last. Spread at the call site
does the opposite:

```js
const values = [1, 2, 3];

console.log(Math.max(...values));              // 3
console.log(makeRecord('a', ...values));        // value 1, tags [ 2, 3 ]
```

A default can refer to a parameter to its left, which is how a required option and a derived one are declared
together:

```js
function connect(url, timeout = url.startsWith('https') ? 5000 : 1000) {
  return { url, timeout };
}
```

The default expression runs on every call, not once when the function is defined, so it can call a function and
read the current time.

## Destructured parameters

```js
function render({ key, value = 0, tags: list = [] }, { indent = 2 } = {}) {
  return { key, value, list, indent };
}

console.log(render({ key: 'a' }));
```

```text
{ key: 'a', value: 0, list: [], indent: 2 }
```

The second parameter has a default of an empty object, which is what makes it optional. Without the `= {}`, a call
with one argument throws while destructuring `undefined`. A function taking an options object is the way to accept
five settings without a call site that is a list of mystery booleans.

## The arguments object, and why not to use it

```js
function legacy() {
  return arguments.length;
}
```

Every non-arrow function has an `arguments` object, which is array-like and not an array, so it has no `map` and
no `includes`. It is the pre-2015 way of accepting a variable number of arguments, and a rest parameter replaces it
in every case. An arrow function has no `arguments`, which is one of the four things it gives up.

## Arrow functions leave out four things

```js
const counter = {
  count: 0,

  increment: function () {
    this.count += 1;                 // this is counter
  },

  broken: () => {
    this.count += 1;                  // this is the enclosing scope
  },
};
```

An arrow function has no `this` of its own, no `arguments`, cannot be used with `new`, and is not a constructor.
That makes it the right choice for a callback that should keep the surrounding `this`, and the wrong choice for a
method on an object that needs its own.

```js
const record = {
  key: 'a',
  label() {                          // method shorthand
    return `key: ${this.key}`;
  },
};
```

Method shorthand is the short form for a function property, and unlike an arrow it does bind `this` to the object.
It also gets `super`, which an arrow does not.

## Functions are objects

```js
function add(a, b) {
  return a + b;
}

console.log(add.name);          // 'add'
console.log(add.length);         // 2, the parameters before the first default
console.log(typeof add);          // 'function'
```

`length` counts the parameters before the first default or rest, which is why `makeRecord` has a length of 1. A
function is callable and an object, so it can hold properties and be passed anywhere a value goes.

## Check yourself

Write one function as a declaration, an expression and an arrow, then call each. Add a default parameter, a rest
parameter and a destructured options object to the same function and call it with every argument missing.
