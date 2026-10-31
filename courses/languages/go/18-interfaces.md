---
title: Interfaces
summary: A set of methods, satisfied by having them, with nothing declared.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## An interface is a method set

```go
type Stringer interface {
	String() string
}

func use(s Stringer) string {
	return s.String()
}
```

An interface declares methods and nothing else. There is no field, no constructor, no implementation and no `implements`
keyword: a type satisfies the interface when it has the methods, and the compiler works that out from the method set.

```go
type Wide struct {
	Key string
}

func (w *Wide) String() string {
	return "wide " + w.Key
}

fmt.Println(use(&Wide{Key: "w"}))
```

```text
wide w
```

`*Wide` has a `String` method, so it is a `Stringer`, and the call compiles with nothing in the `Wide` declaration
mentioning `Stringer` at all. That is what makes an interface in Go a description of a requirement rather than a
classification of a type.

## The same interface can be satisfied by a distant type

```go
func describe(v any) string {
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
}

fmt.Println(describe("s"), describe(3), describe(wide), describe(3.5))
```

```text
string s int 3 stringer wide w other float64
```

`describe` needs no knowledge of `*Wide` and no import for it, because the method set is the contract. That is the property
that makes a test double free: any type with the right methods satisfies the interface, including one declared in the test
file.

The `default` arm was reached by the `float64`, which is a small reminder that a type switch checks its cases in order and
falls through to `default` for anything unmatched.

## Method sets decide the answer

```go
plain := Wide{Key: "w"}
fmt.Println(use(plain))
```

```text
ifaces\main.go:67:18: cannot use plain (variable of struct type Wide) as Stringer value
in argument to use: Wide does not implement Stringer (method String has pointer receiver)
```

The error is precise and the reason is worth reading twice. `String` has a pointer receiver, so it belongs to the method set
of `*Wide` and not to the method set of `Wide`. A value of type `Wide` therefore does not satisfy `Stringer`, and the
compiler says which method is the problem and why.

The rule that follows, and it is the one to take from this lesson:

| Interface holds | The type needs |
| --- | --- |
| a value | value-receiver methods only |
| a pointer | value-receiver and pointer-receiver methods |

So a type whose methods all have pointer receivers can be put in an interface only as a pointer. That is why a type with a
mutating method is passed as `*T` everywhere, and why a value receiver on a read-only method is the more flexible choice:
`T` and `*T` both satisfy the interface then.

## Method sets are the reason for the receiver convention

The convention that follows is:

- A method that mutates the receiver has a pointer receiver.
- A method that only reads it may use either, and a value receiver is the more permissive.
- A type should not mix the two on the same value, because the method set then differs by receiver and the interface
  satisfaction differs with it.

Mixing is legal and confusing: a struct with one pointer method and one value method is satisfiable as `*T` and not as `T`,
which means one of its methods is reachable through an interface and the other is not.

## The empty interface and any

```go
func log(v any) {
	fmt.Printf("%T: %v\n", v, v)
}
```

`any` is an alias for `interface{}`, an interface with no methods, so every type satisfies it. It is the type to use when a
function genuinely accepts anything, which in practice means `fmt`, a JSON encoder, a test assertion library and a container
such as `sync.Map`.

Each of those has the same problem in common: after storing a value as `any`, using it needs a type assertion, and the
compiler cannot check the assertion at the call site. That is the trade the generics chapter covers with the version that
keeps the type.

## Small interfaces are the point

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Closer interface {
	Close() error
}

type ReadCloser interface {
	Reader
	Closer
}
```

An interface with one or two methods can be satisfied by many types, which is why the standard library's most useful
interfaces are tiny. `io.Reader` is satisfied by a file, a network connection, a string reader, a gzip decompressor and a
test fixture, and every function taking an `io.Reader` works with all of them.

An interface with ten methods is satisfied by one type in practice, and the code around it is harder to test than if the
interface had not existed. The advice, which the patterns chapter builds on: prefer two small interfaces to one large one,
and declare the interface where it is used rather than next to the implementation.

## Where an interface is not needed

- **One implementation that will never have a second.** The interface is a name to keep in step.
- **A struct with methods and no polymorphism.** A concrete type is clearer and the compiler's errors name it.
- **A return type.** Returning an interface throws away the concrete type for every caller.
- **A dependency that is a value.** A `time.Time` or a `[]byte` needs no abstraction.

The reason this matters is that an interface hides the concrete type, and with it the methods that are not in the interface.
A function returning `io.Reader` gives its caller one method; a function returning `*os.File` gives it twenty.

## Check yourself

Declare an interface with one method and two types that satisfy it, one with a value receiver and one with a pointer
receiver. Pass a value and a pointer of each to a function taking the interface, and explain both errors. Then declare an
interface with two methods and embed it in a third.
