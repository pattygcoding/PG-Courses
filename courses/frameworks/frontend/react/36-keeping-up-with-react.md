---
title: Keeping up with React
summary: How the version line works, what 19 changed, and reading a lock file before it reads you.
chapter: Shipping
minutes: 12
status: draft
---

## The version line

React releases a minor version every few months and does not put breaking changes in one. The project this
course was written against is at 19.3.1, which means the nineteenth major line, third minor, first patch:

```text
19.x   new features and deprecations, no breaking changes
20.0   the next major, and the migration guide that goes with it
```

That is a promise about the library rather than about the ecosystem around it. React Router 8 requires Node
22.22 or later, and React 19.2.7 or later, so a project on an older Node gets an older router. Which brings me to
the lesson that cost me time writing this course:

```bash
npm install react-router
npm ls react-router
```

```text
pg-react-verify@0.0.0
└── react-router@7.18.5
```

I asked for the package, the registry's `latest` tag pointed at 8.5.1, and npm resolved 7.18.5 because of the
`engines` field. There was no warning I noticed at the time. The habit worth keeping: after an install, read what
you got, not what you asked for. `npm ls <package>`, `npm outdated` and `npm view <package> engines` answer the
question in one line each.

## What 19 changed

| Change | What to do |
| --- | --- |
| `ref` is an ordinary prop | drop `forwardRef`, take `ref` in the props |
| `use()` reads a promise or a context | use it for a promise a loader started |
| actions, `useActionState`, `useOptimistic` | replace a hand-written pending flag |
| `propTypes` and `defaultProps` on function components | props with defaults, or TypeScript |
| string refs and legacy context | removed in 19, and gone for years |
| `renderToReadableStream` | the streaming API for server rendering |

An example of the first row, from this project:

```tsx
interface FieldProps {
  readonly label: string;
  readonly ref?: Ref<HTMLInputElement>;
}

export function Field({ label, ref }: FieldProps) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}
```

`forwardRef` still compiles and is no longer needed, which is the pattern most React migrations follow: the old
API keeps working for a major version while the documentation moves on.

## The compiler is the other half

React 19 shipped alongside the React Compiler at 1.0, and the two together change what application code looks
like: fewer `useMemo` and `useCallback` calls, fewer dependencies to get wrong, and a lint rule that reports a
component it cannot reason about.

```ts
react({ compiler: true })
```

```bash
npm install -D oxc-transform-react
```

That is the whole adoption for a Vite project, with the caveat this course measured: 6.5 kB of JavaScript, or
roughly 3 kB over the wire, in exchange for no redundant renders in the component that was measured. For an
application with a heavy render tree, that is a trade worth taking. For a page with three components, it is
neither here nor there.

## How to follow it

- **The changelog on GitHub** for the patch and minor releases, which is where the deprecation warnings come from
  long before they become errors.
- **The release post** for a major, which names the changes that need a decision.
- **The migration guide**, which is a task list, and which is why upgrading one major at a time is easier than
  skipping two.
- **`npm outdated`** on a schedule, so a major is never a surprise the day before a release.
- **The upgrade codemods** for the mechanical edits, followed by a read of the diff. A codemod that renames an API
  is right; a codemod that moves a block of logic is worth reviewing line by line.

## Upgrading without drama

The order I use, which is the order the scripts in this project already support:

```bash
npm outdated
npm install react@latest react-dom@latest @types/react@latest
npm run build
npx vitest run
npm run preview
```

The type check catches the API removals, the tests catch the behaviour, and the preview catches the render. Then I
read the lock file diff for a package that moved a major without being asked, which is what the router did in
reverse when the Node version was too old.

Four things make the upgrade cheap, and all of them are decisions made long before it:

- Types on every prop, so a renamed API is a compile error rather than a runtime one.
- Tests on the behaviour, so a render change is caught rather than reported.
- A small dependency tree, so there are fewer packages to move at once.
- A pin on what matters. `"react": "^19.3.1"` takes patches and minors, which is what the release model promises,
  and a package I do not trust gets an exact version.

## What has not changed

The parts of React this course is really about have been stable for years: a component is a function, props go
down and callbacks go up, state belongs to the component that owns it, an effect synchronises with something
outside React, and the URL is state. The syntax for each has changed around the edges and the ideas have not.

That is the reason to learn the model rather than the current API surface: five years of releases have added
hooks, actions, a compiler and a promise reader, and every one of them landed on the same four concepts.

## Check yourself

Read the changelog for the last three minor releases and find one deprecation that applies to code you have. Then
run `npm outdated` in a project of yours, pick the smallest upgrade that is also valuable, and do it with the
build, tests and preview in that order.
