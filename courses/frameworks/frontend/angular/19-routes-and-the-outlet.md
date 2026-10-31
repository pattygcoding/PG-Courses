---
title: Routes and the outlet
summary: One array decides every URL in the application, and the first match wins.
chapter: Routing
minutes: 13
status: draft
---

## The route table

```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { bookExists } from './library/book-exists.guard';
import { signedIn } from './library/signed-in.guard';
import { unsavedLoan } from './library/unsaved-loan.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  {
    path: 'books',
    title: 'Catalogue',
    loadComponent: () => import('./library/book-list').then((m) => m.BookList),
  },
  {
    path: 'books/:id',
    title: 'Book',
    canActivate: [bookExists],
    loadComponent: () => import('./library/book-detail').then((m) => m.BookDetail),
  },
  {
    path: 'loans/new',
    title: 'New loan',
    canActivate: [signedIn],
    canDeactivate: [unsavedLoan],
    loadComponent: () => import('./library/loan-form').then((m) => m.LoanForm),
  },
  { path: '**', redirectTo: 'books' },
];
```

The router reads that array for every navigation, and the first entry that matches wins. Two
consequences follow from the ordering:

- `{ path: '', pathMatch: 'full' }` has to come before a wildcard, or the wildcard swallows the home
  URL. `pathMatch: 'full'` says the whole remaining URL must be empty; without it, an empty path
  matches every URL as a prefix.
- `books/:id` after `books` is fine here, and a static route placed after a parameterised one that
  matches it is a bug. Guessing which route matched is the most common routing mistake, and the
  router's own `Router.events` log is how to stop guessing.

Each entry is validated when the application builds: a `canActivate` that is not a function, a
`loadComponent` that returns a class without a `Component` decorator, and a `path` with a duplicate are
all build errors rather than runtime surprises.

## The outlet

```html
<!-- src/app/app.html -->
<header class="shell">
  <a class="brand" routerLink="/books">{{ title() }}</a>
  <nav>
    <a routerLink="/books" routerLinkActive="active">Catalogue</a>
    <a routerLink="/loans/new" routerLinkActive="active">New loan</a>
  </nav>
</header>

<main class="shell">
  <router-outlet />
</main>
```

```ts
@Component({
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Northside Library');
}
```

`router-outlet` is a marker, not a container: the component renders as its next sibling. The shell
above it stays on screen through every navigation, which is what makes a layout component worth
having.

`routerLink` takes a string or an array of path segments. `[routerLink]="['/books', book.id]"` builds
the URL from the id, and a link built this way survives a change to the route table, unlike a string
concatenated by hand.

`routerLinkActive="active"` adds a class when the link's route is the current one, and the class lands
on the anchor:

```css
.active {
  font-weight: 700;
}
```

It also sets `aria-current="page"` on the active link, which is the part a screen reader announces, so
the class is styling for something that is already accessible.

## The features the router takes

```ts
provideRouter(
  routes,
  withComponentInputBinding(),
  withInMemoryScrolling({ scrollPositionRestoration: 'top' }),
)
```

| Feature | Effect |
| --- | --- |
| `withComponentInputBinding()` | route parameters and data arrive as component inputs |
| `withInMemoryScrolling({ scrollPositionRestoration: 'top' })` | the page scrolls to the top on navigation |
| `withHashLocation()` | URLs use `#/books`, for hosts that cannot rewrite |
| `withRouterConfig({ ... })` | router behaviour such as `paramsInheritanceStrategy` |
| `withNavigationErrorHandler(fn)` | one place to react to a navigation that failed |
| `withPreloading(PreloadAllModules)` | load lazy routes after the first render |

Scrolling is worth setting explicitly, because the browser default preserves the scroll position and a
long catalogue page leaves the next page halfway down.

## Titles come from the route

```ts
{
  path: 'books/:id',
  title: 'Book',
  loadComponent: () => import('./library/book-detail').then((m) => m.BookDetail),
}
```

The browser tab reads `Book` after that navigation, with no component code involved. A title that
needs the loaded data is a function of the route, `title: (route) => \`Book ${route.paramMap.get('id')}\``,
and a whole application's title format is a custom `TitleStrategy` registered as a provider.

## Navigation you start from code

```ts
export class LoanForm {
  private readonly router = inject(Router);

  protected async saveAndLeave(): Promise<void> {
    await this.save();
    await this.router.navigate(['/books']);
  }
}
```

`Router.navigate` takes the same segment array as `routerLink`, and `navigateByUrl` takes a string.
Both return a promise that resolves to `false` when a guard declined the navigation, which is a real
possibility when a `canDeactivate` asks the person a question. A form that ignores the result can leave
the data behind silently, so awaiting it is worth the line.

## Check yourself

Add a `loans` route that lists recent loans and link it from the shell. Then move the wildcard to the
top of the array and see which URL stops working. Finally, add `withHashLocation()` and look at the URL
bar after a navigation.
