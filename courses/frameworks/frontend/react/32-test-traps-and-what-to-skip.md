---
title: Test traps and what to skip
summary: The failures I hit in this project, what each one was telling me, and the tests not to write.
chapter: Testing
minutes: 13
status: draft
---

## Traps, with the message each one gives

**A label used twice.** The layout's sign-in field and the loan form's member field both had a label reading
"Member", and every query in the form test failed:

```text
TestingLibraryElementError: Found multiple elements with the text of: Member
```

Renaming the layout's label to "Sign in as" fixed it, and the fix was worth more than the test: two controls with
the same accessible name is a real problem for somebody using a screen reader to move between fields.

**A render that suspends.** Covered on the previous page, and the message names the fix:

```text
A component suspended inside an `act` scope, but the `act` call was not awaited.
await act(() => ...)
```

**A stub that is not a Response.** `useReport`'s first test failed with `expected undefined to be '2026-10-31'`
because the stubbed fetch resolved a plain object. The real code checks `response.ok`, got `undefined`, took the
error branch and set an error message. Every stub in this project now returns a real `Response`.

**A jsdom method that does not exist.** Every navigation logged this while the router's `ScrollRestoration`
component ran:

```text
Not implemented: Window's scrollTo() method
```

Stubbing `window.scrollTo` in the setup file silences it. The deeper point is that jsdom is not a browser: layout,
scrolling and IntersectionObserver are missing or approximate, so a test that depends on geometry belongs in a
browser test runner rather than in jsdom.

**A promise chain on `act`.** `act(...).then(...)` returns `undefined`, because React's `act` returns a thenable
of its own rather than a promise. Wrapping the call in an async function and awaiting it is the shape that works.

**State that leaks between tests.** A member name written to `localStorage` in one test appeared in the next, and
a test that typed a name found it already filled in. `localStorage.clear()` and `vi.unstubAllGlobals()` in an
`afterEach` are two lines and remove the whole category.

## What to test

- **Behaviour through the interface.** Type, click, select, then assert what a person would see. A test that calls
  a method on the component and inspects a variable tests the implementation, and it passes after the behaviour
  breaks.
- **The states a page can be in.** Loading, error, empty, loaded. Four tests, and they are the four a bug report
  comes from.
- **What was sent.** The `bodyOf` assertion, because a field's `name` is invisible to every rendering test.
- **The rules.** A reducer, a validator and a formatter are pure functions, and a test for one of them is three
  lines with no rendering.

## What to skip

- **The framework.** A test that `useState` updates a value, that `@if` hides an element or that a key makes React
  reuse a row is a test of React.
- **A snapshot of a whole page by default.** It fails on every copy change, it passes on behaviour that is
  broken, and the diff is too large to read. A snapshot of a small, stable piece such as an error message is a
  different thing.
- **Private details.** A test that imports a helper from inside a component module is coupled to a decision that
  was meant to be free to change.
- **Coverage as the goal.** Coverage tells you which lines never ran, which is useful, and it does not tell you
  whether the assertions mean anything. A file at a hundred percent with no assertions is a file nobody checked.

## The pipeline command

```bash
npm run build && vitest run
```

The build first, because `tsc -b` catches a type error in a test file that Vitest would run anyway, and the
type check is faster than the suite. `vitest run` rather than `vitest`, so the process exits with a code instead
of waiting for a file change.

## Check yourself

Take the tests you have written and delete every assertion that could pass with the feature broken. Then add back
the one assertion per test that would have failed, and compare the count with what you started with.
