---
title: Errors as values
summary: The error interface, the check after every call, and the two ways to carry what went wrong.
chapter: Control flow and functions
minutes: 14
status: draft
---

## error is an interface with one method

```go
type error interface {
	Error() string
}
```

That is the whole definition. Any type with an `Error() string` method is an error, so there is no base class to extend and
no constructor to call. An error value is an ordinary value that gets returned, compared, wrapped and stored.

```go
func find(key string) (string, error) {
	if key == "" {
		return "", fmt.Errorf("find: empty key")
	}

	return "row-" + key, nil
}
```

The convention worth following exactly: the `error` is the last return value, it is `nil` when the call succeeded, and the
caller checks it on the next line.

```go
v, err := find("a")
if err != nil {
	return err
}
```

`nil` as the success signal is what makes `if err != nil` the universal Go idiom. There is no `try`, no `except`, no
`catch` and no `throws` clause on the signature, so the failure path is visible in the body of every function that has one.

## Two ways to make one

```go
err := errors.New("store is closed")
err = fmt.Errorf("loading %s: %w", key, err)
```

`errors.New` builds an error from a fixed string, which is what a package-level sentinel uses:

```go
var ErrClosed = errors.New("store is closed")
```

`fmt.Errorf` builds one with formatting, and `%w` wraps an existing error rather than formatting it into the message:

```go
wrapped := fmt.Errorf("loading: %w", ErrClosed)
fmt.Println(wrapped, errors.Is(wrapped, ErrClosed))
fmt.Println(errors.Unwrap(wrapped) == ErrClosed)
```

```text
loading: store is closed true
true
```

Three things to notice. The printed message is the outer text plus the inner error's message, so a wrapped error reads as a
chain of context. `errors.Is` found the sentinel through the wrap, which is why wrapping is worth doing rather than
formatting the inner message with `%v`. And `errors.Unwrap` returned the original value, which is the mechanism underneath.

The difference between `%v` and `%w` is the whole wrapping story:

| Verb | Effect |
| --- | --- |
| `%v` or `%s` | the inner error becomes text, and the chain is lost |
| `%w` | the inner error is stored and reachable with `errors.Is` and `errors.As` |

One `%w` is allowed per `fmt.Errorf` call. Reaching for `%v` because the message reads fine is how a caller loses the
ability to check what went wrong, and it is the mistake to look for in a code review.

## A custom error type carries data

```go
type NotFoundError struct {
	Key string
}

func (e *NotFoundError) Error() string {
	return "no row for key " + e.Key
}
```

```go
_, err := find("missing")
fmt.Println(err)
```

```text
no row for key missing
```

A struct with an `Error` method is how an error carries data rather than only a message, and the pointer receiver is
conventional because a caller extracts a pointer with `errors.As`. The type is what a caller matches on and the fields are
what it reads:

```go
var nf *NotFoundError

if errors.As(err, &nf) {
	fmt.Println("key was", nf.Key)
}
```

```text
true missing
```

`errors.As` walks the chain looking for a value of that type and stores it in the pointer it was handed. It is the typed
counterpart of `errors.Is`, and the two are the supported ways to inspect an error. Comparing strings is fragile, and a type
assertion on the error value works only when nothing wrapped it.

| Check | Use |
| --- | --- |
| `err == ErrClosed` | a sentinel that nothing wraps |
| `errors.Is(err, ErrClosed)` | a sentinel that may be wrapped |
| `errors.As(err, &target)` | a typed error that carries fields |
| `err.Error() == "..."` | never |

## The zero value of an error is nil

```go
var nilErr error
fmt.Println(nilErr == nil, nilErr)

_, err := find("a")
fmt.Println(err)
```

```text
true <nil>
<nil>
```

An unset `error` is `nil`, and printing one is safe and prints `<nil>`. That is why a function that succeeds returns `nil`
rather than a zero value of a custom type, and why a struct field of type `error` is a usable default.

## The trap: a typed nil is not a nil interface

```go
func bad() error {
	var e *NotFoundError
	return e
}
```

That function returns what looks like an error and `nil` at the same time, and the check at the call site takes the failure
branch:

```text
false
```

The interface holds a type and a value. The type is `*NotFoundError` and the value is `nil`, so the interface itself is not
nil, and `bad() == nil` is false. The rule that avoids it: `return nil` rather than returning a typed nil variable, and never
declare a variable of a concrete error type and return it without checking it.

That is the most subtle bug in the language's error handling, and the wrapping lesson in the errors chapter comes back to it
with the way `errors.As` interacts with it.

## Why there are no exceptions

The argument for the design is that the code you read is the code that runs. A call that can fail says so in its signature,
the check is at the call site, and there is no block somewhere up the stack deciding what to do about a failure from a
function it has never heard of. A function with four fallible calls has four checks, and a reader can see all four.

The cost is those four checks. They are repetitive, there is no sugar for them, and a wrapper that only forwards an error is
three lines instead of none. My position after some years of it: the repetition is real, it becomes a habit within a week,
and the ability to answer "what can fail here and what happens then" by reading one function is worth more than the lines it
saves.

What it is not is free of subtleties. The typed nil above, a `%v` that loses a chain, and an error that is checked and then
dropped are the three mistakes to look for when reviewing Go error handling, and the errors chapter covers all three plus
the question of where an error should be logged.

## Check yourself

Write a function returning `(T, error)` with three failure cases: a sentinel, a formatted error and a typed error with a
field. Check each with `errors.Is` or `errors.As` at the call site, then wrap one with `%w` and confirm `errors.Is` still
finds it. Finally write a function that returns a typed nil and explain why its caller sees a failure.
