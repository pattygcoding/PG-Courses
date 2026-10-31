---
title: Methods and receivers
summary: The receiver is a parameter, and whether it is a value or a pointer decides what the method can do.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## A method is a function with a receiver

```go
type Row struct {
	Key   string
	Value int
}

func (r Row) Label() string {
	return "row " + r.Key
}

func (r *Row) Set(v int) {
	r.Value = v
}

row := Row{Key: "a"}
fmt.Println(row.Label())
```

```text
row a
```

The receiver is written before the name and it is an ordinary parameter that happens to be passed with a dot at the call
site. `func (r Row) Label()` is `func Label(r Row) string` with a different syntax, and nothing else about it is special.

## A pointer receiver mutates, a value receiver does not

```go
pointer := &Row{Key: "a"}
pointer.Set(5)
fmt.Println(pointer.Value)

row.Set(7)
fmt.Println(row.Value)
```

```text
5
7
```

The second call worked on a value, which is worth explaining. `row` is an addressable variable, so `row.Set(7)` is
shorthand for `(&row).Set(7)`: the compiler takes the address automatically. The same call on a value that is not
addressable does not compile:

```go
Row{Key: "a"}.Set(7)
```

```text
cannot call pointer method Set on Row
```

The value returned by a function call is an example of the same thing. `newRow().Set(7)` compiles only when `newRow`
returns `*Row`.

So a pointer-receiver method can be called in three ways: on a pointer, on an addressable value, and inside the type's own
methods on `r` when `r` is a pointer. What it cannot do is change a copy, which is what a value receiver gets.

## Value receivers get a copy

```go
func (r Row) Bump() int {
	r.Value++
	return r.Value
}

row := Row{Value: 1}
fmt.Println(row.Bump(), row.Value)
```

```text
2 1
```

`Bump` incremented the copy and returned 2, and the caller's `row` still holds 1. A value-receiver method that looks like a
mutation is the most common Go bug found in review, and the compiler says nothing because the code is legal.

The rule: a method with a value receiver cannot change the receiver in a way the caller sees, and a method that needs to
cannot have a value receiver.

## Which receiver to write

| Method | Receiver |
| --- | --- |
| Changes the receiver, or contains a lock, or is large | pointer |
| Reads only, and the type is small and immutable | value |
| On a type whose other methods are pointers | pointer, for consistency |
| On a type that is a map, slice, channel or function | value, because it already refers to something |

The last row is the subtle one: a struct wrapping a map needs no pointer receiver to change the map, because the map
descriptor is the thing that points. A `sync.Mutex` in the struct is the case that forces a pointer receiver even on
read-only methods, and `go vet`'s `copylocks` check reports a value receiver on a type containing one.

Mixing the two on one type is legal and confusing, because the method set differs by receiver and the interface satisfaction
follows. Pick one and treat it as part of the type's design.

## The method set, again

```go
type Stringer interface {
	String() string
}

var s Stringer = &Wide{Key: "w"}
fmt.Println(s.String())
```

```text
wide w
```

The rule from the interfaces lesson, stated as a table because it is the thing to remember:

| Value | Method set |
| --- | --- |
| `T` | the value-receiver methods |
| `*T` | the value-receiver and pointer-receiver methods |

A pointer's method set includes the value methods because Go dereferences automatically, so `*T` satisfies every interface
`T` does. The reverse is not true, which is why the error message says "method String has pointer receiver".

## Methods on a defined type from another package do not compile

```go
func (t time.Time) Yesterday() time.Time { }
```

```text
cannot define new methods on non-local type time.Time
```

A method can only be declared in the same package as the type, so a method on `time.Time`, `string` or any type from a
dependency is not possible. The fixes are a wrapper type or a function:

```go
type Clock struct {
	now func() time.Time
}

func (c Clock) Yesterday() time.Time {
	return c.now().AddDate(0, 0, -1)
}
```

That wrapper is also the answer for the built-in types, and it is the reason a codebase has a `type UserID int64` rather
than methods on an integer.

## Methods are a design decision

```go
func (s *Store) Find(key string) (*Row, error)
```

A method says the value is an argument that belongs first, and that choice shows at the call site: `store.Find(key)` reads
as an operation on a store, while `Find(store, key)` reads as a function that happens to take a store. The receiver is the
thing the method is about, and a function that does not need it should not have an interface to fake one.

The pitfall is over-methoding: a method that does not use its receiver, or that uses only one field of it, is usually a
function. The compiler will not say so. The question worth asking in review is whether the receiver is genuinely the subject.

## Check yourself

Write a type with one value-receiver method and one pointer-receiver method, then call the pointer method on a variable, on
a pointer, and on a literal. Explain which two compile. Then try to declare a method on `string` and write the wrapper type
instead.
