---
title: Sentinel and typed errors
summary: The package-level error a caller compares, the type that carries data, and the methods that make both work.
chapter: Errors and reliability
minutes: 13
status: draft
---

## A sentinel is an exported value

```go
var ErrNotFound = errors.New("not found")
```

That is a sentinel: one exported error value that a caller compares against, and the convention is a name starting with
`Err`. The standard library's `io.EOF`, `sql.ErrNoRows`, `os.ErrNotExist` and `context.Canceled` are the same shape, and a
library that returns errors should have one or two.

```go
row, err := store.Find(key)

if errors.Is(err, ErrNotFound) {
	return nil
}
```

`errors.Is` rather than `==` is the rule, because the error a caller receives may have been wrapped on the way up. The
identity comparison works only when nothing wrapped it, which is not something the caller can rely on.

The alternative to a sentinel is `(T, bool)`, and the choice is worth thinking about once per API:

| Return | Says |
| --- | --- |
| `(T, error)` with `ErrNotFound` | several failure modes, one of them is absence |
| `(T, bool)` | one failure mode, which is absence |
| `(*T, error)` with a nil pointer | absence, and the nil is checkable |

My rule: a `bool` for a lookup with no other failure, a sentinel for a function that can fail in more than one way, and never
both a nil pointer and a sentinel for the same absence.

## A typed error carries fields

```go
type QueryError struct {
	Query string
	Err   error
}

func (e *QueryError) Error() string {
	return "query " + e.Query + ": " + e.Err.Error()
}

func (e *QueryError) Unwrap() error {
	return e.Err
}
```

```text
level 1: level 2: level 3: query select: not found
true
```

The `Unwrap` method is what puts a custom error into the chain, so `errors.Is` and `errors.As` can walk through it. Without
it the type is a leaf and the sentinel inside it is unreachable, which is an invisible mistake because the message looks
right:

```go
fmt.Println(errors.Is(&NoUnwrap{Err: ErrNotFound}, ErrNotFound))   // false
fmt.Println(errors.Is(&WithUnwrap{Err: ErrNotFound}, ErrNotFound)) // true
```

The two types differ by the `Unwrap` method and nothing else, and the first one is a failure a caller cannot check for.

```go
var qe *QueryError

if errors.As(err, &qe) {
	logger.Info("query failed", "query", qe.Query)
}
```

`errors.As` fills in the pointer and the fields are readable, which is the reason to have a type rather than a message in
the first place. The convention is a pointer receiver and a pointer target, so the assertion looks for `*QueryError`.

The field names are part of the API of the error, which is worth remembering: exporting a `Query` field commits to it.

## A type can implement Is

```go
func (e *QueryError) Is(target error) bool {
	return target == ErrNotFound
}
```

With that method, `errors.Is(err, ErrNotFound)` returns true for any `*QueryError`, because the chain walk calls the `Is`
method at each step. It works with nothing wrapped at all:

```text
true
```

That is how an error type declares an equivalence without wrapping a specific sentinel: the type says which sentinels it
counts as. `os.ErrNotExist` uses the same mechanism, which is why `errors.Is(err, os.ErrNotExist)` is true for a
`*PathError` from any of several syscalls.

```go
func (e *QueryError) Is(target error) bool {
	return target == ErrNotFound || errors.Is(e.Err, target)
}
```

That version keeps the default behaviour for the wrapped error as well as adding the equivalence, which is the safer shape.

## Where the sentinel goes

The sentinel belongs in the package that defines the operation rather than the one that implements it:

```go
package store

var ErrNotFound = errors.New("not found")

type Store interface {
	Find(key string) (Row, error)
}
```

A caller imports the interface and the sentinel together, so a second implementation of `Store` returns the same
`ErrNotFound` and the caller's check works unchanged. A package with two implementations each returning its own not-found
error is a package whose callers check both.

That is the same argument as the interface being declared where it is used, and it is why a well designed package exports
one or two errors rather than a family of them.

## What not to export

- **Every error the package can return.** A caller has no reason to handle sixteen failure modes; the two it can react to
  belong in the API and the rest are messages.
- **An error as a struct with exported fields and no Unwrap.** The chain stops at the type.
- **A sentinel a caller cannot reach.** A lowercase `errNotFound` in a package that returns it is a check nobody can write.
- **A sentinel for a failure that is a bug.** A panic or a plain `fmt.Errorf` is honest where no caller can act.

The list worth asking in a review: which of these errors can a caller do something different about? Those are the exported
ones, and everything else is a message with context.

## Sentinel or type

| Need | Use |
| --- | --- |
| A caller that branches on the kind | a sentinel |
| A caller that reads a field | a type with `errors.As` |
| Both | a sentinel plus a type whose `Is` matches it |
| A message with no branch | `fmt.Errorf` and no export |

The second row is the one people skip, and it is the reason a log line often cannot say which row failed: the error had the
information in a message string and the caller had nothing to extract.

## Check yourself

Write a package-level sentinel and a function that returns it, then a typed error with a field and an `Unwrap`. Check both
with `errors.Is` and `errors.As` through two levels of wrapping. Then add an `Is` method to the type and confirm the sentinel
is found without being wrapped.
