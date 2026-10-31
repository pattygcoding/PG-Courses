---
title: Fetching data
summary: A composable that owns a request, an API module that throws on failure, and where vue-router 5's loaders fit.
chapter: Data
minutes: 14
status: draft
---

## The API module

```ts
const base = import.meta.env.VITE_API_BASE ?? '/api'

/** Reads a list of books. The signal cancels the request when the caller leaves. */
export async function fetchBooks(signal?: AbortSignal): Promise<readonly Book[]> {
  const response = await fetch(`${base}/books.json`, { signal })

  if (!response.ok) {
    throw new Error(`The catalogue could not be read (status ${response.status}).`)
  }

  return (await response.json()) as readonly Book[]
}
```

Every request in the application goes through a function in this module, and each one does the same three things:
build the URL, check `response.ok`, and hand back a typed value. Two parts deserve attention:

- **`response.ok` is checked.** `fetch` resolves for a 404 and a 500, so a reader that skips the check treats an error
  page as data and fails later with a confusing message.
- **`response.json()` is typed `any`.** The `as readonly Book[]` is a promise rather than a check, and a schema
  library turns it into a check when the API is not yours: Zod's `parse` returns a value typed from the schema and
  throws on a mismatch.

`import.meta.env.VITE_API_BASE` is inlined by Vite at build time, which is why the fallback matters: with no
environment file the application asks for the same origin path it uses in a static deployment.

## A composable that owns the request

```ts
export function useBooks() {
  const books = shallowRef<readonly Book[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const attempt = ref(0)

  let controller: AbortController | undefined

  watch(
    attempt,
    () => {
      controller?.abort()
      const current = new AbortController()
      controller = current

      loading.value = true
      error.value = null

      fetchBooks(current.signal)
        .then((next) => {
          books.value = next
        })
        .catch((failure: unknown) => {
          if (current.signal.aborted) {
            return
          }

          error.value =
            failure instanceof Error ? failure.message : 'The catalogue could not be read.'
        })
        .finally(() => {
          if (!current.signal.aborted) {
            loading.value = false
          }
        })
    },
    { immediate: true },
  )

  onScopeDispose(() => controller?.abort())

  return { books, loading, error, reload: () => { attempt.value += 1 } }
}
```

The three states, the cancellation and the retry, in one place. The view then renders four things:

```vue
<p v-if="loading" role="status">Loading the catalogue...</p>

<p v-else-if="error" role="alert">
  {{ error }}
  <button type="button" @click="reload">Try again</button>
</p>

<template v-else>
  <p>{{ visible.length }} of {{ books.length }} books</p>
</template>
```

Two failure modes the flags handle, which a shorter version misses:

- **A superseded request.** Clicking Try again while the first request is still open aborts the first one, and the
  abort check in the catch stops it from overwriting the live request's state.
- **An abort that is not a failure.** The browser reports an aborted fetch as a rejection, and showing "the request
  was aborted" to somebody who navigated away is noise.

## A request that belongs to a page

```ts
const found: Book | Error = await fetchBook(props.id).catch((failure: unknown) =>
  failure instanceof Error ? failure : new Error('The book could not be read.'),
)

const failure = found instanceof Error ? found : null
const book = ref<Book | null>(found instanceof Error ? null : found)
```

An awaited fetch in a component's setup keeps the request next to the thing that needs it: no composable, no flags,
no `onMounted`. The `<Suspense>` boundary above it covers the wait, and the `catch` turns a rejection into a value
the template can render. The browser check for this page showed the sequence: "Loading the book..." for the chunk and
the request, then the title, the author and the waiting count.

The trade is that there is no retry, because there is no state to change. A page that must offer one puts the request
back in a composable, and a page that cannot meaningfully show a retry stays like this.

## Loaders, the router's own version

vue-router 5 ships data loaders, and they are still labelled experimental:

```ts
// vue-router 5.4: available, and the API is documented as experimental
const useBookData = defineBasicLoader(async (route) => {
  return fetchBook(String(route.params.id))
})
```

A loader runs when a route is entered, and its result is available to the component and to the server renderer. That
is the fetched-in-setup pattern with the fetching moved out of the component. `@pinia/colada` is the companion for
caching, invalidation and refetching, and it plugs into the same loaders.

I have not used a loader in this project, and that is deliberate: the API is experimental in the version this course
targets, so the pages show the stable pattern and name the moving one. The stable pattern is a composable or an
awaited setup; the moving one is worth reading about rather than writing against until the label comes off.

## Which one to reach for

| Situation | Tool |
| --- | --- |
| a list that one route reads, with a retry | a composable and the three flags |
| a page that cannot render without its record | an awaited fetch in setup, inside `Suspense` |
| a request the component re-runs on a filter change | a composable keyed on the filter |
| a request many components share, with caching | a library: `@pinia/colada`, TanStack Query |
| data the server should fetch too | a router loader, when the API stops being experimental |

The catalogue uses the first two, and the reports page uses the second. Neither needed a dependency, and the pages
that follow explain what would change if they had.

## Check yourself

Add a `useBacklog` composable keyed on a genre that refetches when the genre changes, with the same abort and retry
treatment as `useBooks`. Then write the test that fails the first request and succeeds on the retry, and check both
states through the composable rather than through a component.
