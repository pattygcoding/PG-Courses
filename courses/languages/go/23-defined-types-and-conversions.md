---
title: Defined types and conversions
summary: A new type with the same underlying type, the conversion it needs, and the constant that does not.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## A defined type is a new type

```go
type Celsius float64

func (c Celsius) F() float64 {
	return float64(c)*9/5 + 32
}
```

`Celsius` has `float64` as its underlying type and it is a distinct type: it has its own zero value, it can have its own
methods, and a `float64` is not assignable to it.

```go
var c Celsius = 100
var f float64 = 100

f = c
```

```text
defined\main.go:25:6: cannot use c (variable of float64 type Celsius) as float64 value
in assignment
```

The message names both types, which is how you can tell a defined type from its underlying one. The conversion is explicit:

```go
fmt.Println(c.F(), c, float64(c))
```

```text
212 100 100
```

## An untyped constant converts itself

```go
fmt.Println(c == 100, 100 == c)
```

```text
true true
```

A defined numeric type compares equal to an untyped constant, and the same constant is assignable without a conversion:

```go
const boiling = 100

var c2 Celsius = boiling
```

```text
100
```

That is the difference between a constant and a variable, and it is why `var c2 Celsius = boiling` compiles while
`var c2 Celsius = f` does not. A constant is untyped until something gives it a type, so it takes the type of the context.
Arithmetic follows the same rule:

```go
fmt.Println(c + 5, float64(c) + f)
```

```text
105 200
```

`c + 5` is a `Celsius`, because the untyped constant took that type. `float64(c) + f` needed the conversion because `f` is a
typed `float64`.

## A type alias is the same type

```go
type Alias = Celsius

var a Alias = c
fmt.Println(a == c)
```

```text
true
```

The `=` makes a type alias: `Alias` and `Celsius` are two names for one type, so no conversion is needed and a method
declared on either is a method on both. Without the `=` it is a new type and every conversion is required.

The distinction matters for a migration: `type UserID = int64` lets old and new code interoperate, while
`type UserID int64` creates a type that needs conversions at every boundary. The first is for a rename and the second is for
the safety, and only the second is worth having in a new API.

## A defined type is how a method gets a home

```go
type Table string

func (t Table) Qualified() string {
	return "public." + string(t)
}
```

```text
public.rows rows 4
```

A method cannot be declared on `string`, so the defined type is the way to add one. `Table` is a `string` for storage and
conversion purposes, which `string(t)` and `len(t)` confirm, and it has a method, which `string` does not.

That is the reason a Go codebase is full of `type UserID int64`, `type Level int`, `type Table string` and
`type Handler func(...)`: each one is a place to hang a method, a place to document a meaning, and a place to stop one kind
of string being passed where another is expected.

## A defined type does not print as its name

```go
type Level int

const (
	Quiet Level = iota
	Loud
)

var l Level = Loud
fmt.Println(l, int(l), l == Loud)
```

```text
1 1 true
```

`Loud` prints as `1`, because a defined type with an integer underlying type has no `String` method and `fmt` falls back to
the number. The name exists only in the source. The fix is a `String` method, which is worth writing for any type used as an
enum:

```go
func (l Level) String() string {
	switch l {
	case Quiet:
		return "quiet"
	case Loud:
		return "loud"
	}

	return fmt.Sprintf("Level(%d)", int(l))
}
```

The `default` arm matters: without it, a value constructed from an out-of-range integer prints as `quiet` or as an empty
string depending on the switch, and a log line lies. The `Level(%d)` form is the convention for an unknown value and
`fmt`'s own handling of an unknown verb.

## A defined function type is how a function gets a method

```go
type Handler func(string) error

func (h Handler) Run(s string) error {
	return h(s)
}
```

That is the pattern behind `http.HandlerFunc` and `sort.Slice`, and it is the way to attach a method to a function's
signature. The conversion `Handler(f)` is what turns a plain function into the type, and calling it as a function still works
because the underlying type is a function type.

```go
var h Handler = func(s string) error { return nil }

h("x")      // calling the function
h.Run("x")  // calling the method, which calls the function
```

Both compile. That is the whole trick of the adapter pattern: a named function type with a method that calls itself.

## Where a defined type earns its place

- **A name for a meaning.** `type Table string` says which string it is.
- **A place for methods.** `String`, `Valid`, `MarshalJSON`.
- **A boundary the compiler enforces.** `type UserID int64` stops an order id being passed where a user id is expected.
- **An enum.** A defined integer type with constants and a `String` method.
- **A function signature with a method.** `Handler`, `Middleware`, `RoundTripper`.

Where it does not: a defined type with no method and no boundary to enforce is a conversion at every use and a name that says
nothing. `type Config map[string]string` is the shape to be suspicious of, because it is a `map[string]string` with extra
friction.

## Check yourself

Define a `Celsius` type with a `F` method, assign a `float64` variable to it and read the error, then assign an untyped
constant and confirm it compiles. Add a `type Alias = Celsius` and compare the two spellings, then define a function type
with a method and call both forms.
