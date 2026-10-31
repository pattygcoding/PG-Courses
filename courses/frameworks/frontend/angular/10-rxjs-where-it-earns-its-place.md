---
title: RxJS where it earns its place
summary: The router, the HTTP client and every interceptor are observable based, and the boundary with signals is yours to pick.
chapter: Signals and state
minutes: 14
status: draft
---

## Two models, one application

A signal is a value that can change. An observable is a stream of values over time, with operators
between them. Angular ships both, and the packages use both:

| Uses signals | Uses observables |
| --- | --- |
| component state | `HttpClient` and every interceptor |
| templates | router events |
| forms and validation | libraries written before signals |
| resources | websockets and other event streams |

The set of operators is the reason observables stay in an Angular codebase. `switchMap`, `debounceTime`
and `retry` describe a request pipeline in a few lines, and there is no signal equivalent that reads
as well.

## One-shot requests: firstValueFrom

```ts
borrow(loan: Loan): Promise<LoanReceipt> {
  return firstValueFrom(this.http.post<LoanReceipt>('/api/loans', loan));
}
```

An `HttpClient` call is observable and does nothing until it is subscribed. `firstValueFrom` subscribes,
takes the first value and resolves a promise, which is the shape a form handler wants:

```ts
const receipt = await this.catalog.borrow(loan);
```

`lastValueFrom` waits for completion and is the wrong choice for a request: it delays the result until
the response stream closes, which for a single response means the same thing with one more step.

## A stream that should be cancelled: switchMap

```ts
readonly results = toSignal(
  toObservable(this.search).pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((term) => this.http.get<readonly Book[]>('/api/books', { params: { q: term } })),
  ),
  { initialValue: [] as readonly Book[] },
);
```

Read it as three sentences: wait for a pause in typing, ignore a repeat, and cancel the previous
request when a new term arrives. `switchMap` is the one to reach for on a search box, because the
alternatives behave differently:

| Operator | With a new source value |
| --- | --- |
| `switchMap` | cancels the request in flight |
| `concatMap` | queues it behind the current one |
| `mergeMap` | runs them together, and results can arrive out of order |
| `exhaustMap` | ignores the new value until the current one finishes |

For a search box, `switchMap` is what makes the slow first request unable to overwrite the fast second
one. For a save button, `exhaustMap` is the answer, because two saves queued up is rarely what anyone
wanted.

## Crossing the boundary

```ts
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

const books = toSignal(this.http.get<readonly Book[]>('/api/books.json'), { initialValue: [] });

const term = toObservable(this.search);
```

`toSignal` turns a stream into a signal and subscribes for you. With `initialValue` the result type has
no `undefined`, and without it the signal is `T | undefined` until the first value arrives, which the
template has to handle.

`toObservable` goes the other way, and both of these need an injection context, which is why they are
called in a field initializer or a constructor. `toObservable` emits on a change detection cycle rather
than synchronously, so a pipeline built on it sees one emission per settled value rather than one per
`set` call.

## Unsubscribing

```ts
export class LiveBacklog {
  private readonly http = inject(HttpClient);

  readonly updates = toSignal(
    timer(0, 30_000).pipe(switchMap(() => this.http.get<Backlog>('/api/backlog/science-fiction.json'))),
  );
}
```

`toSignal` unsubscribes when the injection context is destroyed, and `takeUntilDestroyed()` does the
same for a pipeline you subscribe to yourself:

```ts
this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
  if (event instanceof NavigationEnd) {
    this.announce(event.urlAfterRedirects);
  }
});
```

Both need a `DestroyRef`, which is inferred inside an injection context. In a callback that runs later,
pass one:

```ts
constructor() {
  const destroyRef = inject(DestroyRef);
  this.stream.pipe(takeUntilDestroyed(destroyRef)).subscribe();
}
```

Subscribing without either is the leak that shows up as a component that keeps receiving data after the
page has moved on. It is also the reason a service that subscribes in its constructor should be
`providedIn: 'root'`, where its lifetime matches the application's.

## rxResource: a resource driven by a stream

```ts
readonly backlog = rxResource({
  params: () => ({ genre: this.genre() }),
  stream: ({ params }) => this.http.get<Backlog>('/api/backlog/' + encodeURIComponent(params.genre) + '.json'),
});
```

`rxResource` is the same resource API with a `stream` instead of a `loader`, so the loading, error and
value signals behave the same and the operators are available:

```ts
stream: ({ params }) =>
  this.http.get<Backlog>(url).pipe(retry({ count: 2, delay: 500 })),
```

That is the case for it: when the request needs the operator vocabulary, or when it comes from a
library that speaks observables. When it is a single `HttpClient` call, the plain `resource` and
`httpResource` versions read better.

## Check yourself

Turn the search box into a stream with `debounceTime`, `distinctUntilChanged` and `switchMap`, and put a
`tap` in the pipeline that logs each term. Type quickly and read the log to see which requests were
cancelled. Then replace `switchMap` with `mergeMap` and type quickly again.
