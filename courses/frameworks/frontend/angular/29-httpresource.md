---
title: httpResource
summary: The same resource pattern with the URL, the parsing and the response types handled for you.
chapter: Talking to a server
minutes: 13
status: draft
---

## The list

```ts
import { httpResource } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class Catalog {
  private readonly base = inject(API_BASE);

  private readonly catalogue = httpResource<readonly Book[]>(() => `${this.base}/books.json`, {
    defaultValue: [],
  });

  readonly status = this.catalogue.status;
  readonly error = this.catalogue.error;

  /** Empty until the first response arrives, and empty again if the request fails. */
  readonly all = computed(() => (this.catalogue.hasValue() ? this.catalogue.value() : []));

  reload(): void {
    this.catalogue.reload();
  }
}
```

```ts
protected readonly book = httpResource<Book>(() => `${this.base}/books/${this.id()}.json`);
```

`httpResource` takes a reactive URL and returns the same signals as `resource`: `value`, `status`,
`error`, `isLoading`, `hasValue` and `reload`. The request is sent eagerly, unlike a raw `HttpClient`
call that waits for a subscription, and when the signals the URL function reads change the in-flight
request is cancelled and a new one starts. That single behaviour is what makes the detail page work when
the route parameter changes.

Everything from the resource page applies: reading `value()` in the error state throws, so the read goes
behind `hasValue()` or behind a computed that falls back to an empty list.

## The request object

```ts
readonly search = signal('');

readonly results = httpResource<readonly Book[]>(() => ({
  url: `${this.base}/books.json`,
  method: 'GET',
  headers: { 'X-Library-Client': 'catalogue' },
  params: { q: this.search(), limit: 20 },
}));
```

Every property of a request can be written as a function of a signal, and the properties the URL form
cannot express are available here: headers, parameters, credentials, the cache mode, the priority and
`reportProgress`. Interceptors still run, so a request made this way gets the session header from the
interceptor page like any other.

## Response types and parsing

```ts
httpResource.text(() => `${this.base}/reports/latest.csv`);
httpResource.blob(() => `${this.base}/files/${this.id()}.pdf`);
httpResource.arrayBuffer(() => `${this.base}/files/${this.id()}.bin`);
```

By default the body is parsed as JSON and cast to the type argument. `parse` replaces the cast with a
check:

```ts
import { z } from 'zod';

const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  copies: z.number(),
});

readonly book = httpResource(() => `${this.base}/books/${this.id()}.json`, {
  parse: bookSchema.parse,
});
```

The resource's value type is the schema's output type, and a response that does not match becomes an
error state with the parse failure rather than a page that breaks three components later. `zod` is a
dependency of `@angular/forms` in v22 for exactly this style of validation, so a project using signal
forms already has it in the tree.

## Progress

```ts
readonly file = httpResource.blob(() => ({
  url: `${this.base}/files/${this.id()}.bin`,
  reportProgress: true,
}));

readonly downloaded = computed(() => this.file.progress()?.loaded ?? 0);
```

`reportProgress: true` fills in the resource's `progress` signal with the latest loading event. One
difference from `HttpClient` is worth noting: `HttpClient` deprecated the single `reportProgress` option
in favour of `reportUploadProgress` and `reportDownloadProgress`, and `httpResource` keeps the single
option and only enables download progress.

## Reading the states in a template

```html
@switch (catalog.status()) {
  @case ('loading') {
    <p role="status">Loading the catalogue...</p>
  }
  @case ('error') {
    <p role="alert">
      The catalogue could not be loaded.
      <button type="button" (click)="catalog.reload()">Try again</button>
    </p>
  }
  @default {
    <p>{{ catalog.visible().length }} of {{ catalog.all().length }} books</p>
  }
}
```

The `reloading` status is what a `reload()` call sets while a previous value is still on screen, which
is the case where a page should keep showing the old list rather than a spinner. Switching on three of
the six statuses covers most screens, and the two remaining ones (`idle` before a first load with no
parameters, and `local` when a loader answered without a request) are worth a `@default` rather than a
branch of their own.

## Testing an httpResource

```ts
const fixture = TestBed.createComponent(BookDetail);
fixture.componentRef.setInput('id', 'dune');
TestBed.tick();

TestBed.inject(HttpTestingController).expectOne('/api/books/dune.json').flush(DUNE);
await TestBed.inject(ApplicationRef).whenStable();

expect(fixture.nativeElement.textContent).toContain('Frank Herbert');
```

```ts
it('asks the host named by the API_BASE token', async () => {
  TestBed.overrideProvider(API_BASE, { useValue: '/staging' });

  const fixture = TestBed.createComponent(BookDetail);
  fixture.componentRef.setInput('id', 'dune');
  TestBed.tick();

  TestBed.inject(HttpTestingController).expectOne('/staging/books/dune.json').flush(DUNE);
  await TestBed.inject(ApplicationRef).whenStable();
});
```

Two details make those tests work. `TestBed.tick()` is what runs the effect that issues the request, and
the flush comes before the `await`, because waiting for stability while a request is pending waits
forever. The testing chapter takes both apart.

## Check yourself

Add a `parse` schema to the catalogue resource that requires a title and a copies count, then return a
book without a title from the API and read the error state the page shows. Then switch the same resource
to `httpResource.text` and log the value type you get.
