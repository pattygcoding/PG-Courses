---
title: Classes and private fields
summary: Prototypes with better syntax, real privacy, and the two things a class does not do.
chapter: Objects and classes
minutes: 14
status: draft
---

## A class is a constructor with methods

```js
class Record {
  constructor(key, value) {
    this.key = key;
    this.value = value;
  }

  describe() {
    return `${this.key}: ${this.value}`;
  }

  static parse(line) {
    const [key, value] = line.split(',');
    return new Record(key.trim(), Number(value));
  }
}

const record = Record.parse('a, 1');

console.log(record.describe());                    // 'a: 1'
console.log(Object.hasOwn(record, 'describe'));      // false, it is on the prototype
console.log(Record.prototype.describe === record.describe);   // true
```

The methods live once on `Record.prototype` and are shared by every instance. A `static` method belongs to the class
rather than to an instance, which is where a factory or a helper that does not need `this` goes.

A class is strict without saying so, is not usable before its declaration, and its methods are not bound, so
detaching one loses `this`. The `this` lesson covers the last of those.

## Instance fields

```js
class Record {
  tags = [];
  level = 'info';

  constructor(key) {
    this.key = key;
  }
}

console.log(new Record('a').tags);        // []
```

A field is initialised on the instance when the constructor runs, before the constructor body. That ordering matters
for a field whose initial value depends on a parameter: the body sees the field, not the other way round.

A field holding a mutable value is created per instance, so it is safe to change:

```js
const first = new Record('a');
const second = new Record('b');

first.tags.push('x');

console.log(second.tags);        // [], unaffected
```

Declaring the field with `= []` in the class body is what guarantees that. A field that is only assigned in the
constructor is the same thing written in two places.

## Private fields are actually private

```js
class Counter {
  #count = 0;

  increment() {
    this.#count += 1;
    return this;
  }

  get value() {
    return this.#count;
  }

  #reset() {
    this.#count = 0;
  }

  reset() {
    this.#reset();
  }
}

const counter = new Counter();

console.log(counter.increment().value);       // 1
console.log(counter.#count);
```

```text
SyntaxError: Private field '#count' must be declared in an enclosing class
```

The error is at parse time because the field is not a property: it is not on the instance, not visible to
`Object.keys`, not reachable through a proxy trap and not writable from outside the class body. That is stronger than
the `_name` convention, which was only a comment to other programmers.

You can test whether an object has one, from inside the class:

```js
class Counter {
  #count = 0;

  static isCounter(value) {
    return #count in value;
  }
}
```

## Inheritance

```js
class AuditedRecord extends Record {
  #audit = [];

  constructor(key, value) {
    super(key, value);              // must run before this is used
    this.#audit.push('created');
  }

  describe() {
    return `[audited] ${super.describe()}`;
  }
}
```

`super(...)` calls the parent constructor and must run before the body touches `this`, because the subclass instance
does not exist until then. `super.method()` calls the parent's version, which is how an override extends behaviour
rather than replacing it.

Fields are initialised in order: the parent's fields, then the parent constructor body, then the subclass fields,
then the subclass constructor body. A parent method called from a parent constructor therefore sees the parent's
fields and not the subclass's, which is the classic reason not to call an overridable method from a constructor.

## Static members

```js
class Registry {
  static #instances = [];

  static register(instance) {
    Registry.#instances.push(instance);
  }

  static get size() {
    return Registry.#instances.length;
  }

  static {
    Registry.#instances = [];
  }
}
```

A static field belongs to the class, a static method is called on the class, and a static block runs once when the
class is defined, which is where initialisation that needs more than one statement goes. A private static member is
visible to the whole class body, including instance methods, which makes it the place for a counter shared by every
instance.

## An abstract-ish base

```js
class Shape {
  area() {
    throw new Error('area() must be implemented by a subclass');
  }
}

class Circle extends Shape {
  #radius;

  constructor(radius) {
    super();
    this.#radius = radius;
  }

  area() {
    return Math.PI * this.#radius ** 2;
  }
}
```

JavaScript has no abstract keyword, so a base method that throws is the convention. The failure arrives at the call
rather than at the definition, which is the cost of not having a compiler to complain.

## Composition beats inheritance here too

```js
class Report {
  #store;
  #formatter;

  constructor(store, formatter) {
    this.#store = store;
    this.#formatter = formatter;
  }

  render() {
    return this.#formatter.format(this.#store.all());
  }
}
```

A class that holds two collaborators publishes the methods it supports and inherits nothing it cannot honour. Reach
for `extends` when the subtype genuinely is a kind of the parent, and for a field when it merely uses one. A deep
hierarchy in JavaScript is harder to follow than in a compiled language, because a method can be replaced on a
prototype at any time and the source does not tell you what actually runs.

## Check yourself

Write a class with a private field, a getter, a static factory and a `static` block. Then extend it, override one
method, call the parent version through `super`, and read the error you get from touching the private field outside
the class.
