---
title: Constraints and type sets
summary: The tilde, the union, and why a defined type does not satisfy the constraint you expected.
chapter: Generics
minutes: 13
status: draft
---

## A constraint is a set of types

```go
type Number interface {
	~int | ~float64
}
```

An interface used as a constraint describes a set of types rather than a set of methods. `~int` is the set of types whose
underlying type is `int`, and `|` is a union of sets, so `Number` is "an `int`, a `float64`, or anything whose underlying
type is one of those".

The `~` is what makes the constraint useful and it is the detail everyone gets wrong the first time:

```go
type Level int

type Strict interface {
	int
}

func Use[T Strict](v T) { }

Use(Level(1))
```

```text
Level does not satisfy Strict (possibly missing ~ for int in Strict)
```

That message is the best error in the language. Without the tilde the constraint lists `int` exactly, so a defined type over
`int` is not in the set, and the compiler says which tilde is missing and where to put it. With `~int`, `Level` satisfies
the constraint.

## What a type set allows

```go
type Float interface {
	~float64
}

func Average[T Float](values []T) T {
	var total T

	for _, v := range values {
		total += v
	}

	return total / T(len(values))
}
```

`+=` and `/` work because every type in the set supports them. What does not work is anything the set does not have in
common:

```go
func Bad[T Number](v T) string {
	return v.String()
}
```

```text
v.String undefined (type T has no field or method String)
```

The constraint is the contract, so a body can only use what the set guarantees. A type parameter is not an interface value:
there is no dynamic dispatch and no type assertion on `T` without a conversion.

## A method constraint

```go
type Stringer interface {
	String() string
}

func Describe[T Stringer](v T) string {
	return v.String()
}
```

A constraint with a method makes `String()` callable, which is the case where the constraint looks like an ordinary
interface. The two are the same syntax and different jobs: an interface is a value's type, a constraint is a bound on a type
parameter, and a constraint with a union in it cannot be used as a value's type at all.

```go
var x Stringer       // fine
var y Number         // cannot use type Number outside a type constraint
```

```text
cannot use type Number outside a type constraint: interface contains type constraints
```

The compiler refuses because `Number` includes `int` and `float64` and there is no single representation for a value of
either. A type set describes what a type parameter may be, and a variable needs a type that a value can actually have.

## The union needs a tilde for defined types

```go
type Signed interface {
	~int | ~int8 | ~int16 | ~int32 | ~int64
}

type Unsigned interface {
	~uint | ~uint8 | ~uint16 | ~uint32 | ~uint64
}

type Integer interface {
	Signed | Unsigned
}

type Ordered interface {
	Integer | ~float32 | ~float64 | ~string
}
```

A constraint can embed another constraint, and a union can be built from named constraints as well as from `~` clauses.
Those four are the useful ones to have in a package, and they mirror what `cmp.Ordered` provides.

Writing the whole list is the trade: `cmp.Ordered` is shorter and covers what most code needs, while a narrower set
documents what the function actually requires and rejects a type that would not work.

## comparable is special

```go
func Index[T comparable](values []T, want T) int {
	for i, v := range values {
		if v == want {
			return i
		}
	}

	return -1
}
```

`comparable` is built in rather than composed from a union, because "types that support `==`" is not expressible as a list:
a struct is comparable when all its fields are, which is a rule about structure rather than membership of a set.

It has one subtlety worth knowing. A constraint of `comparable` makes `==` legal, and the compiler accepts any type whose
underlying comparison is valid. An interface type satisfies `comparable` while holding a value that might not, which is the
case where an `any` in a map key can panic at run time. That is the one hole in the constraint, and the reason a generic
container keyed by `T` is not quite as safe as it looks.

## Constraints from the standard library

| Constraint | Where | Accepts |
| --- | --- | --- |
| `any` | built in | everything |
| `comparable` | built in | `==` is legal, at compile time |
| `cmp.Ordered` | `cmp` | `<` is legal, so numbers and strings |
| `io.Writer` | `io` | a method set, usable as a value's type too |

`cmp.Ordered` is an ordinary interface in the `cmp` package that also happens to be a usable constraint, which is why a
function can take it as a constraint and a variable can be of type `io.Writer` but not of type `cmp.Ordered`.

That distinction, between a constraint and a type, is the thing to take from the last two lessons: an interface with only
methods is both, and an interface with a union or a tilde is only a constraint.

## Check yourself

Write `~int | ~string` without the tildes, pass a defined type over `int` and read the error, then add the tildes and
confirm it compiles. Then write a constraint with a method and one with a union, and try to use each as a variable's type to
see which is rejected.
