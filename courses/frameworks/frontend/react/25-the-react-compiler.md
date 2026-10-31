---
title: The React Compiler
summary: Memoization inserted at build time, measured with a render counter, and the bundle it costs.
chapter: Performance
minutes: 15
status: draft
---

## What it is

The React Compiler is a build step that reads every component and inserts the memoization people used to write
by hand: a computed value that does not need recomputing, a callback with a stable identity, a piece of JSX
that can be reused when its props have not changed. It reached 1.0 alongside React 19, and it is the reason
this course does not sprinkle `useMemo` through its components.

It is a compiler rather than a runtime, so its rules come from that: a component has to be analysable. Mutating
a prop while rendering, or reading a value before it is initialised, are the things it cannot reason about, and
it skips the component and says so through the linter instead.

## Turning it on with Vite

```ts
export default defineConfig({
  plugins: [
    // `compiler: true` runs the React Compiler over every component, which
    // memoizes the parts that do not change between renders.
    react({ compiler: true }),
    apiStub(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

The first attempt failed, and the message says exactly what to install:

```text
[vite] React Compiler requires the optional `oxc-transform-react` package.
Install it in your project before enabling `react({ compiler: true })`.
Cannot find package 'oxc-transform-react' imported from node_modules/@vitejs/plugin-react/dist/index.js
```

```bash
npm install -D oxc-transform-react
```

```text
pg-react-verify@0.0.0
├─┬ @vitejs/plugin-react@6.1.2
│ ├── babel-plugin-react-compiler@1.0.0 deduped
│ └── oxc-transform-react@0.152.0 deduped
```

Vite compiles through Oxc, so the compiler runs there rather than through Babel, and `oxc-transform-react` is
the optional package that carries it. `babel-plugin-react-compiler` stays in the tree because the plugin
supports both paths.

## What it does, measured

The measurement needs a component that counts its own renders, and a child that receives the same props while
its parent re-renders:

```tsx
export function ShelfSummary({ books }: ShelfSummaryProps) {
  countRender();

  const copies = books.reduce((total, book) => total + book.copies, 0);

  return (
    <p className="summary">
      {books.length} titles, {copies} copies on the shelf.{' '}
      <span className="renders">renders {renderCount()}</span>
    </p>
  );
}
```

The catalogue renders that child, and typing four characters into the search box re-renders the parent four
times. The child's props do not change, because the book list is the same array. One browser session, one
measurement, both values read off the page:

| | before the first keystroke | after four keystrokes |
| --- | --- | --- |
| without the compiler | renders 4 | renders 20 |
| with the compiler | renders 1 | renders 1 |

Sixteen renders for four keystrokes, then none. The second row is the compiler reusing the child's element
because nothing it depends on changed, which is the whole of the win.

Two caveats about those numbers. The absolute counts include `StrictMode`'s double render in development, which
is why the first row starts at 4 rather than 1, so the difference is the measurement rather than the total. And
a production build renders less than either, so treat development counts as a comparison rather than a figure
to optimise.

## What it costs

```text
                        before            after
index.js       330.73 kB / 104.06 kB   337.24 kB / 106.72 kB
Reports chunk    1.47 kB /   0.64 kB     2.36 kB /   1.02 kB
```

Six and a half kilobytes of JavaScript, or a little under three over the wire, for the compiler's runtime calls
and the memo caches it allocates. The reports chunk nearly doubled, from 1.47 kB to 2.36 kB, because it is small
enough that the memo code is a large share of it.

That is the trade in one table: a small increase in what every visitor downloads, in exchange for removing a
class of wasted renders that people were adding by hand, and for removing the chance of getting a dependency
array wrong in the code they write next.

## The rules it enforces

The compiler's own linter found two real problems in this project, and both were worth fixing rather than
silencing:

```text
`addOptimistic` is read during its own initialization. Move the access after initialization.
```

```text
Effects should synchronize React with external systems. Calling setState synchronously inside an effect
starts another render and is usually unnecessary.
```

The first was an action function created before the hook it called was initialised, fixed by moving the action
into a function declaration below both hooks. The second was a loading flag set inside an effect, fixed by
moving it into the handler that caused the reload. Neither is a compiler quirk: both are patterns that cost a
render or an ordering hazard whether or not a compiler is watching.

## What it cannot fix

- **A large list that re-renders.** If the parent's state changes and the props to a thousand rows change with
  it, the compiler cannot avoid the work. The fix is where the state lives, or a virtualised list.
- **A missing key in a list.** Without identity React rebuilds rows, and memoization does nothing about it.
- **A slow component body.** A memoized component that takes 20 ms is still 20 ms the first time it renders.
- **An effect that fetches twice.** The compiler does not touch effects beyond memoizing their dependencies.

Memoization removes repeated work; it does not remove work, and it does not replace measuring. The next page is
about getting those numbers.

## Check yourself

Turn the compiler off, load the catalogue with the network and CPU throttled, and count the renders while
typing. Turn it on, repeat the measurement, and write both numbers next to the bundle size from the build
output. Then decide whether you would enable it in an application that ships to slow phones.
