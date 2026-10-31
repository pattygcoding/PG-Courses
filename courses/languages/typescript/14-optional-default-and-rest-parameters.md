---
title: Optional, default and rest parameters
summary: The three ways a parameter can be absent, and the two spellings that mean different things.
chapter: Functions and collections
minutes: 12
status: draft
---

## A parameter can be optional

```ts
function connect(url: string, timeout?: number): void {
  console.log(url, timeout ?? 5000);
}

connect('https://example.com');
connect('https://example.com', 1000);
```

A `?` after the name makes the parameter optional for the caller and `undefined` inside the body. It has to come after
every required parameter, because arguments are positional and a required one after an optional would be a hole no
caller could fill.

The two spellings are not the same:

| Declaration | Caller must pass | Body sees |
| --- | --- | --- |
| `timeout?: number` | no | `number \| undefined` |
| `timeout: number \| undefined` | yes, and it may be `undefined` | `number \| undefined` |

The first says the argument can be omitted; the second says it must be provided and may be `undefined`. That difference
matters for a wrapper that forwards its arguments, because a required parameter cannot be left off, and for a function
used as a callback, because an optional parameter makes the function assignable where a shorter signature is expected.

## A default parameter is not optional in the body

```ts
function connect(url: string, timeout = 5000): void {
  console.log(url, timeout);
}

connect('https://example.com');
```

With a default, `timeout` is a `number` inside the body, because the compiler knows it was filled in when the argument
was missing. That is the main reason to prefer a default to an optional parameter with a `??` in the body: one line
fewer and one branch fewer, and the type is narrowed for free.

```ts
function tag(value: string, prefix = 'row', ...rest: string[]): string {
  return [prefix, value, ...rest].join(':');
}

tag('a');
tag('a', 'id', 'x', 'y');
```

A default can be any expression and is evaluated per call, so it can call a function or read a value that changed since
the last call. It can also refer to a parameter to its left, which is how a value derived from another argument is
written.

## Rest parameters collect the tail

```ts
function sum(...values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

sum(1, 2, 3);
sum();
```

A rest parameter is an array of the remaining arguments, it must be last, and each of its callers passes any number of
them. The type can be a tuple rather than an array, which is how a function requires at least one argument:

```ts
function firstOf<T>(head: T, ...rest: T[]): T {
  return head;
}
```

That signature makes the first argument required and the rest optional, and it is the shape to use instead of indexing
into an array and checking for undefined.

## Spreading a tuple into arguments

```ts
function distance(x: number, y: number): number {
  return Math.hypot(x, y);
}

const point: [number, number] = [3, 4];

distance(...point);
```

A spread of a tuple is checked against the parameters by position, so a tuple of the wrong length or the wrong element
types is an error. A spread of a plain array is not, which is why a tuple is worth having when the arguments come from a
value rather than from the call site:

```ts
const values: number[] = [3, 4];

distance(...values);
```

```text
error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
```

That error appears when the compiler cannot tell how many arguments a spread will produce, and the fix is either a tuple
in the source or a rest parameter on the function.

## Arguments are read by position

```ts
function move(from: Point, to: Point): void { }

move(to, from);      // compiles, and moves the wrong way
```

Two parameters of the same type are interchangeable as far as the compiler is concerned, which is the argument for an
options object where the meaning of each value is in the name:

```ts
function move(options: { from: Point; to: Point }): void { }

move({ from, to });
```

The object form costs a little at the call site and removes the class of bug where two same-typed arguments are
swapped. Where two or three parameters are clearly ordered, the positional form is shorter and fine.

## Check yourself

Write one function with an optional parameter and one with a default, and check the type inside each body by hovering.
Then write a function with a rest parameter and call it with none and with four arguments, and finally spread a tuple
into a function and an array into the same function and compare the two results.
