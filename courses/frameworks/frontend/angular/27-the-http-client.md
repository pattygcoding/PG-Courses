---
title: The HTTP client
summary: One service for every request, with interceptors, typed responses and a testing backend built in.
chapter: Talking to a server
minutes: 13
status: draft
---

## Turning it on

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([apiInterceptor])),
  ],
};
```

`provideHttpClient()` registers `HttpClient` and the low level `HttpBackend` behind it. The feature
functions decide how requests are handled: `withInterceptors` adds the chain, `withFetch` switches the
transport to the browser's `fetch` API, and `withXsrfConfiguration` sets the cookie and header names
for request forgery tokens.

One v22 change is worth knowing before you go looking for a provider: the reactive resources
(`httpResource`, the testing backend's helpers) use a globally available `HttpClient`, so
`provideHttpClient` is only needed to configure HTTP features. That is why the resource pages work with
none of it, and why the interceptor page needs it.

## A typed request

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api-base';
import type { Loan, LoanReceipt } from './book';

@Injectable({ providedIn: 'root' })
export class Catalog {
  private readonly base = inject(API_BASE);
  private readonly http = inject(HttpClient);

  borrow(loan: Loan): Promise<LoanReceipt> {
    return firstValueFrom(this.http.post<LoanReceipt>(`${this.base}/loans`, loan));
  }
}
```

`post<T>` takes the body and returns an observable of `T`. The type is a claim about the response rather
than a check: the JSON is cast to `LoanReceipt`, and nothing verifies it at runtime. The response
validation page uses `parse` on a resource for the cases where a check is worth having.

The observable is cold. Nothing is sent until something subscribes, which is why a request written
without `subscribe`, `firstValueFrom` or a resource does nothing at all. That is also what makes the
retry and error operators possible: the pipeline is a description of the request, and the subscription
is the act of sending it.

## Parameters, headers and response types

```ts
this.http.get<readonly Book[]>(`${this.base}/books.json`, {
  params: { genre: 'poetry', limit: 20 },
  headers: { 'Accept-Language': 'en-GB' },
});

this.http.get(`${this.base}/report.csv`, { responseType: 'text' });

this.http.get<Book>(`${this.base}/books/${id}.json`, { observe: 'response' });
```

`params` handles encoding, so a search term with a space or an ampersand does not break the URL. The
`responseType` options tell the client how to read the body: `json` by default, with `text`, `blob` and
`arrayBuffer` for everything else. `observe: 'response'` gives the whole `HttpResponse`, which is how a
caller reads a header such as an ETag or a total count.

## What a failure looks like

```text
{ status: 500, statusText: 'Server Error', url: '/api/books.json', error: 'no' }
```

That is an `HttpErrorResponse`, printed from the test backend in this project. Four fields matter:

| Field | Value |
| --- | --- |
| `status` | the HTTP status, or `0` when the request never reached a server |
| `statusText` | the reason phrase, or `Unknown Error` for a network failure |
| `error` | the parsed body, so an API's error payload is here |
| `url` | the URL that failed, useful in a log |

`status === 0` is the one to handle deliberately, because it covers a dropped connection, a DNS failure
and a blocked CORS preflight, and none of those is a problem the person can fix by retrying the same
button immediately.

## Cancelling a request

```ts
export class Reports {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  load(): void {
    this.http
      .get<Report>(`${this.base}/reports/latest.json`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((report) => this.report.set(report));
  }
}
```

Unsubscribing aborts the request, which matters for a search box or a page someone navigates away from.
A resource does this for you when its parameters change, which is one more reason the resource API is
the default in this course.

## Where the URL comes from

```ts
provideRouter(routes),
```

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "changeOrigin": true
  }
}
```

Requests go to a relative URL, and the development proxy sends `/api` to the backend. In production the
same paths are served by a reverse proxy, so the front end has no absolute host anywhere in it. An
absolute URL in a component is the thing that breaks when the API moves, and a token such as
`API_BASE` is the one place to allow one.

## Check yourself

Write a method that posts a new loan, subscribe to it in a component and log every failure field from
`HttpErrorResponse`. Then point the URL at an unresolvable host and compare the `status` and
`statusText` you get with the ones from a 500.
