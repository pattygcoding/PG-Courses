---
title: Declarations, hoisting and scope
summary: var, let and const, the temporal dead zone, and the loop that made a generation of closures wrong.
chapter: Functions and scope
minutes: 13
status: draft
---

## var is function scoped and hoisted

```js
console.log(typeof hoisted);    // 'undefined', not an error

var hoisted = 1;
```

The declaration is moved to the top of the enclosing function and the initialiser stays where it is, so reading the
name before the assignment gives `undefined`. That is hoisting.

```js
function example() {
  if (true) {
    var inside = 1;
  }

  console.log(inside);          // 1, the block did not contain it
}
```

`var` is scoped to the function, so a declaration inside a block is visible in the whole function and a re-declared
name silently overwrites the earlier one. That is the behaviour `let` and `const` were added to fix.

## let and const are block scoped

```js
{
  let inside = 1;
  const alsoInside = 2;

  console.log(inside, alsoInside);
}

console.log(typeof inside);     // 'undefined', out of scope
```

`typeof` on a name that was never declared returns `'undefined'` and never throws, which makes a typo hard to
spot. A module's scope is the file, so the only globals are ones you deliberately assign.

## The temporal dead zone

```js
try {
  console.log(value);
} catch (error) {
  console.log(error.name, error.message);
}

let value = 1;
```

```text
ReferenceError Cannot access 'value' before initialization
```

A `let` or `const` binding exists from the start of the block and cannot be read until its declaration runs. That
window is the temporal dead zone, and reading inside it throws rather than giving `undefined`. The behaviour is the
point: a value that is not ready is an error rather than a silent `undefined`.

## Declarations are hoisted, initialisations are not

| Declaration | Hoisted | Readable before |
| --- | --- | --- |
| `function` | yes, with its body | yes |
| `var` | yes, as `undefined` | yes, gives `undefined` |
| `let` and `const` | yes, uninitialised | no, throws |
| `class` | yes, uninitialised | no, throws |

A function declaration is fully available at the top of its scope, which is why a file can call a function defined
lower down. A class is not, so a class used before its declaration throws the same error as a `let`.

## The loop that captured one variable

```js
const callbacks = [];

for (var index = 0; index < 3; index += 1) {
  callbacks.push(() => index);
}

console.log(callbacks.map((callback) => callback()));    // [ 3, 3, 3 ]
```

All three closures share the one `var` binding, and by the time they run the loop has finished. That is the classic
bug. `let` creates a new binding for each iteration:

```js
const callbacks = [];

for (let index = 0; index < 3; index += 1) {
  callbacks.push(() => index);
}

console.log(callbacks.map((callback) => callback()));    // [ 0, 1, 2 ]
```

The iteration variable is fresh per iteration for `let`, which is a special rule for `for` loops. A closure inside
a `for...of` or a `for...in` gets a fresh binding each time for the same reason.

## Shadowing

```js
const size = 10;

function report(size) {
  return size * 2;                  // the parameter shadows the outer name
}

console.log(report(2));              // 4
console.log(size);                    // 10
```

An inner declaration hides an outer one of the same name, which is legal and usually a mistake. A linter with
`no-shadow` reports it, and the fix is a more specific name rather than a different scope.

## Where a function expression's name lives

```js
const parse = function parseLine(line) {
  return line;
};

console.log(parse.name);              // 'parseLine'
```

The name belongs to the function's own scope, so it is available for recursion inside the body and does not create
a variable outside. That is why a stack trace names the function rather than `(anonymous)`.

## Writing scope deliberately

- `const` for everything, and `let` only when the value is reassigned. `var` belongs in code you cannot change.
- Declare close to the first use, so the temporal dead zone is short and a reader has less to hold in mind.
- Keep a function short enough that its locals are visible on one screen, which makes shadowing obvious.
- The body of an `if` or a `for` is a scope, so a temporary declared there cannot leak into the rest of the
  function.

## Check yourself

Write the `var` loop and the `let` loop above, run both, and explain the two results. Then read a name in its
temporal dead zone, and read a `var` before its assignment, and compare the two errors.
