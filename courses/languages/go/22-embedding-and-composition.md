---
title: Embedding and composition
summary: One struct inside another, the methods that come with it, and the name collision rule.
chapter: Interfaces and composition
minutes: 13
status: draft
---

## An embedded field is a field with no name

```go
type Base struct {
	ID string
}

func (b Base) Describe() string {
	return "base " + b.ID
}

type Row struct {
	Base
	Key string
}
```

`Base` is embedded rather than named, so its fields and methods are promoted to `Row`: `row.ID` and `row.Describe()` work as
if they were declared on `Row`. The field is still there under the type's name, so `row.Base.ID` is the same value.

```go
row := Row{Base: Base{ID: "1"}, Key: "k"}

fmt.Println(row.ID, row.Key, row.Describe(), row.Base.ID)
```

```text
1 k base 1 1
```

That is composition with a shorter call syntax, and it is the closest thing Go has to inheritance. There is no `extends`, no
subclass and no `super`, and the promoted method does not know it is being called through anything: `Describe` receives the
`Base` value and nothing else.

## Promotion happens at the shallowest depth

```go
type Inner struct {
	Name string
}

type Outer struct {
	Inner
	Name string
}

o := Outer{Inner: Inner{Name: "inner"}, Name: "outer"}
fmt.Println(o.Name, o.Inner.Name)
```

```text
outer inner
```

The field at depth 0 wins over the one at depth 1, so `o.Name` is the outer field and `o.Inner.Name` is the inner one. The
inner field is not hidden from the type system, only from the shorthand.

Two fields at the same depth are ambiguous, and the compiler makes you say which you mean:

```go
fmt.Println(c.Name)
```

```text
ambiguous selector c.Name
```

That is a useful error rather than a subtle one, and it is the reason embedding two types with a method of the same name is
worth avoiding: the method is then available on neither through the shorthand.

## Embedding an interface

```go
type Logger interface {
	Log(msg string)
}

type Service struct {
	Logger
	Name string
}
```

The embedded interface promotes its methods, so `Service` satisfies `Logger` and `s.Log("x")` calls the interface's method.
The field is nil until something sets it, so this is the shape for a struct whose dependency is injected:

```go
svc := Service{Logger: &ConsoleLogger{}, Name: "s"}
```

The hazard is the nil interface: `Service{}` satisfies `Logger` as far as the compiler is concerned, and calling `Log` on it
panics. A named field is safer, because the zero value is visible at the use site rather than hidden behind promotion:

```go
type Service struct {
	logger Logger
	Name   string
}
```

The embedded form is worth it where the type genuinely is a logger with extras, and the named form is worth it where the
logger is a dependency. In practice that means the named form more often.

## Embedding a pointer

```go
type Counter struct {
	n int
}

func (c *Counter) Inc() { c.n++ }

type Wrapped struct {
	*Counter
	Label string
}
```

Embedding `*Counter` promotes the same way and the field is nil until it is set. It also promotes the pointer methods to the
value type, which the value alone does not have:

```go
w := Wrapped{Counter: &Counter{}, Label: "l"}
w.Inc()
fmt.Println(w.n, w.Counter.n, w.Label)
```

```text
1 1 l
```

`Wrapped` has an `Inc` method because the embedded `*Counter` does, and the count is reachable as `w.n` and as
`w.Counter.n`. That is the table from the methods lesson applied to embedding:

| Embedded | `Outer` gets | `*Outer` gets |
| --- | --- | --- |
| `T` | `T`'s value methods | all of `T`'s and `*T`'s methods |
| `*T` | all of `*T`'s methods | all of `*T`'s methods |

The reason to embed a pointer is usually to share one instance rather than copy it. If several `Wrapped` values should refer
to the same `Counter`, embed the pointer; if each should have its own, embed the value. The cost is a nil field, and a nil
embedded pointer turns into the same panic an embedded nil interface does.

## Where embedding is right

- **A shared base with a few fields.** An `ID` and a `CreatedAt` on every table type.
- **A mixin with methods.** An embedded `sync.Mutex` gives the type two new methods, to take the lock and to release it.
- **A decorator that forwards everything.** An embedded interface plus overrides for the methods that matter.
- **A wrapper that adds one method.** An embedded value plus the new method.

The `sync.Mutex` case is the most common and the one to be careful with, because an embedded mutex is part of the exported
API: the two lock methods become methods of your type and any caller can use them. A named field keeps them private:

```go
type Counter struct {
	mu sync.Mutex
	n  int
}
```

That is the version I write. The argument for it is that the exported API of a type should be the operations the type
supports rather than the machinery it uses, and an exported method that releases the lock is a way for a caller to break it.

## Where embedding is wrong

- **To model a subtype relationship.** Embedding does not create one: a function taking a `Base` does not accept a `Row`, and a
  `[]Base` cannot hold `Row` values.
- **To reuse three methods from an unrelated type.** That is hiding a package boundary, and the field should be named.
- **Two types with overlapping methods.** The ambiguity is a compile error at the use site rather than at the declaration.
- **An embedded interface in a struct with a constructor.** Nothing enforces that the constructor fills it.

The distinction to hold on to: embedding is for the case where the outer type genuinely has the inner one, and a named field
is for the case where it uses it. A `Row` has a `Base`; a `Service` uses a `Logger`.

## Check yourself

Embed a struct with two fields and a method in another struct with one field, then call the promoted method and read both
fields through the shorthand and through the field name. Add a second embedded type with a field of the same name and read
the ambiguity error. Finally embed an interface, call a promoted method on the zero value, and explain the panic.
