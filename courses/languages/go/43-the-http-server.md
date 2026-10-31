---
title: The HTTP server
summary: Handlers, the mux, middleware as a function, and the panic that drops a connection.
chapter: The standard library
minutes: 14
status: draft
---

## A handler is an interface with one method

```go
func rowsHandler(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(map[string]string{"key": key})
}
```

```go
mux := http.NewServeMux()
mux.HandleFunc("/rows", rowsHandler)
```

`http.HandlerFunc` is the adapter that turns that function into an `http.Handler`, so `HandleFunc` is the short form and
`Handle` takes anything with a `ServeHTTP` method. The response is written through `w`, and the request carries the method,
the URL, the headers and the body.

## Middleware is a function that wraps a handler

```go
func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request", "method", r.Method, "path", r.URL.Path, "took", time.Since(start))
	})
}
```

```go
func chain(h http.Handler, ms ...middleware) http.Handler {
	for i := len(ms) - 1; i >= 0; i-- {
		h = ms[i](h)
	}

	return h
}
```

```go
h := chain(mux, withLogging, withRequestID)
```

```text
200 req-1 {"key":"a"}
```

A middleware is a function taking an `http.Handler` and returning one, and `chain` applies them in reverse so the first in the
list is the outermost. That is the whole pattern: the list of names at the top of `main` is the request's path, and each
middleware is testable on its own with a stub handler.

The order matters for two of them. A recovery middleware has to be outermost so it catches a panic from anything inside,
including another middleware. A logging middleware that wants the response status has to wrap a `ResponseWriter` to observe
it, because the status is written once and never reported back.

## A panic in a handler does not crash the server

```text
panic: got response: false err: true
error text is EOF or connection reset: true
```

The `net/http` server recovers a panic in a handler, logs it with the stack, and closes the connection. The process keeps
running and other requests are unaffected, but the client sees a broken connection rather than a response: no status code, no
body, and a retry is the only option.

That is why a recovery middleware is worth having. It turns the dropped connection into a 500 with a body, and it puts the
stack in the log where the request id is:

```go
func withRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("panic", "path", r.URL.Path, "err", err, "stack", string(debug.Stack()))
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
```

The recovery is only correct as the outermost middleware and only for a request that has not already written a response. A
panic after `WriteHeader` cannot be turned into a 500, because the status is on the wire.

## The server, with the timeouts that matter

```go
srv := &http.Server{
	Addr:              ":8080",
	Handler:           h,
	ReadHeaderTimeout: 5 * time.Second,
	ReadTimeout:       15 * time.Second,
	WriteTimeout:      15 * time.Second,
	IdleTimeout:       60 * time.Second,
}

if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
	return err
}
```

`ReadHeaderTimeout` is the one not to omit: without it a client can open a connection and send headers one byte at a time,
holding a goroutine and a file descriptor indefinitely. That is the slowloris attack and the field is the whole defence.
`http.Server` documents that a zero `ReadTimeout` means no timeout, and a static analysis tool will flag the omission.

The `http.ErrServerClosed` check is the other detail: a server that was shut down returns it from `ListenAndServe` and it is
not an error.

## Graceful shutdown

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

go func() {
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("listen", "err", err)
		os.Exit(1)
	}
}()

<-ctx.Done()

shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()

if err := srv.Shutdown(shutdownCtx); err != nil {
	return fmt.Errorf("shutting down: %w", err)
}
```

`Shutdown` stops accepting new connections and waits for the in-flight requests to finish, up to the context's deadline. The
order is the one from the concurrency chapter: stop accepting, cancel, wait, then exit. A `srv.Close()` instead of `Shutdown`
drops the in-flight requests, which is what happens when a deployment returns a 502 for a request that was nearly done.

`signal.NotifyContext` gives a context cancelled by `SIGINT` or `SIGTERM`, which is the one call that replaces a
`signal.Notify` plus a channel, and `SIGTERM` is what a container runtime sends.

## Testing a handler with no listener

```go
func TestRowsHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/rows?key=a", nil)
	rec := httptest.NewRecorder()

	rowsHandler(rec, req)

	resp := rec.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Errorf("status = %d, want %d", resp.StatusCode, http.StatusOK)
	}
}
```

`httptest.NewRequest` builds a request with no network and `httptest.NewRecorder` captures the response, so a handler test is
fast and needs no port. `rec.Code` is the status, `rec.Body` is the body, and `rec.Result()` gives an `*http.Response` for a
test that wants the parsed headers.

The same two types test a middleware, with a stub handler as the `next`:

```go
next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusTeapot)
})

withLogging(next).ServeHTTP(rec, req)
```

## The rules

1. `Header().Set` before `WriteHeader`, and `WriteHeader` once.
2. A path pattern with the method in it, so the handler checks nothing.
3. Recovery middleware outermost, with the stack in the log.
4. `ReadHeaderTimeout` on the server, always.
5. `Shutdown` with a deadline, not `Close`.
6. Test a handler with `httptest.NewRecorder`, not a port.

## Check yourself

Write a mux with a path pattern and a query parameter, then two middlewares and a chain. Panic in a handler and read what the
client sees, then add the recovery middleware and confirm the 500. Finish with a `Shutdown` on a signal and a handler test
using `httptest.NewRecorder`.

## The order of a response

```text
200 req-1 {"key":"a"}
```

Three things have to happen in order, and getting it wrong produces a silent mistake:

```go
w.Header().Set("Content-Type", "application/json")   // 1. headers before the status
w.WriteHeader(http.StatusOK)                          // 2. status, once
json.NewEncoder(w).Encode(payload)                    // 3. body
```

`Header().Set` after `WriteHeader` has no effect and produces a warning in the log, because the headers were already sent.
`WriteHeader` called twice logs `superfluous response.WriteHeader call` and the second one is ignored. And calling
`Encode` or `Write` without a `WriteHeader` sends a 200 automatically, so forgetting the status is a 200 rather than an
error.

`http.Error(w, "not found", http.StatusNotFound)` is the one-call version for a plain text error, and it sets the content
type and the status together:

```go
if r.Method != http.MethodGet {
	w.Header().Set("Allow", http.MethodGet)
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	return
}
```

```text
405 GET
```

`r.URL.Query().Get("key")` reads a query parameter and returns an empty string when it is absent, which is the same
convention as a map read without the comma-ok form. `r.PathValue("id")` reads a path parameter on the pattern syntax that
`ServeMux` gained in Go 1.22:

```go
mux.HandleFunc("GET /rows/{key}", func(w http.ResponseWriter, r *http.Request) {
	key := r.PathValue("key")
	...
})
```

That pattern syntax is worth using: `GET /rows/{key}` restricts the method and captures the segment, so the handler needs no
methods. `{key...}` captures the rest of the path. The alternative is a router from a package, which is only worth it for
something the mux does not do, such as a regex constraint.

PLACEHOLDER
