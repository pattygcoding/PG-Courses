---
title: The nil interface and type assertions
summary: Two kinds of nil, the assertion that panics, and the one that does not.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## A nil interface has no type

```go
var l Logger

fmt.Println(l == nil)
```

```text
true
```

An interface value holds a type and a value. Both are nil for an unset interface, which is why comparing it to `nil` is true
and why calling a method on it panics:

```text
panic: runtime error: invalid memory address or nil pointer dereference
```

There is no method to dispatch to, so the call destroys the program. That is a comparison a nil check can prevent, and it is
the reason a nil check on an interface before using it is not paranoia.

## A nil pointer inside an interface is not a nil interface

```go
var concrete *ConsoleLogger

l = concrete
fmt.Println(l == nil)
```

```text
false
```

That `false` is the trap. The interface holds the type `*ConsoleLogger` and the value `nil`, so the interface itself is not
nil and `l == nil` is false. A function that takes a `Logger` and checks `if l == nil` will not detect this, and the nil is
discovered at the point of use.

The follow-on is the part worth knowing, because it is not what most people expect:

```go
l.Log("called on a typed nil")
```

```text
nil receiver log: called on a typed nil
```

The method ran. A nil pointer in an interface has a method to dispatch to, so the call succeeds and the receiver is `nil`
inside the method. That is why a method that has to tolerate it checks its own receiver:

```go
func (c *ConsoleLogger) Log(msg string) {
	if c == nil {
		fmt.Println("nil receiver log:", msg)
		return
	}

	fmt.Println(c.Prefix, msg)
}
```

A nil check on the receiver is a legitimate design in Go and the standard library uses it, but it is a defensive measure
rather than a contract. The better answer is to return `nil` rather than a typed nil from a function, which is the rule from
the errors lesson:

```go
func newLogger() Logger {
	var l *ConsoleLogger

	if !enabled {
		return nil        // not "return l"
	}

	return l
}
```

## An assertion panics, the comma-ok form does not

```go
any2 := any("s")

s, ok := any2.(string)
fmt.Println(s, ok)

n, ok := any2.(int)
fmt.Println(n, ok)
```

```text
s true
0 false
```

The two-value form never panics: a failed assertion gives the zero value of the target type and `false`. The single-value
form panics instead:

```go
fmt.Println(any2.(int))
```

```text
panic: interface conversion: interface {} is string, not int
```

The message names the dynamic type and the requested type, which is what makes it diagnosable. The rule is simple: use the
comma-ok form unless a failure means a bug, and where a failure does mean a bug, a `panic` with a better message is clearer
than the runtime's.

## Asserting to an interface

```go
str, ok := l2.(fmt.Stringer)
fmt.Println(str, ok)
```

```text
<nil> false
```

An assertion to an interface checks the method set rather than a concrete type, so it asks the question "does this value
satisfy `Stringer`" at run time. That is how a `String` method is used when it is there and skipped when it is not, which is
what `fmt` does internally.

The compiler catches the case where the assertion is impossible:

```go
s.(*Row)
```

```text
impossible type assertion: s.(*Row)
	*Row does not implement Stringer (missing method String)
```

That is a compile error, because the interface's method set is known and the target's method set is known. It is a free check
that catches a surprising number of mistakes, and it is worth reading rather than working around.

## The type switch

```go
switch t := v.(type) {
case string:
	return "string " + t
case int:
	return fmt.Sprint("int ", t)
case Stringer:
	return "stringer " + t.String()
default:
	return fmt.Sprintf("other %T", t)
}
```

A type switch is a series of assertions with each case's variable already narrowed to the case's type. `case nil` is legal
and matches an interface that is nil in both parts. Cases are checked in order, so a concrete type before an interface is
important: `case Stringer` above a `case *Wide` would swallow the `*Wide`.

The same ordering rule applies to `errors.As`, which is a type switch that walks a chain.

## Which to use

| Situation | Tool |
| --- | --- |
| A concrete type is expected and its absence is a bug | `v.(T)` |
| A concrete type may or may not be there | `v, ok := v.(T)` |
| Several types, each handled differently | a type switch |
| An error in a chain | `errors.Is`, `errors.As` |
| Any type, and the value is only formatted | `fmt` with the `any` |

The last row is worth noting: passing a value as `any` to `fmt`, a JSON encoder or a logger needs no assertion, because
those use reflection. An assertion is what you write when the program has to do something type-specific with the value.

## Check yourself

Declare an interface and a type with a pointer method, assign a nil pointer to the interface and compare it with `nil`. Then
call a method on it from inside the type's own nil check. Finish by asserting a string held as `any` to `string` and to
`int`, in both the single and two-value forms.
