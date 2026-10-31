---
title: Prototypes and the prototype chain
summary: Every object points at another one, which is how a method is found and how a lookup is arranged.
chapter: Objects and classes
minutes: 13
status: draft
---

## A property lookup walks a chain

```js
const record = { key: 'a' };

console.log(record.toString());        // '[object Object]'
console.log(Object.hasOwn(record, 'toString'));   // false
```

`record` has one own property and yet `toString` works. The object holds an internal link to another object, called
its prototype, and a lookup that misses on the object continues there.

```js
console.log(Object.getPrototypeOf(record) === Object.prototype);   // true
console.log(Object.getPrototypeOf(Object.prototype));                // null
```

The chain for a plain object is `record`, then `Object.prototype`, then `null`. Every property a plain object
appears to have comes from that last link, which is also why a name you did not set can still be `in` an object.

## Building a chain on purpose

```js
const base = { describe() { return `key ${this.key}`; } };
const record = Object.create(base);

record.key = 'a';

console.log(record.describe());                 // 'key a'
console.log(Object.keys(record));                // [ 'key' ]
console.log(Object.hasOwn(record, 'describe'));    // false
```

`Object.create` makes a new object with the argument as its prototype. The method is found on `base` and `this`
inside it is `record`, because `this` comes from the call site rather than from where the method lives.

```js
console.log(base.isPrototypeOf(record));       // true
console.log(record instanceof Object);           // true
```

`instanceof` walks the prototype chain looking for the constructor's `prototype` object, which is why it reports
true here. The prototype chain is the inheritance mechanism in JavaScript; `class` is a cleaner way to write it.

## Constructor functions are the older syntax

```js
function Record(key) {
  this.key = key;
}

Record.prototype.describe = function () {
  return `key ${this.key}`;
};

const record = new Record('a');

console.log(record.describe());        // 'key a'
console.log(record instanceof Record);   // true
```

`new` creates an object whose prototype is `Record.prototype`, runs the constructor with `this` bound to it, and
returns it. A method assigned to `prototype` is shared by every instance, which is the point of putting it there
rather than on the instance.

That is exactly what a class compiles to, which is why a class method is not copied per instance and why
`Record.prototype.describe` works for an instance built by `class Record`.

## Shadowing a prototype property

```js
const record = Object.create(base);

record.describe = () => 'mine';

console.log(record.describe());                   // 'mine'
console.log(record.describe === base.describe);     // false
```

Assigning a property that exists on the prototype creates an own property that hides it. The prototype is unchanged,
so another object built from the same base is unaffected. Nothing about the prototype chain is frozen by default.

## Objects with no prototype

```js
const counts = Object.create(null);

counts.key = 1;

console.log(counts.toString);            // undefined
console.log('toString' in counts);        // false
```

An object with a null prototype has nothing in the chain, so no inherited name can be mistaken for data. That makes
it the right container for a lookup keyed by strings from outside your program, and it closes the door on prototype
pollution, where a key like `__proto__` from a parsed body changes an object's behaviour.

The cost is that it has no methods at all, including `hasOwnProperty`, so use the static form:

```js
console.log(Object.hasOwn(counts, 'key'));       // true
```

## Reading the chain

```js
function describeChain(value) {
  const names = [];

  for (let node = Object.getPrototypeOf(value); node; node = Object.getPrototypeOf(node)) {
    names.push(node.constructor?.name ?? 'null prototype');
  }

  return names;
}

console.log(describeChain([]));      // [ 'Array', 'Object' ]
```

That loop is what `instanceof` and a framework's own type checks do internally. `__proto__` exists as a getter and
setter for the prototype and is legacy: use `Object.getPrototypeOf` and `Object.create` instead, and avoid
`Object.setPrototypeOf` on an object that is already in use, because it deoptimises every property lookup on it.

## Check yourself

Build an object with `Object.create`, add a method to the prototype and an own property to the instance, and print
`Object.keys`, `Object.hasOwn` and the chain for both. Then create an object with a null prototype and try to call
`toString` on it.
