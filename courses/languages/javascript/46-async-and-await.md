---
title: async and await
summary: Synchronous looking code over promises, the loop that serialises it, and where async cannot go.
chapter: Asynchronous JavaScript
minutes: 13
status: draft
---

## An async function returns a promise

```js
async function load(path) {
  const text = await readFile(path, 'utf8');
  return JSON.parse(text);
}

console.log(load('config.json'));       // Promise { <pending> }
```

Marking a function `async` makes it return a promise, whatever it returns, and lets it use `await` inside. A returned
value is wrapped and a thrown error becomes a rejection, which is what makes the function usable with `await` or with
`.then`.

```js
const load = async (path) => JSON.parse(await readFile(path, 'utf8'));
```

The arrow form is the same thing, and an `async` method in a class is a normal method with the keyword:

```js
class Store {
  async find(key) {
    return this.rows.get(key);
  }
}
```

Constructors cannot be async, because a constructor has to return an instance rather than a promise. A class needing an
asynchronous setup gives the work to a static factory:

```js
class Store {
  static async connect(url) {
    const connection = await open(url);
    return new Store(connection);
  }
}
```

## await pauses the function, not the thread

```js
async function report() {
  console.log('start');

  const rows = await fetchRows();

  console.log('got', rows.length);

  return rows.length;
}

const fetchRows = () => Promise.resolve([1, 2, 3]);
```

At the `await`, the function is suspended and control returns to whoever called it. The thread carries on with other
work, and the rest of `report` resumes as a microtask when the promise settles. Nothing is blocked, which is the
difference from a sleep.

```js
console.log('before');
report();
console.log('after');
```

```text
before
start
after
got 3
```

## Errors are ordinary

```js
async function loadConfig(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`invalid config at ${path}`, { cause: error });
  }
}
```

A rejection from an awaited promise arrives as a thrown error at the `await`, so a `try` around it works exactly as it
does for synchronous code. One `try` around three awaits catches a failure from any of them, which is a common mistake
when the three are unrelated:

```js
const rows = await fetchRows();
const users = await fetchUsers();
```

If `fetchRows` fails, `fetchUsers` never runs and the `catch` cannot tell you which failed. Wrap each one, or give
them different messages.

## The loop that serialises

```js
for (const url of urls) {
  results.push(await fetch(url));
}
```

That is one request at a time: ten requests of 100 milliseconds take a second. The parallel version is shorter and ten
times faster:

```js
const results = await Promise.all(urls.map((url) => fetch(url)));
```

Both are correct, and the choice is about whether the requests are independent and whether the server can take them at
once. The trap is that the serial version is written by default, because `await` reads like a statement and the loop
looks natural.

Sequential is the right choice when each request depends on the last:

```js
let cursor;

do {
  const page = await fetchPage(cursor);
  results.push(...page.items);
  cursor = page.next;
} while (cursor);
```

## for await over a stream

```js
for await (const row of rows) {
  await save(row);
}
```

`for await` consumes an async iterable, which is what an async generator, a data stream and a page fetcher produce. The
generators chapter covers writing one, and the loop is the same shape as the synchronous version with one keyword added.

## Top level await

```js
// src/report.js, an ES module
const config = await loadConfig('./config.json');

export const batchSize = config.batchSize;
```

A module may await at the top level, and anything importing it waits. That removes the wrapper function that used to
surround a startup path, and it works in Node and in a browser module. A CommonJS file cannot, so a `.cjs` startup
script keeps the wrapper or moves the work into an async function it calls.

## Where async does not fit

```js
[1, 2, 3].sort(async (a, b) => a - b);          // the comparator returns a promise
```

A comparator has to return a number, and an async function returns a promise, so the sort compares promises and leaves
the array in an arbitrary order. The same applies to a `forEach` callback that is async: the loop does not wait, so the
code after it runs before the work finishes.

```js
promises.forEach(async (promise) => {
  await promise;             // does not wait
});

await Promise.all(promises);   // this is the version that waits
```

A callback that the runtime calls synchronously cannot be made asynchronous, because nothing is there to await it.
Collect the promises and await them together, or use `for await` with a `for` loop.

## Keeping it flat

```js
async function summarise(paths) {
  const contents = await Promise.all(paths.map((path) => readFile(path, 'utf8')));
  const records = contents.flatMap((text) => parse(text));

  return {
    count: records.length,
    total: records.reduce((sum, record) => sum + record.value, 0),
  };
}
```

One await, then ordinary synchronous code over the result. Asynchronous code that awaits in five places with three
`try` blocks is hard to follow, and the work of gathering the data is usually separable from the work of processing it.

## Check yourself

Write an `async` function that awaits twice in sequence and once in parallel with `Promise.all`, and time both. Then
write a `forEach` with an async callback and show that the code after it runs first, and fix it collecting promises.
