---
title: Interfaces in the standard library
summary: io.Reader, fmt.Stringer and http.Handler, and the two rules they teach.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## The most used interface in Go

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}
```

`io.Reader` is one method, and a file, a network connection, a gzip stream, a byte buffer, a string and a test fixture all
satisfy it. Every function taking an `io.Reader` accepts all of them, which is why the standard library's design scales to
uses nobody anticipated:

```go
func Count(r io.Reader) (int64, error) {
	return io.Copy(io.Discard, r)
}
```

`io.Copy` takes a `Writer` and a `Reader`, so it moves bytes between any two things that satisfy the two interfaces. That is
composition over a tiny contract rather than a class hierarchy.

The pair is worth reading in the source, because it is a model for how to design an interface: one method, a name that says
what it does, a comment that describes the contract precisely, and no knowledge of the implementations.

```go
type Writer interface {
	Write(p []byte) (n int, err error)
}

type ReadCloser interface {
	Reader
	Closer
}
```

`io.ReadCloser` is composed from two interfaces, which is how the standard library builds the bigger contracts out of the
small ones. `io.ReadWriteCloser`, `io.ReadSeeker` and `io.WriteCloser` are the same pattern.

## The interfaces a type implements by accident

```go
type Row struct {
	Key string
}

func (r Row) String() string {
	return "row " + r.Key
}
```

`fmt.Stringer` is satisfied by any type with a `String() string` method, so a `String` method changes how the type prints
everywhere: `Println`, `Sprintf` with `%v` and `%s`, an error message that contains it, and a log line. That is the whole
contract, and it is worth taking seriously because it is the one method that changes output you did not write.

```go
type Money int64

func (m Money) String() string {
	return fmt.Sprintf("$%.2f", float64(m)/100)
}
```

`error` is the other one with a large effect: a type with `Error() string` is an `error` and can be returned, wrapped and
logged as one.

| Interface | Method | Effect |
| --- | --- | --- |
| `fmt.Stringer` | `String() string` | how the type prints |
| `error` | `Error() string` | the type is an error |
| `io.Reader` | `Read([]byte) (int, error)` | readable by anything |
| `io.Writer` | `Write([]byte) (int, error)` | writable by anything |
| `fmt.Formatter` | `Format(fmt.State, rune)` | custom verbs in `Printf` |
| `encoding.BinaryMarshaler` | `MarshalBinary() ([]byte, error)` | how the type serialises |

## http.Handler is a function in disguise

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}

type HandlerFunc func(ResponseWriter, *Request)

func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
	f(w, r)
}
```

`http.Handler` has one method, and `http.HandlerFunc` is an adapter that lets a plain function be one. That pair is the
standard pattern for making a function satisfy a single-method interface, and it is worth copying wherever most of the
implementations are functions:

```go
mux.Handle("/rows", http.HandlerFunc(listRows))
```

`http.HandlerFunc(listRows)` converts the function, and the conversion is the whole trick: the type has the method and the
method calls the function.

## Middleware is a function that takes and returns a handler

```go
func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		slog.Info("request", "path", r.URL.Path, "took", time.Since(start))
	})
}
```

That signature is the pattern: `func(http.Handler) http.Handler`. A chain of five is five nested calls, or a loop over a
slice of them, which the HTTP chapter builds.

The same shape appears everywhere a function wraps another: a `roundTripper` wrapping an `http.RoundTripper`, a
`http.RoundTripper` wrapping a transport, a `sort.Interface` wrapping a slice.

## What an interface costs

```go
var w io.Writer = os.Stdout
fmt.Fprintf(w, "written to stdout via %T\n", w)
```

```text
written to stdout via *os.File
```

Printing the interface's dynamic type with `%T` is a useful debugging step, and it is the reason the interface is not free:
the value inside is a pointer to the concrete type plus a pointer to the data, so an interface value is two words. That
matters for a slice of ten million of them, and it is one of the things the profiling lesson teaches you to measure.

The other cost is dispatch: a method called through an interface is an indirect call, which the compiler cannot inline. In
practice that is a few nanoseconds and it is rarely the thing to optimise first. The `Read` call in `io.Copy` is one indirect
call per buffer, not per byte.

## Accept interfaces, return structs

That advice is old and it is still the rule I use:

```go
func NewStore(path string) *SQLStore { }
func Export(w io.Writer, rows []Row) error { }
```

`NewStore` returns a concrete type, so a caller has every method the type has and the compiler's errors name the type.
`Export` takes an interface, so any writer works, including a `bytes.Buffer` in a test and a file in production.

The reason it is the right way round: a parameter's interface is a requirement the caller can satisfy however it likes, and
a return type's interface is a restriction that throws away information the caller may need. Returning `io.Reader` from a
function that built an `*os.File` gives the caller one method when it could have had twenty.

The exception is a function that genuinely returns one of several implementations, which is what a factory does. There the
interface is the point, at the price of a type assertion for anything specific.

## Declare the interface where it is used

```go
package report

type RowSource interface {
	Rows() ([]Row, error)
}

func Build(src RowSource) (Report, error) { }
```

The interface belongs in the package that consumes it rather than the one that implements it, which is the opposite of most
object-oriented designs. The reason is implicit satisfaction: a consumer can declare exactly the methods it needs without the
implementation knowing the interface exists.

That is what makes a test double free, and what keeps interfaces small: the consumer writes the two methods it calls rather
than the ten the type has. A package that exports an interface for its own implementation has usually made its API harder to
use, because the caller now has to import the interface to name the type.

## Check yourself

Write a function taking an `io.Writer` and call it with a `bytes.Buffer` and with `os.Stdout`. Add a `String` method to a
type and print it with `%v`, `%s` and `%#v` to see which change. Then write two middlewares with the
`func(http.Handler) http.Handler` signature and compose them.
