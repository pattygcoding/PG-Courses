---
title: Route parameters and input binding
summary: A parameter becomes an input, and the component never asks which URL it is on.
chapter: Routing
minutes: 12
status: draft
---

## The parameter arrives as an input

```ts
@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, GenreLabelPipe, Panel],
  template: `
    <app-panel heading="Book details">
      @if (book.hasValue()) {
        @let details = book.value();
        <h1>{{ details.title }}</h1>
        <p>{{ details.author }} - {{ details.genre | genreLabel }}</p>
      }
    </app-panel>
  `,
})
export class BookDetail {
  /** Bound from the :id route parameter by withComponentInputBinding. */
  readonly id = input.required<string>();

  private readonly base = inject(API_BASE);

  protected readonly book = httpResource<Book>(() => `${this.base}/books/${this.id()}.json`);
}
```

With `withComponentInputBinding()` in the router features, the `:id` segment is written into an input
with the same name. The component never injects `ActivatedRoute`, never reads a snapshot, and never
unsubscribes from a parameter stream, and the resource re-runs when the id changes because the URL
function reads `this.id()`. Loading one book, then another, cancels the first request.

The binding covers three things by name:

| Source | Bound when the input is named |
| --- | --- |
| path parameter `books/:id` | `id` |
| query parameter `?page=2` | `page` |
| resolved data `resolve: { book: bookResolver }` | `book` |

All three are strings unless a transform says otherwise:

```ts
readonly page = input(1, { transform: numberAttribute });
```

```ts
{
  path: 'loans',
  resolve: { loans: loansResolver },
  loadComponent: () => import('./library/loan-list').then((m) => m.LoanList),
}
```

```ts
export class LoanList {
  readonly loans = input.required<readonly Loan[]>();
}
```

That resolver test is the shortest way to see the whole path work:

```ts
it('binds resolved data into an input of the same name', async () => {
  const harness = await RouterTestingHarness.create('/greeting');

  expect(harness.routeNativeElement?.textContent).toContain('hello from the resolver');
});
```

## Reading the parameter the old way

The binding is not the only way, and it is worth recognising the other one in existing code:

```ts
export class BookDetail {
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')));
}
```

`route.paramMap` is an observable of the parameters, so it reacts to a navigation from one book to
another. `route.snapshot.paramMap` is a value read once, which is correct in a resolver or a guard and
a bug in a component that can be navigated between while it is alive. That difference is the whole
reason `withComponentInputBinding` is worth turning on: the signal version is reactive by construction
and there is nothing to forget.

The same trap applies to reading `id()` too early. A test that reads it before the router has bound the
value gets:

```text
Error: NG0950: Input "id" is required but no value is available yet.
```

## Building URLs

```html
<a [routerLink]="['/books', book.id]">{{ book.title }}</a>
```

```html
<a [routerLink]="['/books', book.id]" [queryParams]="{ from: 'catalogue' }">Details</a>
```

A query parameter set this way is added to the URL and bound to an input named `from`, as long as the
component declares one. `preserve` and `replaceUrl` are the two options worth knowing:

```html
<a [routerLink]="['/books']" [replaceUrl]="true">Back</a>
```

`replaceUrl` replaces the history entry instead of pushing a new one, which is what a redirect or a
"return to the list" link usually wants.

A relative link is written without the leading slash:

```html
<a [routerLink]="['..', 'books']">Catalogue</a>
```

I keep relative links out of templates that can be rendered in more than one place, because they depend
on where the component sits in the route tree. An absolute array is longer and says exactly what it
does.

## Route data and the route's own reading

```ts
{
  path: 'loans/new',
  data: { requiresSession: true },
  canActivate: [signedIn],
  loadComponent: () => import('./library/loan-form').then((m) => m.LoanForm),
}
```

`data` is static per route and arrives as an input if the component declares one. It is the place for
small facts about a route: a heading, a breadcrumb label, a flag a guard reads. Anything larger is a
resolver's job.

## Check yourself

Add a page number query parameter to the catalogue and bind it with `numberAttribute`, then navigate
between pages and watch the resource reload with a different URL. Then read the same value from
`ActivatedRoute.snapshot` and observe what stops updating.
