---
title: Pointers
summary: An address you can pass around, the automatic dereference, and the nil that panics.
chapter: Types and values
minutes: 13
status: draft
---

## Taking an address and following it

```go
row := Row{Key: "a", Value: 1}
p := &row

p.Value = 10
fmt.Println(row.Value, (*p).Value, p.Key)
```

```text
10 10 a
```

`&row` is a pointer to `row` and `*p` is the value it points at. `p.Value` is the same as `(*p).Value`, because Go
dereferences automatically for a field access, and `p.Key` works the same way. The two forms are interchangeable, and
`p.Key` is the one to write.

A pointer in Go holds an address and nothing else. There is no arithmetic on it, no casting to an integer, and no way to
walk off the end of an allocation, which is the specific unsafety Go removed while keeping the ability to share a value.

## Why a pointer: to change the caller's value

```go
func mutate(r *Row) {
	r.Value++
}

func shallow(r Row) {
	r.Value++
}

row := Row{Value: 1}
mutate(&row)
shallow(row)
fmt.Println(row.Value)
```

```text
2
```

`shallow` received a copy of the struct and incremented the copy, which the caller never sees. `mutate` received the
address and changed the caller's struct. That is the whole reason a function or method takes a pointer, and it is the
subject of the next chapter's receiver decision.

A slice or a map argument is already a reference in this sense: its descriptor is copied and the data behind it is shared,
so a function can fill a map argument or change an element of a slice argument with no pointer involved. A struct is the
case where a pointer is what makes the change visible.

## Why a pointer: to avoid a copy

```go
func process(r *Row) { }
```

Copying a large struct on every call is a real cost in a hot loop, and a pointer avoids it. My rule: a struct of a few
small fields is passed by value, and a struct that is large, or that is already referred to by a pointer elsewhere, is
passed by pointer. The compiler's escape analysis may keep a pointer's target on the stack, and the profiling lesson
covers how to check what it decided.

## The zero value is nil

```go
q := new(Row)
fmt.Println(*q, q == nil)
```

```text
{ 0} false
```

`new(Row)` allocates a zeroed `Row` and returns a pointer to it, which is the same as `&Row{}` and slightly more explicit
about the value being empty. Pointers have one zero value, `nil`, and a nil pointer is a real state rather than an error: a
field that has not been set, a linked list terminator, a tree with no children.

## Equality is address equality

```go
other := &row
fmt.Println(other == p)
fmt.Println(new(Row) == new(Row))
```

```text
true
false
```

Two pointers are equal when they hold the same address, so a second pointer to the same variable compares equal and two
separate allocations do not. Comparing pointers is a comparison of identity, which is what you want for a cache keyed by
node and not what you want for two structs with the same contents. `Row{Key: "a"} == Row{Key: "a"}` compares the fields and
is the contents comparison.

## A nil pointer panics when it is followed

```go
var nilPtr *Row
fmt.Println(nilPtr == nil)
fmt.Println(nilPtr.Key)
```

```text
true
panic: runtime error: invalid memory address or nil pointer dereference
```

Comparing a nil pointer is fine; reading through it is a runtime panic with that message, a stack trace naming the line, and
a non-zero exit status unless something recovers. The panic lesson covers the recovery side.

The interesting part is that a nil pointer is rarely where the bug is. `p.Key` panicked because `p` was never set, which
usually means a constructor returned nil somewhere else, and the stack trace is the thread that leads back to it. That is
why the panic message names the line of the dereference rather than the line of the mistake.

## Pointers into a slice

```go
s := []int{1}
first := &s[0]
*first = 9
fmt.Println(s)
```

```text
[9]
```

An element of a slice is addressable, so a pointer to one is legal and a write through it changes the slice. The address
stays valid until the slice is reallocated, which an `append` can do, so a set of pointers collected from a slice's
elements is a way to end up pointing at an old array. That is a real bug and the language does not prevent it.

What is not addressable: the result of a function call, a constant, a map element, and the value inside an interface without
an assertion. `&m["a"]` is a compile error, for the same reason that assigning to a struct field in a map is.

## Pointers in a signature are an API decision

```go
func find(key string) (*Row, error)
func count(key string) int
```

A `*Row` return carries three possible meanings that are easy to mix up: the value, absence, and an error. `(*Row, error)`
says both "there may be nothing" and "there may be a failure", which is why Go code often returns a zero value with a
sentinel error instead, or an explicit `(Row, bool)`.

A `*int` parameter is the clearest case of a pointer as a design choice: it says the argument is optional, because `nil` is
a value the field can hold. Where every caller must supply the number, an `int` parameter is simpler and cannot be
forgotten. That is why a config struct with `*int` fields for the optional ones is a recognisable Go shape.

## Pointers and the garbage collector

```go
func makeRow() *Row {
	return &Row{Key: "a"}
}
```

Returning a pointer to a local is correct in Go, and it is one of the ways Go differs from C. The compiler's escape analysis
decides whether the value lives on the stack or the heap, and a value whose address is returned escapes to the heap. The
programmer does not decide and does not have to, at the cost of an allocation per call that the profiling lesson teaches you
to find.

The sentence to remember: a pointer in Go is always safe to hold and never a dangling reference. That guarantee is what the
garbage collector bought.

## When not to use a pointer

- A small struct, where the copy costs less than the indirection.
- A value that should not be shared, where the copy is the isolation you want.
- A slice, a map, a channel, a function or an interface, all of which already refer to something.
- A string, which is immutable and small.

The rule that matters more than the performance: do not put a pointer in a struct field to avoid a copy, because the
zero value of that field is then `nil` and every read needs a check. A value field cannot be nil, which is one fewer state
to reason about. A nil check is cheap and it is not free, and it is a state that has to be handled somewhere.

## Check yourself

Write a function taking a struct by value and another taking a pointer, call both with the same variable, and record which
change is visible. Then dereference a nil pointer and read the panic, and use `new(Row)` to make a pointer to a zeroed
struct.
