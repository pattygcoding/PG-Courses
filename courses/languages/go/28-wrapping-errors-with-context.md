---
title: Wrapping errors with context
summary: The chain a %w builds, the three functions that walk it, and what a good message adds.
chapter: Errors and reliability
minutes: 13
status: draft
---

## A wrap adds context without losing the cause

```go
func deep() error {
	return fmt.Errorf("level 3: %w", &QueryError{Query: "select", Err: ErrNotFound})
}

func middle() error {
	return fmt.Errorf("level 2: %w", deep())
}

func outer() error {
	return fmt.Errorf("level 1: %w", middle())
}

fmt.Println(outer())
```

```text
level 1: level 2: level 3: query select: not found
```

Three functions each added a phrase and the original message is still at the end. `%w` stores the inner error rather than
formatting it into the text, so the chain exists as data and the printed message is still readable.

That is the shape of a good error message in Go: the outer function says what it was doing, and the innermost error says what
failed. `loading config: opening /etc/app.toml: permission denied` is four words of context around the real cause, and every
one of them came from a different function.

## The three functions that walk the chain

```go
fmt.Println(errors.Is(err, ErrNotFound))
fmt.Println(errors.Unwrap(err))
fmt.Println(errors.Unwrap(errors.Unwrap(err)))
```

```text
true
level 2: level 3: query select: not found
level 3: query select: not found
```

`errors.Is` walks the chain looking for a match. `errors.Unwrap` takes one step, which is mostly useful when writing a
custom wrapper or debugging one. `errors.As` walks the chain looking for a type:

```go
var qe *QueryError

fmt.Println(errors.As(err, &qe), qe.Query)
```

```text
true select
```

It found the `*QueryError` two wraps down and filled in the pointer, so `qe.Query` is readable. That pair, `Is` for a
sentinel and `As` for a type, is the whole inspection API, and both walk the whole chain rather than one level.

## What to put in a message

The convention that matters: an error message is lowercase, does not end with punctuation, and starts with the operation.

```go
fmt.Errorf("parsing row %d: %w", i, err)
fmt.Errorf("reading %s: %w", path, err)
fmt.Errorf("sending %s to %s: %w", kind, host, err)
```

Three rules follow from that. An error is often embedded in the middle of another sentence, so a capital and a full stop
read wrong. The operation goes first, because the outer context is what the caller did not know. And the variable part is
worth including: the row number, the path, the host, because that is what makes a log line actionable.

What not to put in: the word "error", because the type already says it; the function name, because the stack trace has it;
and a phrase that restates the cause, which is how `failed to read: read error: read failed` happens.

## The verbs that keep a chain and the one that loses it

| Verb | Keeps the chain |
| --- | --- |
| `%w` | yes, and this is the one to use |
| `%v`, `%s` | no, the inner error becomes text |
| `%q` | no, and it adds quotes you did not want |

```go
err := fmt.Errorf("loading %s: %v", path, ioErr)   // the chain is gone
err = fmt.Errorf("loading %s: %w", path, ioErr)     // errors.Is still finds ioErr
```

That single character is the difference between a caller being able to check `errors.Is(err, os.ErrNotExist)` and not. It is
the most valuable two-character difference in Go and the one to look for in a review.

One `%w` per call is allowed. Where two errors have to be combined, `errors.Join` is the function:

```go
joined := errors.Join(ErrNotFound, fmt.Errorf("second: %w", ErrNotFound))
fmt.Println(joined)
fmt.Println(errors.Is(joined, ErrNotFound))
```

```text
not found
second: not found
true
```

`Join` returns an error whose message is the members separated by newlines and whose `Unwrap` returns a slice of them. The
interface it satisfies is worth knowing, because it is how `errors.Is` and `errors.As` handle it:

```go
type multi interface{ Unwrap() []error }

var m multi
fmt.Println(errors.As(joined, &m), len(m.Unwrap()))
```

```text
true 2
```

So an error in Go is a chain via `Unwrap() error` or a tree via `Unwrap() []error`, and every inspection function handles
both. A custom error type implements one of those to participate, which the next lesson uses.

## Where to wrap and where not to

- **Wrap where you can add information the caller does not have.** The path, the key, the record number, the query.
- **Do not wrap where the message would add nothing.** `return fmt.Errorf("calling doThing: %w", err)` is noise.
- **Do not wrap at every level automatically.** A chain ten deep prints ten phrases and the reader stops reading.
- **Wrap at a boundary and let the names do the rest.** A function called `loadConfig` does not need to say "loading config"
  in the error.

My rule: one wrap per boundary, and the message says what the code was trying to do rather than which function called which.
If the wrap is `fmt.Errorf("in %s: %w", nameOfFunction, err)`, the stack trace already had that.

## Check yourself

Write three functions where each wraps the error from the next, print the result, then check the innermost sentinel with
`errors.Is`. Change one `%w` to `%v` and confirm `errors.Is` stops finding it. Finish by joining two errors and confirming
both are found.
