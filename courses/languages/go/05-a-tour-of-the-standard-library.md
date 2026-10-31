---
title: A tour of the standard library
summary: The packages a Go program reaches for first, and the output of each one.
chapter: Getting started
minutes: 13
status: draft
---

## fmt prints and formats

```go
type Row struct {
	Key   string
	Value int
}

row := Row{Key: "a", Value: 1}
fmt.Printf("%v\n", row)
fmt.Printf("%+v\n", row)
fmt.Printf("%#v\n", row)
fmt.Printf("%q\n", row.Key)
fmt.Printf("%T\n", row)
```

```text
{a 1}
{Key:a Value:1}
main.Row{Key:"a", Value:1}
"a"
main.Row
```

`%v` is the default rendering, `%+v` adds the field names to a struct, `%#v` prints Go syntax that would recreate the
value, `%q` quotes a string and `%T` prints the type. Those five cover almost everything you print while debugging, and
`%+v` is the one I reach for first on a struct.

```go
fmt.Println(3, "a", 1.5)
fmt.Sprintf("%d-%s", 3, "a")
```

`Println` puts spaces between its arguments and a newline at the end, using `%v` for each. `Sprintf` returns a string rather
than printing it, `Fprintf` writes to an `io.Writer`, and `Errorf` builds an `error` from a format string. Those four are
the family, and the suffixed versions are the ones to use in library code because they write to somewhere the caller chose.

## Zero values are printable and usable

```go
var nilSlice []int
var nilMap map[string]int
var nilPtr *Row
var nilErr error

fmt.Println(nilSlice, nilMap, nilPtr, nilErr)
fmt.Println(len(nilSlice), len(nilMap))
```

```text
[] map[] <nil> <nil>
0 0
```

An uninitialised slice, map, pointer and interface each print as something sensible, and `len` works on a nil slice and a
nil map because both are defined to have length zero. That is the zero value rule paying off: a field or a parameter left
alone is usable for reading, and only a write to a nil map panics.

Appending to a nil slice is fine, which is why a function that builds a slice starts with `var out []T` and appends to it.

## strconv converts between strings and numbers

```go
n, err := strconv.Atoi("42")
fmt.Println(n, err)

_, err = strconv.Atoi("4x")
fmt.Println(err)
```

```text
42 <nil>
strconv.Atoi: parsing "4x": invalid syntax
```

`Atoi` returns an error rather than panicking, and the error names the function, the input and the reason, which is a good
model for your own errors. `Atoi` and `Itoa` are the `int` pair, and `ParseInt`, `ParseFloat`, `ParseBool` and
`FormatFloat` cover the rest. `strconv.Quote` prints a string with its escapes visible.

There is no overloaded conversion, so `string(65)` is not `"65"`:

```text
strconvconv\main.go:7:14: conversion from int to string yields a string of one rune,
not a string of digits
```

That is `go vet` reporting it, and the program prints `A` rather than `65`. `strconv.Itoa(65)` is the one you meant, and
this is the most useful thing in the vet suite after the format checks.


## strings and strings.Builder

```go
var b strings.Builder
b.WriteString("a")
b.WriteString("b")
fmt.Println(b.String(), b.Len())

parts := strings.Fields("  a   b  ")
fmt.Println(parts, len(parts), strings.Join(parts, "-"))
```

```text
ab 2
[a b] 2 a-b
```

`strings.Builder` accumulates a string without the repeated copying that `+=` on a string does, and it satisfies
`io.Writer`, so a function that writes to a writer can write into one. For a single join, `strings.Join` is simpler; the
builder is for a loop.

The rest of the package is a familiar list: `Contains`, `HasPrefix`, `TrimSpace`, `Split`, `ReplaceAll`, `ToUpper` and
`Repeat`. `strings.Cut` is worth looking up because it replaces the `SplitN` plus index arithmetic that the same job
otherwise needs: it returns the part before, the part after and whether the separator was found.

## slices and maps

```go
nums := []int{3, 1, 2}
slices.Sort(nums)
fmt.Println(nums, slices.Contains(nums, 2), slices.Max(nums))

ages := map[string]int{"a": 1, "b": 2}
fmt.Println(slices.Sorted(maps.Keys(ages)))
```

```text
[1 2 3] true 3
[a b]
```

`slices` and `maps` arrived in Go 1.21 and they are generic, so they work on any element type: `Sort`, `Contains`, `Index`,
`Max`, `Min`, `Reverse`, `Clone`, `Compact` and `BinarySearch` on one side, and `Keys`, `Values`, `Equal`, `Clone` and
`Collect` on the other.

`maps.Keys` returns an iterator rather than a slice, which is why `slices.Sorted` and `slices.Collect` are the functions
that turn one into the other. Map iteration order in Go is deliberately randomised, so a program that ranges over a map
prints its keys differently on each run; sorting them is the fix and `slices.Sorted` is the short way to write it.

## time

```go
fmt.Println(90 * time.Second)
```

```text
1m30s
```

`time.Duration` is an `int64` count of nanoseconds with a `String` method that renders hours, minutes and seconds, so
printing a duration already reads well. `time.Now`, `time.Since` and `time.After` are the everyday rest of it, and the
lesson on `time` covers the reference layout that catches everyone.

## errors is a small package

```go
err := fmt.Errorf("parsing %q: %w", input, strconvErr)
fmt.Println(errors.Is(err, strconvErr))
```

```text
true
```

That is error wrapping in two lines: `%w` puts the original error inside the new one, and `errors.Is` walks the chain to
find it. `errors.New` makes a value, `errors.Join` combines several, and `errors.As` pulls a typed error out of a chain.
Those five are the whole package, and the errors chapter takes them apart.

## Where to look things up

| Source | For |
| --- | --- |
| `pkg.go.dev` | searchable documentation for the standard library and any module |
| `go doc <pkg>` | the same documentation offline, for the version installed |
| `go doc -all <pkg>` | everything a package exports, including what you have not met |
| `$GOROOT/src` | the source of the standard library, installed and readable |

Reading the standard library's source is worth an hour. It is ordinary Go, commented in the documentation style, and a
package like `strings` or `sort` is a good model for your own. `$GOROOT/src/strings/strings.go` is a reasonable place to
start.

## Check yourself

Print a struct with `%v`, `%+v` and `%#v`, then a nil slice and a nil map, and compare the output. Then sort a `[]string`,
find an element with `slices.Index`, and print a map's keys in a defined order twice to confirm the order is stable.
