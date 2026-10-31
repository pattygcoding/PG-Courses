---
title: panic and recover
summary: The runtime failure that unwinds the stack, and the one place recovering is the right answer.
chapter: Control flow and functions
minutes: 13
status: draft
---

## A panic stops the goroutine and unwinds it

```go
func divideByZero() {
	a, b := 1, 0
	fmt.Println(a / b)
}
```

```text
panic: runtime error: integer divide by zero

goroutine 1 [running]:
main.divideByZero(...)
	/tmpgo/main.go:7
main.main()
	/tmpgo/main.go:22 +0x1b
exit status 2
```

A panic prints the value, then a stack trace for the panicking goroutine, then exits with status 2. Every deferred call
between the panic and the top of that goroutine runs on the way out, which is why a cleanup written with `defer` still
happens.

The value at the top of a runtime panic is an error-ish string. The ones worth recognising:

| Operation | Panic value |
| --- | --- |
| index past the length | `runtime error: index out of range [2] with length 1` |
| a failed type assertion | `interface conversion: interface {} is string, not int` |
| a write to a nil map | `assignment to entry in nil map` |
| a nil pointer dereference | `runtime error: invalid memory address or nil pointer dereference` |
| integer division by zero | `runtime error: integer divide by zero` |

Float division by zero is not on that list, because it produces `+Inf` rather than panicking. That is IEEE 754 arithmetic
and one more reason to check a divisor that came from outside the program.

## panic on purpose

```go
panic("boom")
```

`panic` takes an `any`, so the value can be a string, an error or anything else. A string is the convention for a programmer
error, and an error value is the convention when there is a cause worth wrapping:

```go
panic(fmt.Errorf("unknown level %q", level))
```

A panic on purpose is for a state the program cannot continue from and a caller cannot fix: a missing configuration value at
startup, an unreachable switch case, an invariant that was violated. It is not for a caller's mistake, which is what the
`error` return is for.

The line I draw:

- **A value from outside the program that is wrong** is an error, because a caller can handle it.
- **A value from the programmer that is wrong** is a panic, because no caller can.
- **Anything in between** is an error, because a panic in a library is a crash in somebody else's program.

```go
func mustParse(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		panic(err)
	}

	return d
}
```

A `must` helper is the idiomatic wrapper for a value computed at startup or in a test, and the name says what happens. The
standard library uses it in `regexp.MustCompile` and `template.Must`, and the convention is that a function whose name
starts with `Must` panics rather than returning an error.

## recover only works in a deferred function

```go
defer func() {
	if r := recover(); r != nil {
		fmt.Println("recovered:", r)
	}
}()
```

Set up like that at the top of a function, the panic unwinds and the deferred function catches it. Three rules make it work:

- `recover` has to be called directly by a deferred function. Inside a function that the deferred function calls, it returns
  nil.
- The deferred function has to be registered in the function that recovers, or in one further up the stack.
- After a recovery the function that recovered returns normally, and the panic is over. Nothing above it knows.

```go
func recoverNothing() {
	defer func() {
		fmt.Println("recovered:", recover() == nil)
	}()
	fmt.Println("no panic here")
}
```

```text
no panic here
recovered: true
```

With no panic, `recover()` is `nil`, which is why the `if r := recover(); r != nil` shape is required. Acting on the value
without that check is a bug, and a deferred `recover` in a function that never panics is two lines of nothing.

## What recovering does to the caller

```go
func call(f func()) {
	defer func() { fmt.Println("caught:", recover()) }()
	f()
}
```

```text
caught: runtime error: index out of range [2] with length 1
```

The panic is caught and `call` returns normally, so its caller has no idea anything happened. That is the danger and the
point at the same time: a `recover` with no report turns a crash into a silent failure, and the useful version does something
with the value.

## Where recovering is right

An HTTP server is the case the standard library itself uses. A panic in a handler would take down the process and every other
request with it, so a middleware recovers, logs the stack and returns a 500:

```go
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				slog.Error("panic", "err", err, "stack", string(debug.Stack()))
				http.Error(w, "internal error", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}
```

`debug.Stack()` is what makes that record useful, because the recovered value on its own is one line. The HTTP chapter builds
this middleware and the logging lesson covers the structured version.

The other places it belongs are a `main` that has to turn a panic into a non-zero exit with a message, and a long-running
worker that restarts one task rather than the process. In all three cases the recovery is at the boundary of the program or
of a unit of work, never in the middle of one.

## Where recovering is wrong

- **To swallow a bug.** A panic is a bug, and a recovery that continues hides it.
- **As an error-handling mechanism.** Using panic and recover to return a value from a deep call is control flow nobody can
  read, and the `error` return exists for it.
- **Around a library call that documents itself as panicking.** The fix is to satisfy the precondition rather than to catch
  the panic.
- **In a function that returns an error.** A recovered panic has lost its type, so the caller cannot tell what happened
  unless the recovery converts it deliberately.

## The panic value is not always an error

```go
defer func() {
	if err := recover(); err != nil {
		switch e := err.(type) {
		case error:
			fmt.Println("error:", e)
		default:
			fmt.Println("value:", e)
		}
	}
}()
```

`panic("boom")` gives a `string` and a runtime panic gives an `error`, so a recovery that assumes one or the other fails on
the other. Converting once at the point of recovery is the tidier version:

```go
func toError(v any) error {
	if err, ok := v.(error); ok {
		return err
	}

	return fmt.Errorf("%v", v)
}
```

## Check yourself

Trigger an index panic and a nil map panic, read both messages, and recover each with a deferred function. Then write a
`must` helper and the middleware above, and decide which functions in your own code should panic rather than return an error.
