---
title: Guards and resolvers
summary: Functions that decide whether a navigation happens, and data that arrives before the page does.
chapter: Routing
minutes: 14
status: draft
---

## A guard is a function that can inject

```ts
import { inject } from '@angular/core';
import { RedirectCommand, Router, type CanActivateFn } from '@angular/router';
import { Session } from './session';

/** Sends a visitor with no session back to the catalogue. */
export const signedIn: CanActivateFn = () => {
  if (inject(Session).token().length > 0) {
    return true;
  }
  return new RedirectCommand(inject(Router).parseUrl('/books'));
};
```

```ts
{
  path: 'loans/new',
  title: 'New loan',
  canActivate: [signedIn],
  canDeactivate: [unsavedLoan],
  loadComponent: () => import('./library/loan-form').then((m) => m.LoanForm),
}
```

The return value is what the router acts on:

| Return | Effect |
| --- | --- |
| `true` | the navigation continues |
| `false` | it is cancelled and the URL stays where it was |
| `UrlTree` | it is redirected to that URL |
| `RedirectCommand` | redirected, with the option to skip location changes |
| a promise or observable of the above | the router waits |

`RedirectCommand` is the newer of the two redirect shapes and the one I use, because it keeps the
redirect and its options together. `Router.parseUrl('/books')` builds a `UrlTree` from a string, which
handles relative paths and query parameters correctly.

## Where each guard runs

| Guard | Question it answers |
| --- | --- |
| `canActivate` | can this route be entered at all |
| `canActivateChild` | can the child routes of this route be entered |
| `canDeactivate` | may the current component be left |
| `canMatch` | should this route even be considered by the matcher |
| `resolve` | what data should the component receive |

`canMatch` is the interesting one, because it runs before the route matches at all. It is how a
feature-flagged route can be invisible rather than blocked:

```ts
export const waitingListEnabled: CanMatchFn = () => inject(Flags).waitingList();

const routes: Routes = [
  { path: 'waiting-list', canMatch: [waitingListEnabled], component: WaitingList },
  { path: '**', component: NotFound },
];
```

With `canActivate` a disabled route redirects. With `canMatch` it falls through to the next matching
entry, which is a different and often better answer.

## A guard that reads the loaded data

```ts
/**
 * Rejects a book id that the catalogue has already loaded and does not know.
 * Before the catalogue has arrived the route is allowed through, and the detail
 * page reports the 404.
 */
export const bookExists: CanActivateFn = (route) => {
  const id = route.paramMap.get('id') ?? '';
  const known = inject(Catalog).all().some((book) => book.id === id);

  if (inject(Catalog).all().length > 0 && !known) {
    return new RedirectCommand(inject(Router).parseUrl('/books'));
  }
  return true;
};
```

That guard has a deliberate hole: it lets an unknown id through while the catalogue is still empty,
because it has nothing to compare against. The detail page then renders its own 404 state with an
`@else if (book.error())` branch. A guard that waits for the data is possible and turns every direct
link into a request before the page appears, which is the wrong trade for a case the page can handle
itself.

## Asking before leaving

```ts
import { inject } from '@angular/core';
import type { CanDeactivateFn } from '@angular/router';
import { LoanDraft } from './loan-draft';

/**
 * Asks before leaving a half filled loan form. Returning a string shows the
 * browser's own confirm dialog with that text.
 */
export const unsavedLoan: CanDeactivateFn<unknown> = () => {
  const draft = inject(LoanDraft);
  if (!draft.hasUnsavedChanges()) {
    return true;
  }
  return confirm('Discard this loan?');
};
```

The draft lives in a service rather than in the component, which is what makes a function with no
access to the component able to answer the question. That is the design lesson in this guard: the guard
needed the state, so the state had to be reachable from the injector.

A real application renders its own dialog rather than calling `confirm`, which blocks the browser and
cannot be styled. The shape of the code does not change: collect the answer in a promise and return it.

## A guard is not a security boundary

Everything on the client can be changed by the person using the client. A guard decides which page is
shown, and the API has to make the same decision again for every request, because a determined visitor
can call the endpoint directly. Treat a guard as navigation logic and the server as the boundary.

## Resolvers

```ts
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { ActivatedRouteSnapshot } from '@angular/router';
import type { Book } from './book';

export const bookResolver = (route: ActivatedRouteSnapshot): Promise<Book> => {
  const id = route.paramMap.get('id') ?? '';
  return firstValueFrom(inject(HttpClient).get<Book>(`/api/books/${id}.json`));
};
```

A resolver runs before the component is created, and the navigation waits for its promise. With
`withComponentInputBinding()` the resolved value arrives as an input of the same name:

```ts
readonly book = input.required<Book>();
```

Two cases justify one:

- the page is meaningless without the data, and showing a loading state first is worse,
- several components on the page need the same request, and one fetch behind one resolver is simpler
  than two resources.

For everything else, a resource inside the component is better. It renders a loading state, it can
reload, and it does not delay the navigation. The catalogue takes that route: entering the page shows
the loading line, and the request happens while the page is already visible.

## Check yourself

Write a `canMatch` guard that hides the loan form when the session has no token, and check that the
wildcard route takes over. Then turn `bookExists` into a resolver, bind the result to an input, and
decide which of the two you would keep for a list of five thousand books.
