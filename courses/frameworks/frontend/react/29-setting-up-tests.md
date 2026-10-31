---
title: Setting up tests
summary: Vitest over jsdom with Testing Library, one config block and one setup file.
chapter: Testing
minutes: 13
status: draft
---

## What goes in

```bash
npm install -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Vite already knows how to transform TypeScript and JSX, so Vitest needs no separate build configuration. It
runs in Node with a DOM provided by jsdom, which is enough for a component that renders elements and handles
events, and not enough for layout: `getBoundingClientRect` returns zeros and scrolling does nothing.

## The config block

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import type { Connect, Plugin } from 'vite';

export default defineConfig({
  plugins: [react({ compiler: true }), apiStub()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

Four decisions in eight lines:

- `defineConfig` comes from `vitest/config` rather than `vite`. That is what types the `test` block, and using
  Vite's own `defineConfig` leaves it as an unknown property.
- The React plugin is the same instance as the build, which means the tests compile through the same transform
  as the application, compiler included.
- `environment: 'jsdom'` gives `document` and `window`. The other option is `happy-dom`, which is faster and
  slightly less complete.
- `setupFiles` is where the global test behaviour lives, and it is per project rather than per test file.

## The setup file

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Testing Library cleans up automatically only when it can see a global
// afterEach, and this project imports its test helpers instead.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

beforeEach(() => {
  // A test that expects a request stubs fetch. One that does not gets a loud
  // failure rather than a request that leaves the process.
  vi.stubGlobal('fetch', () => Promise.reject(new Error('fetch was not stubbed for this test')));

  // jsdom does not implement scrolling, and ScrollRestoration calls it.
  window.scrollTo = () => undefined;
});
```

Four things, each answering a real annoyance:

- `@testing-library/jest-dom/vitest` adds the matchers a component test wants, so an assertion reads
  `toHaveTextContent` and `toBeInTheDocument` rather than a comparison against `textContent`.
- `cleanup()` unmounts everything a test rendered. Testing Library does that for you when it can see a global
  `afterEach`; this project imports `afterEach` from `vitest`, so the call is explicit. Without it, a second
  test finds the first test's DOM in the document, which produces the "found multiple elements" failure.
- `vi.unstubAllGlobals()` and `localStorage.clear()` are per test, so one test's stubs and one test's stored
  member name do not leak into the next.
- The two lines in `beforeEach` are guards: an un-stubbed `fetch` fails loudly, and a jsdom method that a
  component calls gets a quiet no-op instead of a console warning on every navigation.

## The first test

```ts
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/render';
import { BOOKS, stubApi } from '../test/server';
import { genreLabel } from './genre';

describe('genreLabel', () => {
  it('reads a slug as a heading', () => {
    expect(genreLabel('science-fiction')).toBe('Science fiction');
  });
});
```

Testing Library is imported explicitly rather than through globals. Globals need `"types": ["vitest/globals"]`
in the tsconfig, and the explicit imports type-check without that and read the same in every file.

The cheapest test in the project is a pure function's, which needs no renderer, no DOM and no stubbing. The
`describe` and `it` names describe the behaviour rather than the function.

## Running them

```bash
npm test
```

```text
 ✓ src/hooks/useLocalStorage.test.ts (4 tests) 16ms
 ✓ src/library/BookList.test.tsx (6 tests) 1.2s
 ✓ src/library/LoanForm.test.tsx (3 tests) 1.1s
 ✓ src/library/WaitingList.test.tsx (4 tests) 300ms
 ✓ src/reports/useReport.test.ts (3 tests) 245ms
 ✓ src/routes.test.tsx (5 tests) 1.4s

 Test Files  6 passed (6)
      Tests  25 passed (25)
```

`vitest run` reports once and exits with a code, which is what a pipeline needs. `npm run test:watch` re-runs the
files a change touches, which is what you want while writing them.

## Where the files live

```text
src/library/BookList.tsx
src/library/BookList.test.tsx
src/test/server.ts
src/test/render.tsx
src/test/setup.ts
```

The test sits next to what it covers, which is the convention the scaffolded project follows for the build
config too. Files under `src/test/` are helpers rather than tests: a fetch stub, a render function, and the
setup. A helper that is only used by one test lives in that test file.

## Check yourself

Add a test for a component with no data and no router, and run it in both watch and single-run mode. Then
delete `cleanup()` from the setup file and watch which test fails second, and explain why the order matters.
