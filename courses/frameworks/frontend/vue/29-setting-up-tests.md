---
title: Setting up tests
summary: Vitest through the merged Vite config, the folder convention that makes it work, and a support module.
chapter: Testing
minutes: 13
status: draft
---

## What goes in

```bash
npm install -D vitest jsdom @vue/test-utils @types/jsdom
npm run test:unit -- --run
```

```text
 ✓ src/components/__tests__/BookCard.spec.ts (5 tests) 42ms
 ✓ src/components/__tests__/LoanHint.spec.ts (2 tests) 14ms
 ✓ src/components/__tests__/WaitingList.spec.ts (3 tests) 38ms
 ✓ src/components/__tests__/WaitingPanel.spec.ts (2 tests) 25ms
 ✓ src/composables/__tests__/useDebouncedRef.spec.ts (2 tests) 8ms
 ✓ src/router/__tests__/router.spec.ts (6 tests) 55ms
 ✓ src/stores/__tests__/loans.spec.ts (4 tests) 12ms
 ✓ src/views/__tests__/CatalogueView.spec.ts (5 tests) 90ms

 Test Files  8 passed (8)
      Tests  29 passed (29)
```

The scaffold installs three of those four; `@types/jsdom` is there because the vitest tsconfig enables jsdom's types.
`npm run test:unit` runs Vitest in watch mode, and `-- --run` passes `--run` through to it for a single pass that
exits with a code, which is what a pipeline needs.

## Where a test file goes

```text
src/components/BookCard.vue
src/components/__tests__/BookCard.spec.ts
src/__tests__/support.ts
```

The `__tests__` folder is not a preference in this project, it is what the configuration supports:

```json
{
  "extends": "./tsconfig.app.json",
  "include": ["src/**/__tests__/*", "env.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "lib": [],
    "types": ["node", "jsdom"],
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.vitest.tsbuildinfo"
  }
}
```

The application's config excludes `src/**/__tests__/*`, and the vitest config includes only those, with `jsdom` and
Node types. A test file next to its component but outside `__tests__` is compiled as application code: `document` is
undefined for the type checker, and `describe` comes from nothing. Putting the file in the right folder is what makes
`npm run type-check` accept it.

`src/__tests__/support.ts` is a helper rather than a test, and it lives in the same include because vitest's config
only cares about the `__tests__` segment.

## The support module

```ts
import { afterEach, vi } from 'vitest'

export interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })

  return { promise, resolve }
}

export interface Stub {
  readonly status?: number
  readonly json?: unknown
}

export function stubApi(routes: Record<string, Stub>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = urlOf(input)
    const match = Object.entries(routes).find(([path]) => url.includes(path))

    if (match === undefined) {
      return new Response(JSON.stringify({ error: `no stub for ${url}` }), { status: 404 })
    }

    const [, stub] = match

    return new Response(JSON.stringify(stub.json ?? {}), {
      status: stub.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

// Importing this module also cleans up after each test: a stub or a fake clock
// that leaked into the next test is a failure that reads as a bug in the code.
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
})
```

Four things in that module, and each one is there because a test needed it:

- **`deferred()`** hands back a promise and the function that resolves it, which is what lets a test look at the
  interface *while* a request is open. The optimistic-count test cannot be written without it.
- **`stubApi()`** answers `fetch` from a table of paths to responses, which is enough for this application and
  shorter than a mocking library.
- **`afterEach` at module scope.** Importing the module registers the cleanup, so no test file has to remember it.
  `vi.unstubAllGlobals()` is what stops one test's `fetch` from reaching the next, and `localStorage.clear()` is what
  stops a remembered member name from filling in a later form.
- **The real `Response` objects.** A stub that resolves a plain object fails inside the code under test, at
  `response.ok`, with an error that points nowhere useful.

## A test that reads like the feature

```ts
it('filters the list as the search term changes', async () => {
  vi.useFakeTimers()
  const { wrapper } = mountCatalogue()
  await flushPromises()

  await wrapper.get('#search').setValue('edda')
  vi.advanceTimersByTime(300)
  await flushPromises()

  expect(wrapper.text()).toContain('1 of 2 books')
  expect(wrapper.text()).toContain('The Poetic Edda')
  expect(wrapper.text()).not.toContain('Dune')
})
```

Four lines of arrangement, one line of action, three lines of assertion, and the whole thing is written in terms of
what the page shows. The three parts of the action are worth naming: `setValue` types into the field,
`advanceTimersByTime` moves the debounce clock forward, and `flushPromises` lets the pending promises settle. Any one
of them missing gives a test that passes for the wrong reason.

## Running one file

```bash
npx vitest run src/views/__tests__/CatalogueView.spec.ts
npx vitest src/views
```

Vitest takes a path filter, and the watch mode re-runs only the files a change touches. While writing a test, that
is the loop: save, read the failure, fix, save.

## Check yourself

Write a test file for a component of your own in a `__tests__` folder, run it with `npm run type-check` as well as
`npm run test:unit -- --run`, and then move it one folder up and read both errors. Put it back where it belongs.
