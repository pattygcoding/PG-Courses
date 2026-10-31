---
title: Small interfaces
summary: One or two methods, declared by the caller, and the interface that has become a liability.
chapter: Patterns and design
minutes: 12
status: draft
---

## The interface the standard library keeps proving

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

One method, and it is satisfied by a file, a socket, a buffer, a compressed stream, an HTTP body and a test fixture. Every
function written against it works with all of them and with anything written later, which is the property that makes an
interface worth having: it is a requirement a caller can meet in a way the author never considered.

The rule that follows is the one this chapter is about: **an interface should have one to three methods**. Past that, the
number of types that satisfy it drops to one in practice, and an interface with one implementation is a name to keep in step.

## Declare the interface where it is used

```go
package report

type RowSource interface {
	Rows() ([]Row, error)
}

func Build(src RowSource) (Report, error) {
	rows, err := src.Rows()
	...
}
```

The consumer declares the interface, and it declares the two methods it calls rather than the ten the implementation has.
That is the opposite of a Java or C# design, where the interface lives with the implementation and a consumer imports it, and
the reason is implicit satisfaction: nothing has to be declared for a type to satisfy an interface, so the consumer can
invent the contract it needs.

```go
// package store
type Store struct { ... }

func (s *Store) Rows() ([]Row, error) { ... }
func (s *Store) Save(row Row) error { ... }
func (s *Store) Migrate() error { ... }
```

`*Store` satisfies `report.RowSource` with nothing in either package mentioning the other, and the report package has no
dependency on the store package. That is the direction of the dependency a well designed Go package graph has.

## The interface pollution smell

- **An interface with one implementation and no test double.** The interface exists in case, and it costs every reader.
- **An interface in the same file as its only implementation**, named `FooInterface` or `IFoo`. The name says the author was
  thinking in another language and the interface is doing nothing.
- **An interface with six methods and a `mock_` file.** The mock is the only second implementation, and it exists because
  the interface is too big to fake by hand.
- **An interface exported from a package whose own types are the only implementations.** A caller cannot use it for anything
  other than the type they already had.
- **An interface used only as a return type.** The caller loses the concrete type and gains nothing, which is the
  "return structs" half of the rule.

The two questions that find them: what is the second implementation, and is it a test double? An interface whose answer is
"none" is a type with an extra name, and an interface whose only second implementation is a mock is often one that should be
three.

## Accept interfaces, return structs

```go
func NewStore(path string) *Store { }
func Export(w io.Writer, rows []Row) error { }
```

`NewStore` returns a concrete type, so a caller has every method and the compiler's errors name the type. `Export` takes an
interface, so any writer works, including a `bytes.Buffer` in a test and a file in production.

The reason it is the right way round: a parameter's interface is a requirement the caller can satisfy however it likes, and a
return type's interface is a restriction that throws away information. A function returning `io.Reader` when it built an
`*os.File` has given the caller one method instead of twenty.

The exception is a factory that genuinely returns one of several implementations, which is what an interface return is for:

```go
func Open(kind string) (Codec, error)
```

## Composition over a shared base

```go
type ReadCloser interface {
	Reader
	Closer
}
```

An interface composed from two small ones is the third pattern, and it is how the standard library builds the contracts it
needs: `io.ReadCloser`, `io.ReadWriteCloser`, `io.ReadSeeker`. Each is a name for a combination rather than a new set of
methods, and a function that needs only to read takes `io.Reader` rather than the combination.

The same idea applies to a struct: an embedded interface plus overrides for the two methods that matter is a decorator, and
the embedded field starts nil, which is the hazard the embedding lesson named.

```go
type loggingStore struct {
	Store
	logger *slog.Logger
}

func (s *loggingStore) Save(row Row) error {
	s.logger.Info("saving", "key", row.Key)
	return s.Store.Save(row)
}
```

That wrapper satisfies `Store` with three lines, and every method it does not override is promoted. It is the pattern for a
cross-cutting concern: one method wrapped, the rest forwarded, and the caller's type unchanged.

## A checklist for an interface

1. Who declares it, and is that the package that uses it?
2. How many methods, and could it be fewer?
3. What is the second implementation?
4. Is it a parameter type or a return type?
5. Does a caller that takes it still need the concrete type for something else?

A "no" to the third question and an interface in a return position are the two answers worth acting on.

## Check yourself

Find an interface in a codebase with more than three methods and write the two-method version the caller actually needs, then
change the consumer to use it. Take an interface in a return position and change it to a concrete type and see what a caller
can now do that it could not before.
