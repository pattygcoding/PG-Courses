---
title: The HTTP client
summary: A client with a timeout, a request with a context, and the body that has to be closed.
chapter: The standard library
minutes: 13
status: draft
---

## Always use a client with a timeout

```go
client := &http.Client{Timeout: 2 * time.Second}

resp, err := client.Get(url)
if err != nil {
	return fmt.Errorf("fetching %s: %w", url, err)
}
defer resp.Body.Close()
```

`http.Get` uses `http.DefaultClient`, which has no timeout: a server that accepts the connection and never answers holds the
goroutine for ever. That is the reason to build a client once and reuse it:

```go
var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     90 * time.Second,
	},
}
```

A client is safe for concurrent use and it pools connections, so creating one per request throws the pool away and leaks
connections. That is the most common mistake in Go HTTP client code, and it shows up as sockets in a waiting state rather
than as an error.

## The body has to be closed

```go
defer resp.Body.Close()
```

Three things about that line matter:

- It is `resp.Body`, not the client. A response body is a stream from the connection, and not closing it keeps the
  connection out of the pool.
- Reading the body to the end and then closing is what allows the connection to be reused. A body read halfway and closed
  discards the connection.
- `io.ReadAll` on an untrusted body with no limit is how a small response becomes a large allocation, so a limit belongs on
  anything from outside.

```go
body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
```

Checking the status is the caller's job, because a 404 and a 500 both come back as a successful `Do` with a nil error:

```text
200 application/json <nil>
404 404 Not Found
```

The idiom is a helper that turns a non-2xx into an error carrying the body:

```go
func check(resp *http.Response) error {
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return nil
	}

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))

	return fmt.Errorf("%s: %s", resp.Status, body)
}
```

## A request with a context

```go
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
defer cancel()

req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
if err != nil {
	return err
}

resp, err := client.Do(req)
```

```text
true context deadline exceeded
```

`http.NewRequestWithContext` is the constructor to use, because a request built with `http.NewRequest` ignores the caller's
deadline and the point of a context is lost. The error from `Do` wraps the context error, so
`errors.Is(err, context.DeadlineExceeded)` is the check to write.

The client's own `Timeout` and the context both apply and the shorter one wins. The split I use: a client timeout as the
outer bound for every request that client makes, and a per-request context for the caller's own deadline.

## A POST with a body

```go
req, err := http.NewRequest(http.MethodPost, url, strings.NewReader(payload))
if err != nil {
	return err
}

req.Header.Set("Content-Type", "application/json")

resp, err := client.Do(req)
```

```text
200 11
```

`ContentLength` is set from a reader whose length the standard library can determine, which is why `strings.NewReader` and
`bytes.Buffer` work and an `io.Pipe` leaves it at -1 with chunked encoding. A nil body for a GET is a request with no body,
and an empty reader is a request with a zero-length one, which some servers treat differently.

## Decoding a response

```go
var rows []Row

if err := json.NewDecoder(resp.Body).Decode(&rows); err != nil {
	return fmt.Errorf("decoding %s: %w", url, err)
}
```

The decoder reads the body without holding the whole response in memory first, which is the version to prefer. A response
that is a union of two documents is a decoder loop, and one that arrives as a single object per line is the streaming case
from the JSON lesson.

## Status codes worth handling

| Code | Meaning here |
| --- | --- |
| 2xx | success |
| 3xx | the client followed the redirect, so the caller sees the final response |
| 400 | the request was wrong; do not retry |
| 401, 403 | credentials or permission; do not retry |
| 404 | absence, which is often not an error |
| 429 | rate limited; retry after the `Retry-After` header |
| 5xx | the server failed; retry if the request is idempotent |

A retry belongs on a 429, a 5xx and a network error, and on nothing else. A retry on a 400 is a request that fails four times
instead of once, and a retry on a POST is a duplicate record unless the endpoint is idempotent.

`http.Client` does not retry by default. `http.Transport` retries an idempotent request once when a pooled connection fails,
which is worth knowing because it means a `GET` can be sent twice with no code doing so.

## Testing a client without a network

```go
srv := httptest.NewServer(handler)
defer srv.Close()

resp, err := client.Get(srv.URL + "/rows")
```

```text
200 application/json <nil>
[{"key":"a"}] 14
```

`httptest.NewServer` starts a real listener on a random port and gives you its URL, so a test exercises the client, the
transport and the encoding with no network and no mock. `httptest.NewTLSServer` is the same with TLS and a client already
configured to trust its certificate, which is how TLS-specific code is tested.

That is why the standard library's HTTP client is testable by default: the code under test takes a URL or an `http.Client`,
and the test supplies a server. `httptest.NewRecorder` is the other half for a handler with no listener at all, which the
next lesson uses.

## The rules

1. One `http.Client` with a timeout, reused.
2. `defer resp.Body.Close()` on the line after the error check.
3. `http.NewRequestWithContext` whenever the call has a deadline.
4. Check the status code: a 4xx and a 5xx are not errors from `Do`.
5. Limit the body if the source is not trusted.
6. Retry a 429 and a 5xx, and only for an idempotent request.

## Check yourself

Write a client with a timeout and a request with a context, and cancel the context to read the error. Fetch a 404 and a 200
from an `httptest` server, decode the JSON, and write a helper that turns a non-2xx into an error with the body in it.
