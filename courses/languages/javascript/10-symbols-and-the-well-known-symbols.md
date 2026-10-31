---
title: Symbols and the well-known symbols
summary: A value that is unique by construction, and the hooks the language itself looks up by symbol.
chapter: Types and coercion
minutes: 12
status: draft
---

## A symbol is a unique value

```js
const id = Symbol('id');
const other = Symbol('id');

console.log(id === other);           // false
console.log(id.description);          // 'id'
console.log(typeof id);                // 'symbol'
```

The description is for a debugger and log output and has nothing to do with identity. Two symbols with the same
description are different values, which is the whole point: a symbol cannot collide with anything.

## A symbol as a property key

```js
const ID = Symbol('id');
const record = { key: 'a', [ID]: 42 };

console.log(record[ID]);                       // 42
console.log(Object.keys(record));                // [ 'key' ]
console.log(JSON.stringify(record));             // '{"key":"a"}'
```

A symbol keyed property is invisible to `Object.keys`, `for...in`, spread and `JSON.stringify`. That makes a
symbol the way to attach metadata to an object without it leaking into iteration or serialisation, and the way to
add a method to an object from a library without risking a name collision with the object's own fields.

To see them you have to ask:

```js
console.log(Object.getOwnPropertySymbols(record));   // [ Symbol(id) ]
console.log(Reflect.ownKeys(record));                 // [ 'key', Symbol(id) ]
```

## The global registry

```js
console.log(Symbol.for('shared') === Symbol.for('shared'));    // true
console.log(Symbol('x') === Symbol('x'));                       // false
console.log(Symbol.keyFor(Symbol.for('shared')));                // 'shared'
```

`Symbol.for` looks a symbol up in a registry shared by everything running in the process, which is how two modules that
never import each other agree on a key. It is the mechanism behind a protocol that has to work across separate global
environments in one page, such as `instanceof` on a value from an iframe. `Symbol()` never touches the registry.

## The language looks up specific symbols

The engine defines well-known symbols and checks for them on your objects, which is how a plain object opts into
language behaviour:

| Symbol | Used by |
| --- | --- |
| `Symbol.iterator` | `for...of`, spread, destructuring, `Array.from` |
| `Symbol.asyncIterator` | `for await...of` |
| `Symbol.toPrimitive` | `+`, comparison and conversion to a string or number |
| `Symbol.hasInstance` | `instanceof` |
| `Symbol.toStringTag` | `Object.prototype.toString` |
| `Symbol.isConcatSpreadable` | `Array.prototype.concat` |

```js
class Stack {
  #items = [];

  push(value) {
    this.#items.push(value);
  }

  *[Symbol.iterator]() {
    yield* this.#items;
  }

  get [Symbol.toStringTag]() {
    return 'Stack';
  }
}

const stack = new Stack();
stack.push(1);
stack.push(2);

console.log([...stack]);                              // [ 1, 2 ]
console.log(Object.prototype.toString.call(stack));     // '[object Stack]'
```

Implementing `Symbol.iterator` makes an object work with every language construct that iterates, which is a small
amount of code for a large amount of interoperability. The generators lesson covers the syntax.

## Controlling conversion

```js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'string') {
      return `${this.amount} ${this.currency}`;
    }

    return this.amount;
  }
}

const price = new Money(10, 'GBP');

console.log(`${price}`);            // '10 GBP'
console.log(price + 5);               // 15
console.log(price * 2);                // 20
```

The engine passes a hint of `'string'`, `'number'` or `'default'`, and the method decides what to return. Without
it, the engine looks for `toString` and then `valueOf`, which is the older protocol this replaces. Defining
`Symbol.toPrimitive` is how a value type controls what `+` and a template literal do to it, and it is the reason
`new Date()` prints as a date string while `+new Date()` prints as a number.

## Where symbols show up in practice

- A library that attaches a cache or a listener to an object it does not own.
- A framework that marks a component or a reactive field.
- A shared key agreed between two packages without a dependency.
- The protocol symbols above, which are the reason a custom collection works with `for...of`.

## Check yourself

Create two symbols with the same description, use one as a property key, and confirm it is absent from
`Object.keys` and from `JSON.stringify`. Then add `Symbol.toPrimitive` to a small class and print it with a
template literal, with `+` and with `*`.
