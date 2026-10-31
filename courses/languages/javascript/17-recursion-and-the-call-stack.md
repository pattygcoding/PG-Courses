---
title: Recursion and the call stack
summary: A base case and a smaller step, the depth limit, and how to turn a deep recursion into a loop.
chapter: Functions and scope
minutes: 13
status: draft
---

## A recursive function needs two things

```js
function total(values, index = 0) {
  if (index === values.length) {
    return 0;                       // base case
  }

  return values[index] + total(values, index + 1);   // smaller step
}

console.log(total([1, 2, 3]));       // 6
```

A base case that returns without recursing, and a step that moves toward it. Remove either and the function
recurses until the stack runs out.

Where the data is nested, recursion is often the clearest thing you can write:

```js
function flatten(node) {
  if (Array.isArray(node)) {
    return node.flatMap(flatten);
  }

  return [node];
}

console.log(flatten([1, [2, [3, 4]]]));      // [ 1, 2, 3, 4 ]
```

## The stack has a depth limit

```js
function depth(n) {
  if (n === 0) {
    return 0;
  }

  return 1 + depth(n - 1);
}

console.log(depth(10_000));
```

```text
RangeError: Maximum call stack size exceeded
```

Every call takes a stack frame, and the stack has a fixed size. Node overflows somewhere around ten thousand
frames depending on what each one holds, which is far above the depth of a normal tree and well below the depth of
a linked list with a million nodes.

## Tail calls are not optimised everywhere

A tail call is a recursive call in return position where nothing is left to do with the result:

```js
function countdown(n) {
  if (n === 0) {
    return 'done';
  }

  return countdown(n - 1);           // a tail call
}
```

Proper tail calls are part of the specification and are only implemented in JavaScriptCore, which is Safari's
engine. `countdown(100_000)` overflows in Node and V8. Writing a tail recursive function and expecting it to be
optimised is a mistake that shows up in production.

## Turning it into a loop

The recursive flatten above becomes a loop with an explicit stack, which has no depth limit:

```js
function flatten(node) {
  const output = [];
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop();

    if (Array.isArray(current)) {
      stack.push(...current.toReversed());     // pop takes the last, so push in reverse
    } else {
      output.push(current);
    }
  }

  return output;
}

console.log(flatten([1, [2, [3, 4]]]));      // [ 1, 2, 3, 4 ]
```

The explicit stack is doing what the call stack did, and it lives on the heap, so the only limit is memory. That is
the conversion to reach for when the input can be deep: a file path walk, a document tree, a graph traversal.

The order is the one thing to watch. `pop` takes the last element, so pushing the children in reverse is what keeps
the visit order the same as the recursive version; drop the `toReversed` and the output comes out backwards.

## Depth-first search is recursion with a set

```js
function walk(node, visit, seen = new Set()) {
  if (seen.has(node)) {
    return;                          // a cycle stops here
  }

  seen.add(node);
  visit(node);

  for (const child of node.children ?? []) {
    walk(child, visit, seen);
  }
}
```

Without the `seen` set, a graph with a cycle recurses until it overflows, because nothing tells it that it has been
where it is going. Trees need no set; anything that can point back at itself does.

## Memoising a recursive function

```js
function fib(n, cache = new Map()) {
  if (n < 2) {
    return n;
  }

  if (!cache.has(n)) {
    cache.set(n, fib(n - 1, cache) + fib(n - 2, cache));
  }

  return cache.get(n);
}

console.log(fib(40));       // 102334155, quickly
```

Without the cache, `fib(40)` makes about 300 million calls. With it, forty. The cache is threaded through the
recursion as a parameter, which is the version that works inside a module; the closure version from the memoize
example does the same thing with one less argument.

## Where recursion is the right answer

- A tree or a document where each node holds the same kind of thing.
- A parser that mirrors the grammar it reads.
- Divide and conquer, such as a merge sort.
- Anything whose iterative version needs an explicit stack you would have to write by hand.

Where a loop over a flat array does the job, the loop is shorter and has no depth limit. The case for recursion is
that the data is recursive, not that the function is elegant.

## Check yourself

Write a function that computes a factorial recursively, then call it with 100 and read the error. Convert it to a
loop and run it again. Then write a recursive flatten and an iterative one and compare them on a deeply nested
array.
