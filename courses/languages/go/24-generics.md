---
title: Generics
summary: Type parameters, inference from the arguments, and the constraint that makes a body compile.
chapter: Generics
minutes: 13
status: draft
---

## A type parameter is declared in brackets

```go
func Sum[T Number](values []T) T {
	var total T

	for _, v := range values {
		total += v
	}

	return total
}

fmt.Println(Sum([]int{1, 2, 3}), Sum([]float64{1.5, 2.5}))
```

```text
6 4
```

`[T Number]` declares a type parameter `T` with the constraint `Number`, and the compiler infers `T` from the argument so
the call site writes nothing. That is the whole syntax: square brackets for the type parameter list, and a constraint that
says what `T` is allowed to do.

The constraint is what makes the body compile. Without one, `T` has no operators and `total += v` is an error, because a
type parameter with no constraint is only known to be anything at all:

```text
invalid operation: operator + not defined on v (variable of type T constrained by any)
```

The `constrained by any` at the end is the compiler saying where the limit came from, which is the part to read when the
message seems to be about something obvious.

Generics in Go arrived in 1.18, five years after the language shipped, and the design is deliberately small: no
specialisation, no generic methods, and constraints that are a type set rather than an interface with behaviour.

## The constraint is the requirement

```go
type Number interface {
	~int | ~float64
}
```

That is an interface used as a constraint, and it means "an `int`, a `float64`, or a type whose underlying type is one of
those". The addition in the body is legal because every type in that set supports it.

```go
type MyInt int

fmt.Println(Sum([]MyInt{1, 2}))
```

```text
3
```

`MyInt` is not an `int` and it satisfies the constraint anyway, because of the `~`. Without the tilde, `~int | ~float64`
would be `int | float64` and a defined type would not satisfy it, which is the subject of the next lesson.

## The standard library's constraint for ordering

```go
func Max[T cmp.Ordered](a, b T) T {
	if a > b {
		return a
	}

	return b
}

fmt.Println(Max(3, 7), Max("a", "b"))
```

```text
7 b
```

`cmp.Ordered` is the standard library's constraint for anything comparable with `<`, and it covers the numeric types, the
strings and any defined type over them. `cmp.Compare` and `cmp.Less` are the functions beside it, and `slices.Sort` uses the
constraint.

The set of constraints worth knowing by name:

| Constraint | Accepts |
| --- | --- |
| `any` | everything, so no operator and no comparison |
| `comparable` | anything usable with `==`, including structs and arrays |
| `cmp.Ordered` | anything with `<`, so the numbers and the strings |
| your own union | exactly what you list, with `~` for the underlying types |

## Comparing with comparable

```go
func Contains[T comparable](values []T, want T) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}

	return false
}
```

```text
true false
```

`comparable` is the built-in constraint that permits `==`, and it is the one that catches a mistake at the call site:

```go
type NotComparable struct {
	Items []int
}

Equal(NotComparable{}, NotComparable{})
```

```text
generics\main.go:75:19: NotComparable does not satisfy comparable
```

The message names the type and the constraint, and the reason is that a struct holding a slice cannot be compared with `==`.
That is the same rule as the maps lesson, enforced once at compile time rather than discovered at run time.

## Inference and explicit instantiation

```go
Sum([]int{1, 2, 3})
Sum[int]([]int{1, 2, 3})
```

Both compile. The explicit form is useful when the argument does not determine the type, which is the case for a function
whose parameter is a constraint rather than the type itself:

```go
func Zero[T any]() T {
	var zero T
	return zero
}

n := Zero[int]()
```

`Zero` cannot infer anything from a call with no arguments, so the type argument is required. That is the same as the
defaults lesson in the TypeScript course: inference first, an explicit argument when there is nothing to infer from.

An explicit type argument that does not satisfy the constraint is an error at the call site, with the constraint named.

## Where the type parameter goes

| Position | Example |
| --- | --- |
| A function | `func Map[T, U any](s []T, f func(T) U) []U` |
| A struct | `type Pair[K comparable, V any] struct` |
| A defined type | `type Slice[T any] []T` |
| An interface used as a constraint | `type Number interface { ~int \| ~float64 }` |
| A method | not allowed, which the next lessons cover |

The last row is the notable one: Go has no methods with their own type parameters. A generic type's methods can use the
receiver's parameters, and a function that needs its own is a plain generic function taking the value as an argument.

## Check yourself

Write a `Sum` and a `Max` with the two constraints in this lesson, then call each with an `int`, a `float64` and a defined
type over `int`. Then write a `Contains` with `comparable` and call it with a struct holding a slice to read the constraint
error.
