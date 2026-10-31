---
title: Proxies and reflection
summary: Intercepting the fundamental operations on an object, and the private field that breaks when you do.
chapter: Generators and metaprogramming
minutes: 13
status: draft
---

## A proxy wraps a target and traps operations

```js
const target = { count: 0 };

const logged = new Proxy(target, {
  get(object, key, receiver) {
    console.log('read', String(key));
    return Reflect.get(object, key, receiver);
  },

  set(object, key, value, receiver) {
    console.log('write', String(key));
    return Reflect.set(object, key, value, receiver);
  },
});

logged.count = 1;
console.log(logged.count);
```

```text
write count
read count
1
```

Every property read and write goes through the handler, which is what makes a proxy the one way to intercept what other
code does to an object you hand out. The target is still there underneath, so the data is real and the traps are the
observers or the gatekeepers.

## Reflect is the default behaviour

```js
Reflect.get(object, key, receiver);
Reflect.set(object, key, value, receiver);
Reflect.has(object, key);
Reflect.deleteProperty(object, key);
Reflect.ownKeys(object);
Reflect.apply(fn, thisArg, args);
Reflect.construct(Class, args);
```

Each `Reflect` method does what the corresponding operation would do, which is what a trap calls when it wants to allow
the operation. Writing `object[key]` inside a `get` trap would go back through the trap and recurse, so `Reflect.get`
with the receiver is the correct call.

The receiver argument is the part worth understanding: it is the object the access is being made on, which for an
inherited getter is the instance rather than the prototype it was found on. Passing it through is what keeps a getter
working when the object is behind a proxy.

## Four traps that earn their place

```js
const defaults = new Proxy({}, {
  get(object, key) {
    return Reflect.has(object, key) ? Reflect.get(object, key) : 0;
  },
});

console.log(defaults.missing, defaults.count);
```

```text
0 0
```

```js
const validated = new Proxy({}, {
  set(object, key, value) {
    if (key === 'count' && !Number.isInteger(value)) {
      throw new TypeError('count must be an integer');
    }

    return Reflect.set(object, key, value);
  },
});
```

Validation on write, so a bad value fails at the line that set it rather than at the line that read it, with the name
of the property in the message.

```js
const negative = new Proxy([1, 2, 3], {
  get(array, key, receiver) {
    const index = Number(key);

    return Number.isInteger(index) && index < 0
      ? Reflect.get(array, array.length + index, receiver)
      : Reflect.get(array, key, receiver);
  },
});

console.log(negative[-1], negative[0]);       // 3 1
```

Python style negative indexing, which is a demonstration as much as a use: it works, and `array.at(-1)` is one method
call with no proxy in the path.

```js
const called = new Proxy(Math.max, {
  apply(fn, thisArg, args) {
    console.log('called with', args.length);
    return Reflect.apply(fn, thisArg, args);
  },
});
```

An `apply` trap wraps a function, which is how a library times or retries a callback it was given.

## The trap must respect the target's invariants

```js
const target = {};

Object.defineProperty(target, 'fixed', { value: 1, configurable: false, writable: false });

const broken = new Proxy(target, {
  get: () => 99,
});

console.log(broken.fixed);
```

```text
TypeError: 'get' on proxy: property 'fixed' is a read-only and
non-configurable data property on the proxy target but the proxy
did not return its actual value
```

A trap cannot report something inconsistent with a property the target has locked down. The rule exists so that a
proxy is not a way around `Object.freeze`, and it is why a `get` trap returning a constant works on an empty object
and fails on one with a non-configurable property.

## Private fields break through a proxy

```js
class Counter {
  #count = 0;

  increment() {
    this.#count += 1;
    return this.#count;
  }
}

const proxied = new Proxy(new Counter(), {});
```

```text
TypeError: Cannot read private member #count from an object whose class did not declare it
```

The method is found through the proxy, but `this` is the proxy rather than the instance, and a private field can only
be read from the object that owns it. The fix is for the class to provide the proxy itself, or an approach that does
not wrap instances of a class with private fields. This is the reason a framework's reactive wrapper uses a plain
object or returns a proxy from a factory it controls.

A proxy costs on every property access, since no trap can be optimised away. A reactive framework accepts that cost
because it buys the whole reactivity system. A hand written proxy around an object inside a hot loop is a performance
bug with no compensating benefit.

## Check yourself

Wrap an object in a proxy that logs every read and write, and use it for a few lines. Then add validation on one key, a
default for a missing key, and confirm a non-configurable property breaks a `get` trap that lies.
