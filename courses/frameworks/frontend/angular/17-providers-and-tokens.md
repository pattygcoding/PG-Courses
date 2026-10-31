---
title: Providers, tokens and scope
summary: An injection token is a name for a value, and a provider list is where the value is decided.
chapter: Dependency injection
minutes: 15
status: draft
---

## A token is a name for something that is not a class

```ts
import { InjectionToken } from '@angular/core';

/**
 * Where the demo API lives. A token rather than a constant, so a test or an
 * environment can point the same code at a different host.
 */
export const API_BASE = new InjectionToken<string>('api.base', {
  providedIn: 'root',
  factory: () => '/api',
});
```

```ts
export class Catalog {
  private readonly base = inject(API_BASE);
  private readonly http = inject(HttpClient);

  private readonly catalogue = httpResource<readonly Book[]>(() => `${this.base}/books.json`, {
    defaultValue: [],
  });
}
```

The token carries a type, so `inject(API_BASE)` is a `string` and a provider that returns a number is a
compile error. The string in the constructor, `'api.base'`, is only for error messages and the
injector debug output; it is not the key. That is why a token can be exported and imported like any
other value while a string key cannot be trusted.

A token is the right tool when the dependency is a value rather than a behaviour: a URL, a feature
flag, a clock, a validation pattern.

## The five provider shapes

```ts
providers: [
  { provide: API_BASE, useValue: '/staging' },
  { provide: Clock, useClass: FastClock },
  { provide: Reports, useExisting: CachedReports },
  { provide: PIPELINE, useValue: validator, multi: true },
  { provide: Session, useFactory: (config: Config) => new Session(config.token), deps: [Config] },
]
```

| Shape | Meaning |
| --- | --- |
| `useValue` | the value is the dependency, no construction |
| `useClass` | construct this class when that token is asked for |
| `useExisting` | an alias: the same instance is returned for both tokens |
| `useFactory` | a function builds the value, with `deps` injected into it |
| `multi: true` | the token collects an array of every provider registered for it |

`multi` is how the framework itself composes: the HTTP interceptors, the router features and the
`APP_INITIALIZER` handlers are all arrays under one token. Reading the framework's own provider
functions is the fastest way to learn the patterns, because `provideRouter(routes, withComponentInputBinding())`
is a factory and a multi provider under a friendly name.

## A test overrides the value, not the code

The `API_BASE` default is `/api`, and one test asks the component for a different host without touching
the component:

```ts
it('asks the host named by the API_BASE token', async () => {
  TestBed.overrideProvider(API_BASE, { useValue: '/staging' });

  const fixture = TestBed.createComponent(BookDetail);
  fixture.componentRef.setInput('id', 'dune');
  TestBed.tick();

  TestBed.inject(HttpTestingController).expectOne('/staging/books/dune.json').flush(DUNE);
  await TestBed.inject(ApplicationRef).whenStable();

  expect(fixture.nativeElement.textContent).toContain('Frank Herbert');
});
```

That is the payoff of a token over an imported constant: the environment, the test and the deployment
each supply a value, and the code that reads it does not change.

## Provider functions

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideAppInitializer(() => {
      const settings = inject(Settings);
      return settings.load();
    }),
  ],
};
```

A `provide*` function returns the provider list its feature needs, which keeps the shape of a feature
private. The three worth knowing by name:

- `provideAppInitializer(fn)` runs before the application renders and waits for the returned promise or
  observable, which is where a request for configuration belongs.
- `withInterceptors([...])` is a feature of `provideHttpClient`, not a separate provider.
- `provideZonelessChangeDetection()` exists and is not needed in a v22 project, because that is the
  default.

## Scope decides where the value is visible

A provider list on a route or a component creates a child injector. Anything registered there shadows
the same token from the root for that subtree:

```ts
export const routes: Routes = [
  {
    path: 'loans/new',
    loadComponent: () => import('./library/loan-form').then((m) => m.LoanForm),
    providers: [{ provide: LoanDraft, useClass: LoanDraft }],
  },
];
```

A consumer in that route gets the route's instance, and a consumer outside it gets the root one. Two
consequences are worth keeping in mind:

- A service that keeps state in a route scoped provider is discarded when the route is left, which is
  sometimes exactly what you want for a wizard and never what you want for a cache.
- A lazy route's providers are registered when the route loads. A service provided there is not
  created until then, which is a way to keep a heavy feature out of the initial bundle.

`providers` on a component are per component instance, and `viewProviders` are visible to the
component's own template but not to projected content. Both are rare in application code, and both are
worth recognising when reading a library.

Angular 22 also adds `injectAsync()`, which loads a service lazily and returns a function that resolves
it on demand.

## Check yourself

Add a `SETTINGS` token with a `providedIn: 'root'` factory that reads `'/api'`, inject it somewhere,
and override it in a test. Then move it to `providers` on the book detail route and log the value from
a component outside that route to see the two instances.
