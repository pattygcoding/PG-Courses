---
title: Async data with resources
summary: A request driven by signals, with the loading, error and value states modelled for you.
chapter: Signals and state
minutes: 16
status: draft
---

## The shape of a resource

```ts
readonly backlog = resource({
  params: () => ({ genre: this.genre() }),
  loader: ({ params }) => {
    if (params.genre.length === 0) {
      return Promise.resolve({ genre: '', waiting: 0 });
    }
    const url = `/api/backlog/${encodeURIComponent(params.genre)}.json`;
    return firstValueFrom(this.http.get<Backlog>(url));
  },
  defaultValue: { genre: '', waiting: 0 },
});
```

`params` is a reactive computation. `loader` is a function of those parameters that returns a promise,
and the loader runs again whenever the parameters change. A stale response is discarded, and the
documentation is specific about why: `resource` cancels an in-progress load through an `AbortSignal`
when the parameters change or when the resource is destroyed.

Two details I learned by compiling rather than reading:

- The loader must return a promise. Returning a plain value is a type error
  (`Property 'then' is missing`), which is why the early return above is wrapped in
  `Promise.resolve`. The compiler is telling you that `loader` is asynchronous by contract.
- A loader may be `async`, and an error thrown inside it becomes the resource's error state. No
  `catchError` is needed for the simple case.

## The signals a resource exposes

| Signal | Meaning |
| --- | --- |
| `value()` | the loaded value |
| `hasValue()` | whether a value is available |
| `status()` | `idle`, `loading`, `reloading`, `resolved`, `error` or `local` |
| `error()` | the thrown error, or `undefined` |
| `isLoading()` | a shortcut for `status() === 'loading'` |
| `reload()` | run the loader again with the current parameters |

The status names are worth knowing, because a template can switch on them and nothing else is needed
to render every state a page can be in:

```html
@switch (catalog.status()) {
  @case ('loading') {
    <p role="status">Loading the catalogue...</p>
  }
  @case ('error') {
    <p role="alert">The catalogue could not be loaded.</p>
  }
  @default {
    <p>{{ catalog.all().length }} books</p>
  }
}
```

## Reading value in the error state throws

This one cost me a failing test. Reading `value()` on a resource that is in the error state throws a
`ResourceValueError`, `defaultValue` or not:

```text
ResourceValueError: Resource is currently in an error state
Caused by: HttpErrorResponse: Http failure response for /api/books.json: 500 Server Error
```

A computed that reads the value directly then throws inside change detection, and the page breaks
because a request failed. Guard the read:

```ts
/** Empty until the first response arrives, and empty again if the request fails. */
readonly all = computed(() => (this.catalogue.hasValue() ? this.catalogue.value() : []));

readonly status = this.catalogue.status;
readonly error = this.catalogue.error;
```

Two benefits come from that one line. The computed is safe in every state, and every consumer of
`all()` gets an empty list rather than an exception while an error is on screen. The template does the
same thing where it reads a resource directly:

```html
@default {
  @if (catalog.backlog.hasValue()) {
    <p>{{ catalog.backlog.value().waiting }} borrowers waiting for {{ catalog.genre() | genreLabel }}</p>
  }
}
```

## defaultValue and the idle state

`defaultValue` gives the resource a value before the first response, and it removes `undefined` from
the type, so `value()` is `Backlog` rather than `Backlog | undefined`. The trade is that a component
cannot tell "no response yet" from "response equal to the default" by reading the value alone, which
is what `status()` and `hasValue()` are for.

Without `defaultValue` the type is `T | undefined`, and the compiler forces you to handle the empty
case. For a list where you would render nothing anyway, that is often the better default: the empty
array is a fake value, and no fake value is needed if the template already has an `@if`.

## A resource is not for writing

The documentation is direct about this: `resource` is for reads. A create, update or delete has a
result you care about and a failure you want to show next to the form, so it belongs in a method:

```ts
borrow(loan: Loan): Promise<LoanReceipt> {
  return firstValueFrom(this.http.post<LoanReceipt>('/api/loans', loan));
}
```

That method returns a promise the form can await, which is what the signal forms page does. Trying to
model a mutation as a resource means the params signal becomes the request body and every keystroke in
a form is a request.

## Reload and the trigger pattern

```ts
reload(): void {
  this.catalogue.reload();
}
```

`reload` is the manual escape hatch. The other way to force a new load is to change the parameters,
which is the better design when the reason for the new request is a piece of state:

```ts
readonly since = signal('2026-01-01');
readonly loans = resource({
  params: () => ({ since: this.since() }),
  loader: ({ params }) => firstValueFrom(this.http.get<readonly Loan[]>('/api/loans', { params: { since: params.since } })),
});
```

The interceptor page adds the retry, the header and the error mapping that these requests share, and
the page after this one covers the same API specialised for HTTP, where the URL and the response
parsing are done for you.

## Check yourself

Point the backlog resource at an endpoint that returns 500 and render the error state next to the
retry button. Then remove `defaultValue` and read the compiler's complaint about `value()`, and decide
which of the two shapes you would keep in your own service.
