---
title: JSON and serialisation
summary: The six types JSON has, everything it silently loses, and the key that changes an object's prototype.
chapter: Objects and classes
minutes: 13
status: draft
---

## JSON has six types

An object, an array, a string, a number, `true` or `false`, and `null`. That is the whole format, and everything
JavaScript has beyond it is dropped or converted on the way out.

```js
const src = {
  at: new Date('2024-03-01T00:00:00Z'),
  n: NaN,
  missing: undefined,
  fn: () => 1,
  tags: new Map([['a', 1]]),
};

console.log(JSON.stringify(src));
```

```text
{"at":"2024-03-01T00:00:00.000Z","n":null,"tags":{}}
```

Four conversions in one line: the `Date` became an ISO string, `NaN` became `null`, the property holding `undefined`
and the one holding a function were dropped, and the `Map` serialised as an empty object because its entries are not
own enumerable properties.

A `bigint` is the one that throws:

```text
TypeError: Do not know how to serialize a BigInt
```

## The whole table

| Value | In JSON |
| --- | --- |
| `Date` | the ISO string from `toJSON` |
| `NaN`, `Infinity` | `null` |
| `undefined` | dropped from an object, `null` in an array |
| a function | dropped from an object, `null` in an array |
| a symbol keyed property | dropped |
| `Map`, `Set` | `{}` |
| `RegExp` | `{}` |
| `bigint` | throws |
| a cycle | throws |

```text
TypeError: Converting circular structure to JSON
```

An array keeps its length, which is why `undefined` becomes `null` there rather than disappearing: a hole would
change the indices of everything after it.

## toJSON lets a type choose its form

```js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  toJSON() {
    return `${this.amount} ${this.currency}`;
  }
}

console.log(JSON.stringify(new Money(10, 'GBP')));    // '"10 GBP"'
```

`JSON.stringify` calls `toJSON` when it exists, which is how `Date` produces an ISO string. A value type that needs
a specific wire form implements it, and the change stays with the type instead of spreading through every call site.
Returning a string rather than an object is deliberate for money, because a JSON number is a double.

## The replacer

```js
console.log(JSON.stringify({ a: 1, b: 2 }, ['a']));               // '{"a":1}'
console.log(JSON.stringify({ a: 1, b: 2 }, (key, value) =>
  typeof value === 'number' ? value * 2 : value));                // '{"a":2,"b":4}'
console.log(JSON.stringify({ a: 1 }, null, 2));
```

```text
{
  "a": 1
}
```

An array of keys is an allow list. A function is called for every key with the key and the value, and returning
`undefined` removes the property. `null` for the replacer and a number or a string for the space is the pretty
printed form, which is worth putting in a log line and not in a response body, where the extra bytes are paid on
every request.

## The reviver

```js
const parsed = JSON.parse('{"at":"2024-03-01T00:00:00.000Z"}', (key, value) =>
  key === 'at' ? new Date(value) : value);

console.log(parsed.at instanceof Date);       // true
```

Without the reviver a date comes back as a string, and the type is lost. A reviver is called for every key, which
makes it a good place for a rule that applies everywhere and a bad place for anything expensive.

## Parsing input you did not write

```js
const body = JSON.parse(text);        // safe, it is a parser
const body = eval('(' + text + ')');   // never: it runs code
```

`JSON.parse` cannot execute anything, so the parsing itself is safe. The value it returns is not validated, and the
next line is where the trouble starts:

```js
if (typeof body.key !== 'string' || !Number.isInteger(body.value)) {
  throw new Error('unexpected shape');
}
```

A check of the shape is not optional, because the input comes from somewhere you do not control. That is what a
schema validator such as `zod` or `ajv` is for, and a hand written check is fine for two fields.

## The __proto__ key

```js
const body = JSON.parse('{"__proto__": {"polluted": true}}');

console.log(Object.hasOwn(body, '__proto__'));      // true
console.log(({}).polluted);                          // undefined
```

`JSON.parse` defines `__proto__` as an ordinary own property, so the body itself is harmless and the global prototype
is untouched. The danger appears when that body is merged into another object:

```js
const target = Object.assign({}, body);

console.log(Object.getPrototypeOf(target) === Object.prototype);   // false
console.log(target.polluted);                                        // true
```

`Object.assign` uses ordinary assignment, which invokes the inherited `__proto__` setter, so the target's prototype is
replaced with the parsed object. A hand written deep merge that recurses and assigns into nested objects can go one
step further and write onto `Object.prototype` itself, which changes every object in the process:

```js
const plain = {};
plain.__proto__.polluted = true;

console.log(({}).polluted);        // true, for every object from now on
```

Two defences cover it. Use `Object.create(null)` for a lookup built from external keys, which has no `__proto__`
setter to invoke. And validate the shape of parsed input before merging it, so a key nobody expected never reaches an
assignment.

## What JSON is not for

JSON has no date, no big integer, no comment, no schema and no way to express a reference. For a local file you
control, a format with those things is easier to work with. For a payload between systems, JSON is the choice because
everything can read it, and the rules above are the price: convert the values deliberately on the way out and validate
the shape on the way in.

## Check yourself

Serialise an object holding a `Date`, a `Map`, a `bigint` and a function, and list what each one became. Add a
`toJSON` to a class so it serialises as a string, then parse it back with a reviver that restores the type.
