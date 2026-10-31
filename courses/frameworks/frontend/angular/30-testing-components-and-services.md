---
title: Testing components and services
summary: TestBed, the flush before the wait, and the two traps that make a test hang forever.
chapter: Testing
minutes: 15
status: draft
---

## What runs the tests

```bash
ng test
```

The generated project tests with the `@angular/build:unit-test` builder, which runs Vitest over a jsdom
document. `tsconfig.spec.json` includes `"types": ["vitest/globals"]`, so `describe`, `it`, `expect` and
`vi` are available without an import, and `tsconfig.app.json` excludes `*.spec.ts` from the build, so a
test never ships.

`ng test` watches by default. Continuous integration wants one pass and an exit code:

```bash
ng test --watch=false
```

## A component test

```ts
import { ApplicationRef } from '@angular/core';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookList } from './book-list';

describe('BookList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('renders the catalogue once the response arrives', async () => {
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(BookList);
    await cycles();

    backend.expectOne('/api/books.json').flush(BOOKS);
    await cycles();

    const backlog = backend.expectOne((request) => request.url.startsWith('/api/backlog/'));
    backlog.flush({ genre: 'science-fiction', waiting: 3 });
    await TestBed.inject(ApplicationRef).whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Dune');
    expect(text).toContain('2 of 2 books');
    backend.verify();
  });
});
```

Three things are happening in that test beyond the assertions:

- `provideRouter([])` is there because the component's template uses `routerLink` and `RouterLink`
  injects `ActivatedRoute`. Without the router the directive throws `NG0201: No provider found for
  ActivatedRoute`, which is the failure I hit writing it.
- `provideHttpClientTesting()` swaps the backend for one the test drives, and `provideHttpClient()` is
  there because this test does not configure any HTTP feature. `backend.verify()` at the end fails the
  test if a request was never answered, which is how a forgotten flush is caught.
- The component is created and its text is read through `nativeElement`, so the assertions are about
  what a person would see rather than about internals.

## The two traps

Both of them cost me a debugging session, and both come from the same place: an HTTP request counts as
pending work in a zoneless application.

**Never await stability while a request is pending.** This hangs until the test times out at 5000 ms,
with no error from the framework:

```ts
await fixture.whenStable(); // hangs: one request is outstanding
backend.expectOne('/api/books.json').flush(BOOKS);
```

The order is the fix, and the flush comes first:

```ts
backend.expectOne('/api/books.json').flush(BOOKS);
await TestBed.inject(ApplicationRef).whenStable();
```

**A flushed response needs cycles before its signals have moved.** Flushing resolves a promise, and the
value travels from the response to the resource, then to the computeds, then to the template. One tick
is not enough, and the helper that works alternates change detection with a turn of the event loop:

```ts
/**
 * A flushed response reaches the page through effects and promises, so a test
 * alternates change detection with a turn of the event loop.
 */
async function cycles(count = 4): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    TestBed.tick();
    await new Promise((resolve) => setTimeout(resolve));
  }
}
```

`TestBed.tick()` runs a change detection cycle, effects included, which is what issues the next request
in a chain such as "the catalogue arrives, the genre follows it, the waiting list is requested". The
`setTimeout` lets the promises resolve before the next tick.

## Testing a service instead of the network

```ts
interface CatalogStub {
  readonly all: ReturnType<typeof signal<readonly Book[]>>;
  readonly borrow: Mock;
}

beforeEach(() => {
  catalog = {
    all: signal<readonly Book[]>(BOOKS),
    borrow: vi.fn().mockResolvedValue({ id: 'loan-1', dueOn: '2026-11-14' }),
  };

  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: Catalog, useValue: catalog },
    ],
  });
});
```

For a form that calls one method, that stub is shorter and clearer than two requests to flush, and the
mock records the argument the component passed:

```ts
expect(catalog.borrow).toHaveBeenCalledWith({
  member: 'Ada Lovelace',
  days: 21,
  bookId: 'dune',
});
```

I use the real service with the HTTP testing backend where the request itself is the behaviour under
test, and a stub where the component is. Both are ten lines, and mixing them in one file is fine as long
as each test says which it is.

## Testing a service directly

```ts
describe('@Service', () => {
  it('refuses to provide a service that opted out', () => {
    expect(() => TestBed.inject(ProvidedByHand)).toThrowError(/NG0201/);
  });

  it('provides one that opted out once it is in a providers list', () => {
    TestBed.configureTestingModule({ providers: [ProvidedByHand] });

    expect(TestBed.inject(ProvidedByHand)).toBeInstanceOf(ProvidedByHand);
  });
});
```

`TestBed.inject` is the shortest way to test a service that has no component: the injector wires it up
exactly as it would in the application, including its own dependencies. A pure function or a pipe needs
no TestBed at all, which is why the pipe test on the directives page is three lines.

## What not to test

- The framework. A test that `@if` hides an element is a test of Angular.
- Private methods. If a behaviour is worth testing it is reachable through the template or a public
  method.
- Every branch of a template. The states that matter are the ones a page can be in: loading, error,
  empty, loaded.

## Check yourself

Add a test for the reservation form that removes a line and asserts what is left, driving it through the
buttons rather than through the component. Then write a test that awaits `whenStable()` before flushing
and watch it time out, so you have seen the trap rather than read about it.
