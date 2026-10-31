---
title: Structs and literals
summary: Named fields, the zero value of a struct, and what a field tag does.
chapter: Types and values
minutes: 13
status: draft
---

## A struct is a named bundle of fields

```go
type Row struct {
	Key   string
	Value int
	Name  string
}
```

A struct is a value, so assigning one copies it and passing one to a function copies it. That is the same rule as an
array, and it is the reason a struct holding a slice or a map copies the descriptor and shares the data it points at.

```go
row := Row{Key: "a", Value: 1}
positional := Row{"b", 2, "b"}
partial := Row{Key: "c"}
var zero Row
```

Three literals and a declaration. `Row{Key: "a", Value: 1}` names the fields it sets and leaves `Name` at its zero value.
`Row{"b", 2, "b"}` sets them by position, which is shorter and which breaks the day somebody inserts a field:

```text
structs\main.go:30:26: too few values in struct literal of type Row
```

That error is why named fields are the convention, and `go vet` reports the positional form when the struct belongs to
another package:

```text
unkeyed\check.go:9:6: strconv.NumError struct literal uses unkeyed fields
```

Both messages are worth recognising, because a positional literal in a vendored type or a dependency is a real hazard and
vet catches only the imported case.

`var zero Row` is a struct of zero values, which is usable immediately. There is no constructor to call and no initialiser
to forget, and the only field that is not usable is a map or a pointer, which is `nil` until something sets it.

## Printing a struct

```go
fmt.Println(row)
fmt.Printf("%+v\n", partial)
```

```text
a:1
c:0
```

That output is not the default `{a 1}` and `{Key:c Value:0 Name:}`, because the type has a `String` method:

```go
func (r Row) String() string {
	return r.Key + ":" + fmt.Sprint(r.Value)
}
```

A type with `String() string` satisfies `fmt.Stringer`, and both `%v` and `%+v` call it. `%#v` does not, which is the one
to reach for when you want the field names back while debugging a type with a `String` method.

That is a deliberate feature and a real trap: adding a `String` method changes the output of every `Println` of that type
in the program, including in a library that was formatting it as a struct.

## Field tags are read by reflection

```go
type Named struct {
	Name string `json:"name"`
	TTL  int    `json:"ttl,omitempty"`
}
```

```go
out, _ := json.Marshal(Named{Name: "x"})
fmt.Println(string(out))

out2, _ := json.Marshal(Named{Name: "x", TTL: 5})
fmt.Println(string(out2))
```

```text
{"name":"x"}
{"name":"x","ttl":5}
```

A tag is a string in backquotes with a conventional structure that `encoding/json` and other encoders read with
reflection. The Go compiler ignores a tag completely: a misspelled key has no effect at all, and a tag that is not a
struct tag is not validated. That is why `go vet` has a check for a malformed tag, and why a tag is worth reading twice.

`omitempty` drops a zero value, which is the reason a zero `TTL` is absent from the first document. The rule applies to an
empty string, a zero number, `false`, `nil` and a zero-length slice or map, so a field where zero is meaningful needs
`*int` or a sentinel instead.

## Comparison and equality

```go
fmt.Println(Row{Key: "a"} == Row{Key: "a"})
```

```text
true
```

Structs are comparable with `==` when every field is comparable, which compares field by field. A struct holding a slice,
a map or a function is not comparable and `==` is a compile error rather than a comparison that always fails.

That makes a struct a valid map key, which is the reason a composite key is a struct rather than a joined string:

```go
type Address struct {
	Host string
	Port int
}

cache := map[Address]Response{}
```

## Anonymous structs

```go
row := struct {
	Key string
	Value int
}{Key: "a", Value: 1}
```

A struct type can be written without a name, which is useful in a table test where a type would be used once:

```go
tests := []struct {
	name string
	in   string
	want int
}{
	{name: "empty", in: "", want: 0},
	{name: "one", in: "a", want: 1},
}
```

That is the standard way to write a table test in Go, and the struct's fields are unexported so nothing outside the
function can construct one. The other use is decoding a JSON response with a shape that only matters in one place, which
the JSON lesson covers.

A named type is better as soon as the value is passed to another function, because an anonymous type cannot be named in a
signature without writing the whole shape out again.

## Padding and size

```go
fmt.Println(unsafe.Sizeof(Row{}))
```

A struct's fields are laid out in order with padding inserted to satisfy each field's alignment, so field order affects the
size. `unsafe.Sizeof` reports it and the layout is a performance topic rather than a correctness one; the same struct in a
different order can be smaller, and a slice of ten million of them is where that matters.

The one correctness rule is that a field's address and the struct's beginning are aligned, which is what makes a `struct`
holding a `sync.Mutex` work. `go vet`'s `copylocks` check reports a struct that contains a lock being copied, because a
copy of a mutex is a second mutex rather than the same one.

## Check yourself

Declare a struct with three fields and construct it with named fields, with positional fields and with none. Then add a
fourth field and read the errors in both literal forms. Print a struct with `%v`, `%+v` and `%#v` before and after adding
a `String` method.
