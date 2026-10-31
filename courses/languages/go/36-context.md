---
title: Context
summary: Cancellation, deadlines and request-scoped values, and the one method every blocking call needs.
chapter: Concurrency
minutes: 13
status: draft
---

## A context carries a deadline and a cancellation

```go
ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
defer cancel()

err := work(ctx, 200*time.Millisecond)
fmt.Println(err)
```

```text
work: context deadline exceeded
```

`context.Context` is one interface with four methods: `Deadline`, `Done`, `Err` and `Value`. Everything else in the package
builds one: `Background` is the empty root, `WithCancel` adds a cancellation, `WithTimeout` and `WithDeadline` add a
deadline, and `WithValue` attaches a value.

A context is passed as the first parameter and it flows down the call tree, so cancelling the parent cancels every child:

```go
func query(ctx context.Context, key string) (Row, error)
```

That signature says the call can be cancelled and that the caller decides when. Any function that blocks, does I/O or takes
measurably long should take one, and a function that returns immediately usually should not.

## The done channel is the cancellation signal

```go
select {
case <-time.After(d):
	return nil
case <-ctx.Done():
	return fmt.Errorf("work: %w", ctx.Err())
}
```

`ctx.Done()` returns a channel that is closed when the context is cancelled, so it is a case in a `select` and it works with
anything else being waited on. `ctx.Err()` says why:

| `ctx.Err()` | Meaning |
| --- | --- |
| `nil` | not cancelled |
| `context.Canceled` | a parent was cancelled, or `cancel` was called |
| `context.DeadlineExceeded` | the deadline passed |

```go
fmt.Println(errors.Is(err, context.DeadlineExceeded))
```

```text
true
```

Wrapping with `%w` keeps the sentinel reachable, which is how a caller distinguishes a timeout from a failure. The standard
library's own functions return a `*url.Error` wrapping the context error, so `errors.Is` through the chain is the check to
write rather than a comparison.

## Always call cancel

```go
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()
```

`cancel` releases the timer and the child context even when the work finished before the deadline, so it goes on the line
after the `With...` call with a `defer`. `go vet`'s `lostcancel` check reports a path that misses it, and the consequence of
getting it wrong is a context tree that lives for the whole program.

The one exception is a cancellation that has to happen somewhere else, such as `main` cancelling on a signal:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
defer stop()
```

`signal.NotifyContext` is the standard way to make Ctrl-C cancel the tree, and it is worth knowing because it replaces the
hand-written `signal.Notify` plus a channel.

## What belongs in a context

```go
type key int

const requestIDKey key = iota

ctx = context.WithValue(ctx, requestIDKey, id)
```

`WithValue` attaches request-scoped data, and the rules around it are worth following exactly:

- **The key type is unexported and a defined type**, so nothing can collide with it by accident. A string key such as
  `"requestID"` is a key any other package can also use, and the two will overwrite each other.
- **Access goes through a function**, not `ctx.Value` at every call site:
  `func requestID(ctx context.Context) string`.
- **The values are for cross-cutting concerns**, not for the parameters the function actually needs. A request id, a trace
  id, an authenticated user and a logger are the four legitimate ones.
- **A database handle is not a value.** That is a dependency, and it belongs in a struct field or a parameter.

The signature rule is the one to hold on to: if removing the value from the context would change what a function does rather
than only how it logs or traces, the value belongs in a parameter. A function that takes its dependencies from the context
has hidden them from its signature and from every tool that reads it.

## Never store a context

```go
type Service struct {
	ctx context.Context      // do not
}
```

A context in a struct field fixes the lifetime at construction, so nobody can cancel or extend it per call. The rule is that
a context is a parameter and it flows down; a struct that needs one takes it as an argument on each method.

The same reasoning covers `context.Background()` in a library: a function that ignores the context it was given and creates
its own has broken the cancellation for everything above it, which is a bug that shows up as a timeout that does not work.

```go
func fetch(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}

	resp, err := client.Do(req)
	...
}
```

`http.NewRequestWithContext` is the shape to look for: a context is threaded into a request so the whole call is cancellable,
including the connection and the body read. A `client.Do(req)` with a plain `http.NewRequest` ignores every deadline the
caller set.

## Deadlines and timeouts

- **A deadline at the edge and a shorter one inside.** The HTTP request has a timeout, and the database query inside it has
  a shorter one so it fails first and the response is a useful error rather than a cut connection.
- **A timeout is not a retry policy.** A cancelled call has to be retried somewhere, and the retry count belongs with the
  timeout, not in a loop that ignores the context.
- **A server needs a shutdown timeout.** `http.Server.Shutdown(ctx)` waits for in-flight requests, and the context is what
  bounds the wait.

## Check yourself

Write a function taking a context and a duration that returns when either the work finishes or the context is done. Call it
with a short and a long duration and compare the errors. Then attach a request id with an unexported key type and read it
back through a function, and cancel a parent to confirm the child is cancelled too.
