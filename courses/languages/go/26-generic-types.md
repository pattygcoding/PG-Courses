---
title: Generic types
summary: A struct or a defined type with parameters, the methods it can have, and the method it cannot.
chapter: Generics
minutes: 13
status: draft
---

## A generic struct

```go
type Pair[K comparable, V any] struct {
	Key   K
	Value V
}

func (p Pair[K, V]) String() string {
	return fmt.Sprint(p.Key) + "=" + fmt.Sprint(p.Value)
}

p := Pair[string, int]{Key: "a", Value: 1}
fmt.Println(p)
```

```text
a=1
```

Two parameters, one constrained to `comparable` and one to `any`, and a method that uses both. The receiver names the type
with its parameters, and the method can only use what the constraints guarantee: `String` here uses `fmt.Sprint` rather than
`+`, because `Key` is not known to be a string.

The constraints are part of the type's identity. `Pair[string, int]` and `Pair[int, string]` are different types, and a
function taking one does not accept the other.

## A generic defined type

```go
type Slice[T any] []T

func (s Slice[T]) Len() int {
	return len(s)
}

s := Slice[int]{1, 2, 3}
fmt.Println(s.Len(), s[1])
```

```text
3 2
```

A defined type over a slice works the same way and `s[1]` is an `int`, because the underlying type is `[]T` with `T` bound
to `int`. That is how `sync/atomic.Pointer[T]`, `container/heap` in the new generic version and the standard library's
own `unique.Handle[T]` are built.

The conversion works in both directions, since the underlying type is known:

```go
plain := []int(s)
wrapped := Slice[int](plain)
```

## Methods use the receiver's parameters

```go
func (s Slice[T]) Map[U any](f func(T) U) []U { }
```

```text
genbad\check.go:5:22: syntax error: method must have no type parameters
```

That is a rule rather than a limitation in the implementation: a method may not declare its own type parameters. The
reason is that Go resolves a method call by the receiver's type, and a second parameter list would make the method's
identity depend on inference at the call site rather than on the receiver.

The workaround is a function that takes the value as an argument:

```go
func Map[T, U any](s []T, f func(T) U) []U {
	out := make([]U, 0, len(s))

	for _, v := range s {
		out = append(out, f(v))
	}

	return out
}
```

That is what `slices.Map` would look like if it existed, and it is why the standard library's generic helpers are functions
in `slices`, `maps` and `cmp` rather than methods on a slice type.

## Generic functions that return the parameter's type

```go
func Clone[T any](s []T) []T {
	out := make([]T, len(s))
	copy(out, s)
	return out
}
```

`make([]T, len(s))` is legal because a slice of the type parameter can be built, and `copy` works element-wise. What is not
legal is anything that needs to know what `T` is:

- No `new(T)` with arguments, and no composite literal with fields, because the set may contain a struct or an `int`.
- No type assertion on `T`.
- No `T` as a map key unless the constraint is `comparable`.
- No reflection on `T` without a value of it.

A zero `T` is available in the two forms that matter:

```go
var zero T
out := make([]T, n)
```

`var zero T` is the zero value, and `make([]T, n)` is a slice of zero values. Both are the reason a generic container can be
built at all, and neither needs to know what the type is.

## Type parameters on a container

```go
type Stack[T any] struct {
	items []T
}

func (s *Stack[T]) Push(v T) {
	s.items = append(s.items, v)
}

func (s *Stack[T]) Pop() (T, bool) {
	if len(s.items) == 0 {
		var zero T
		return zero, false
	}

	v := s.items[len(s.items)-1]
	s.items = s.items[:len(s.items)-1]

	return v, true
}
```

That is the shape of a generic container: a defined type with a slice field, pointer-receiver methods to mutate it, and the
`(T, bool)` return for the empty case rather than a sentinel value. The `Pop` above returns the zero `T` with `false`,
which is the convention from the maps lesson applied to a generic.

The alternative before Go 1.18 was a container of `any` with an assertion at every use, and the generic version is both
safer and faster, because the element size is known at compile time and no interface value is involved.

## When a generic type is not worth it

- **One instantiation.** A `Stack[Row]` used once in a codebase is a `[]Row` with extra steps.
- **The type parameter is only ever a constraint you could name.** A container for one interface is a container for that
  interface.
- **Methods you cannot write.** If every operation needs its own type parameter, the design wants functions.
- **A wrapper that only forwards.** A generic struct whose one method calls `len` on its field is a slice with a longer name.

The test I use: a generic type earns its parameters when at least two instantiations exist or will exist, and when the
operations it needs are expressible with the constraints available. Otherwise the concrete version is shorter and the
compiler's errors are more specific.

## Check yourself

Write a generic `Pair` with two parameters and a `String` method, then a `Stack` with `Push`, `Pop` and `Len`. Try to add a
method with its own type parameter and read the syntax error, then write it as a function instead.
