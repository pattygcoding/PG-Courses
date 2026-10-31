---
title: Objects, keys and untrusted input
summary: The inherited names that appear in a lookup, the key that changes a prototype, and the merge that changes every object.
chapter: Security and shipping
minutes: 14
status: draft
---

## A lookup can find an inherited name

```js
const statusMap = { ok: 200, missing: 404 };
const input = 'toString';

console.log(statusMap[input]);                  // [Function: toString]
console.log(statusMap[input] === undefined);     // false
```

A key from a request that is not in the map still finds something, because the prototype chain answers. `toString`,
`constructor`, `valueOf` and `hasOwnProperty` are all reachable that way, so a check for a missing key that tests
`=== undefined` passes when it should fail.

```js
console.log(Object.hasOwn(statusMap, input));      // false
```

`Object.hasOwn` is the test that answers the question about the key rather than about the chain. The other fix is a
container with no chain at all:

```js
const statusMap = new Map([['ok', 200], ['missing', 404]]);

statusMap.get(input);          // undefined, whatever the input is
```

A `Map` is the right container for anything keyed by a string from outside the program, because there is no inherited
name to collide with and no setter to invoke. That is one of the better reasons to prefer it to an object literal.

## The `__proto__` key does three different things

```js
const route = {};

route['__proto__'] = { admin: true };

console.log(route.admin);                                          // true
console.log(Object.getPrototypeOf(route) === Object.prototype);      // false
```

Assigning `__proto__` on a plain object invokes the inherited setter and replaces the object's prototype. That object now
inherits from something a caller supplied, which is a surprise rather than a global problem yet.

```js
route.__proto__.polluted = true;

console.log(({}).polluted);        // true, for every object in the process
```

Reading `__proto__` gives `Object.prototype`, and then writing to it changes the prototype of every object. That is the
global version, and it is what the name prototype pollution refers to.

```js
const body = JSON.parse('{"__proto__": {"polluted": true}}');

console.log(Object.hasOwn(body, '__proto__'));       // true
console.log(({}).polluted);                            // undefined
```

`JSON.parse` defines the key as an ordinary own property, so a parsed body is harmless by itself. The damage happens when
something copies it, and three copied paths behave differently:

| Copy | What happens |
| --- | --- |
| `{ ...body }` | the key stays an own property, the prototype is untouched |
| `Object.assign({}, body)` | the setter runs and the target's prototype is replaced |
| a recursive deep merge | can write onto `Object.prototype` itself |

The third is the one that makes it global, and it is a dozen lines of ordinary code:

```js
function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object') {
      target[key] ??= {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }

  return target;
}

deepMerge({}, JSON.parse('{"a":{"__proto__":{"polluted":true}}}'));

console.log(({}).polluted);        // true
```

Once that has run, every object in the process has a `polluted` property. Whether it matters depends on the name: a
lookup that returns it, a check that trusts it, or a framework that walks the prototype chain is enough.

## Defending against it

```js
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

function assign(target, source) {
  const output = Object.create(null);

  for (const [key, value] of Object.entries(source)) {
    if (FORBIDDEN.has(key)) {
      continue;
    }

    output[key] = value;
  }

  return output;
}
```

An allow list of keys is stronger than a deny list, and it is what a request handler with three fields should use: read
the three, ignore everything else. A deny list is for a merge that has to accept arbitrary keys.

```js
const merged = Object.assign(Object.create(null), source);
```

A target with no prototype has no `__proto__` setter to invoke, so the key lands as an ordinary property. That is the
cheapest structural defence, and it is the reason to know `Object.create(null)` for any accumulator built from external
keys.

```js
Object.freeze(Object.prototype);
```

Freezing the prototype stops the write, and it is a blunt instrument: it also stops any library that deliberately adds to
`Object.prototype`, which some do. It is worth considering in a service and not worth considering in a library.

## Mass assignment is the same problem from the other side

```js
app.post('/api/rows', async (request, response) => {
  await store.save(request.body);
});
```

Whatever the caller sent becomes the row, which is how a field nobody meant to expose gets set: an `isAdmin` flag, a
`price`, an `ownerId`. Reading the fields you expect, explicitly, is the fix:

```js
const { key, value } = request.body;

await store.save({ key: String(key).trim(), value: Number(value) });
```

That also converts the types, which is worth doing on its own. A schema validator does both jobs at once, which is why a
project with a validator passes the body through it rather than destructuring by hand.

## Reading a value by path

```js
function get(object, path) {
  return path
    .split('.')
    .reduce((value, key) => (value == null ? value : value[key]), object);
}

console.log(get({}, 'constructor.name'));       // 'Object'
```

A helper that walks a path from a string resolves the same dangerous keys, and it can reach a prototype to read a
function or a constructor. A path from a request is an instruction to read a property, so the allow list applies to it
too: check the first segment against the keys the object is allowed to expose, or use a library that only walks own
properties.

## Check yourself

Build an object with one key, look up `toString` and `constructor` on it, and show what each returns. Then run the
recursive merge above with a body containing `__proto__`, and confirm that a new empty object has the polluted property.
Fix the merge with a deny list and check again.
