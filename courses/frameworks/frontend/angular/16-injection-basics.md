---
title: Injection basics
summary: inject reads a dependency from the environment, and providedIn root decides how long it lives.
chapter: Dependency injection
minutes: 13
status: draft
---

## A service without a constructor

```ts
import { Injectable, signal } from '@angular/core';

/** The member's session, kept in memory for this example. */
@Injectable({ providedIn: 'root' })
export class Session {
  private readonly currentToken = signal('demo-token');
  readonly token = this.currentToken.asReadonly();

  signOut(): void {
    this.currentToken.set('');
  }
}
```

```ts
@Injectable({ providedIn: 'root' })
export class Catalog {
  private readonly base = inject(API_BASE);
  private readonly http = inject(HttpClient);
  // ...
}
```

`inject(HttpClient)` reads the dependency from the injector that belongs to the place the code runs
in. There is no constructor parameter list, and that is not a style preference: a functional guard, a
resolver and an interceptor are plain functions, and `inject` is the only way they can reach a service.

```ts
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);

  const authorized = request.clone({
    setHeaders: { 'X-Library-Session': session.token() },
  });

  return next(authorized);
};
```

That interceptor is a function with no class and no constructor, it reads the current session, and a
test asserts the header it produced:

```ts
TestBed.inject(HttpClient).get('/api/books.json').subscribe();

const request = TestBed.inject(HttpTestingController).expectOne('/api/books.json');
expect(request.request.headers.get('X-Library-Session')).toBe('demo-token');
```

## An injection context is where inject works

`inject` reads the injector from the environment it is called in, which Angular calls an injection
context. It works in:

- a field initializer or the constructor of a component, directive or service,
- a factory function of a provider,
- a guard, resolver or interceptor function,
- `TestBed.runInInjectionContext` in a test.

It throws everywhere else, which is why an `effect`, a query and `takeUntilDestroyed` are also created
in one of those places. When you need the injector later, capture it:

```ts
export class LoanDraft {
  private readonly injector = inject(Injector);

  later(): void {
    const http = this.injector.get(HttpClient);
  }
}
```

I treat `Injector.get` as an escape hatch. Reaching for it usually means a piece of code should be a
service rather than a method called from somewhere unexpected.

## providedIn root is one instance for the application

`providedIn: 'root'` registers the class with the root injector, so every consumer receives the same
instance for the life of the page. That matches a service holding shared state, which is what `Catalog`
and `Session` are. It also means the injector keeps the instance alive, so anything the service
subscribed to lives as long as the application does.

| Placement | Instances | Typical use |
| --- | --- | --- |
| `providedIn: 'root'` | one for the application | shared state, HTTP access, configuration |
| route `providers` | one per active route | a draft scoped to one flow |
| component `providers` | one per component instance | state that belongs to one widget |

A component level provider is per instance, not per template: two copies of the component on a page
get two services, which is how a reusable widget keeps its own state without a `signal` per field.

## The decorator, and the new one

`@Injectable({ providedIn: 'root' })` is what the pages here use. Angular 22 adds `@Service()` for the
same job, and it is what the CLI generates now:

```ts
// ng generate service library/loan-log
import { Service } from '@angular/core';

@Service()
export class LoanLog {}
```

`@Service()` marks the class as automatically available, which is `providedIn: 'root'` with a shorter
spelling. It takes two options:

```ts
@Service({ autoProvided: false })
export class PerRouteLog {}

@Service({ factory: () => new Clock(() => Date.now()) })
export class Clock {
  constructor(readonly now: () => number) {}
}
```

`autoProvided: false` says the class is only ever constructed from a provider list, which is how you
make a service that must be configured at its use site. The three behaviours are pinned by tests in
this project:

```ts
it('provides an auto provided service with no provider list', () => {
  expect(TestBed.inject(AutoProvided)).toBeInstanceOf(AutoProvided);
});

it('refuses to provide a service that opted out', () => {
  expect(() => TestBed.inject(ProvidedByHand)).toThrowError(/NG0201/);
});
```

## What goes in a service

Three things belong there:

- state that outlives a component, such as the catalogue and the loan draft,
- access to a resource, such as `HttpClient` or `localStorage`,
- logic that several components need, so it can be tested without a component.

What does not belong is anything only one component needs. A service with one consumer and no state is
usually a method that was moved out of the component by mistake.

## Check yourself

Move the waiting list count out of `Catalog` into a `Backlog` service with `providedIn: 'root'`, and
inject it in the catalogue. Then add a second provider to a component that uses it and log a value
inside the service's constructor to see how many instances the page creates.
