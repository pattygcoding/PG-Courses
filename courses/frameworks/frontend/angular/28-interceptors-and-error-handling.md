---
title: Interceptors and error handling
summary: One function every request passes through, and the retry that should not apply to a write.
chapter: Talking to a server
minutes: 14
status: draft
---

## The interceptor

```ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, retry, throwError, timer } from 'rxjs';
import { Session } from './session';

function isServerError(error: unknown): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status >= 500;
}

function describe(error: unknown): Error {
  if (error instanceof HttpErrorResponse) {
    return new Error(`Request failed with status ${error.status} for ${error.url ?? 'an unknown url'}`);
  }
  return error instanceof Error ? error : new Error('The request failed');
}

/**
 * Adds the session token to every API call, retries a failed GET once, and
 * turns a transport failure into an error the UI can show.
 */
export const apiInterceptor: HttpInterceptorFn = (request, next) => {
  const session = inject(Session);

  const authorized = request.clone({
    setHeaders: { 'X-Library-Session': session.token() },
  });

  return next(authorized).pipe(
    retry({
      count: 1,
      delay: (error: unknown, attempt: number) =>
        request.method === 'GET' && isServerError(error)
          ? timer(attempt * 250)
          : throwError(() => error),
    }),
    catchError((error: unknown) => throwError(() => describe(error))),
  );
};
```

```ts
provideHttpClient(withInterceptors([apiInterceptor]))
```

An interceptor is a function from `(request, next)` to an observable of the response. `request` is
immutable, so a change is made with `request.clone(...)`, and `next(request)` sends it on. The
interesting part of that function is the pipe: the operators after `next(...)` see the response or the
failure, which is where logging, retrying and error translation belong.

The order of the array is the order of the chain. The first interceptor sees the request first and the
response last, which is how a logging interceptor at the front can time the whole thing including every
retry that happened behind it.

## The retry needs a method check

The first version of that interceptor retried every failure once, including a failed `POST`. That is a
bug rather than a nicety: the request may have reached the server and recorded the loan before the
connection dropped, and a retry records it twice. The check is one condition:

```ts
request.method === 'GET' && isServerError(error) ? timer(attempt * 250) : throwError(() => error)
```

`GET` is idempotent by definition, so sending it again is safe. Anything with a body needs a different
answer, and the answer is a request id the server can de-duplicate or a retry the person triggers after
reading the message. Two tests in this project pin both halves:

```ts
it('retries a 503 once before giving up', async () => { /* two requests, second one succeeds */ });

it('does not retry a POST, because a write may already have happened', async () => {
  /* one request, and the error message carries status 503 */
});
```

Two other conditions are worth adding to a retry: skip 4xx entirely, because a rejected request stays
rejected, and add jitter to the delay so a fleet of clients does not retry in the same millisecond after
a server restarts.

## Turning a response into a message

```ts
catchError((error: unknown) => throwError(() => describe(error)))
```

The error the caller sees is an `Error` with a message a page can render. The trade is real and worth
stating: `describe` throws away the `HttpErrorResponse`, so a caller that needs a field of the API's
error body cannot get it. Three ways to keep both:

```ts
// keep the response and let the caller decide
catchError((error: unknown) => throwError(() => error))
```

```ts
// keep it as the cause
const failure = new Error(`Request failed with status ${status}`);
failure.cause = error;
```

```ts
// translate, and let an error code carry the field
return throwError(() => ({ code: 'LOAN_FAILED', message: 'The loan could not be recorded.' }));
```

I use the message version where the only reaction is "show this line", and the cause version when
something above may want to look at `status` or at the body. A library that maps every error into a
string makes a 409 conflict indistinguishable from a 500, and that mapping is worth revisiting the first
time a page needs to tell them apart.

## What else belongs in an interceptor

| Job | Where |
| --- | --- |
| an auth header | an interceptor, so no call site can forget it |
| a correlation id | an interceptor, generated once per request |
| translating an error | an interceptor, when every page reacts the same way |
| retrying | an interceptor, with the method check above |
| showing a toast | not here. An interceptor has no idea which page the failure belongs to |
| caching | not here. It belongs in a resource, a service or the browser's cache |

The toast case is the one people get wrong first. An interceptor that renders a message for every
failure puts a global error popup on top of a form that already shows the failure under the field, and
the fix is to return the error and let the caller decide.

## Testing an interceptor

```ts
TestBed.configureTestingModule({
  providers: [provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting()],
});

it('attaches the session header to every request', () => {
  TestBed.inject(HttpClient).get('/api/books.json').subscribe();

  const request = TestBed.inject(HttpTestingController).expectOne('/api/books.json');
  expect(request.request.headers.get('X-Library-Session')).toBe('demo-token');
  request.flush([]);
});
```

`provideHttpClientTesting()` replaces the backend with one a test controls, so no request leaves the
process. The testing chapter covers the rest of that API, including the retry test with fake timers.

## Check yourself

Add a second interceptor that logs the method, the URL and the elapsed time for every request, and
register it before the API interceptor. Then make the API return `Retry-After: 5` on a 503 and decide
whether to honour it in the retry delay.
