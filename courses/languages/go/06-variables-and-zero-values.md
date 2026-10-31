---
title: Variables and zero values
summary: Declarations, the value every type starts at, and the constants that count themselves.
chapter: Types and values
minutes: 13
status: draft
---

## Two ways to declare

```go
var name string = "report"
var count = 10
count := 20
```

The first spells the type, the second lets the compiler infer it, and the third is the short form inside a function. `:=`
declares and assigns in one statement, and it requires at least one new variable on the left, which is why the same line in
a scope where `name` exists is either an error or a shadow.

```go
var (
	i     int
	s     string
	slice []int
)
```

A `var` block declares several at once, which is the form to use for a group of related variables or for the zero values in
the next section. `var` also works at package level, where `:=` is not allowed at all.

## Every type has a zero value

```go
var (
	i     int
	f     float64
	s     string
	b     bool
	r     rune
	by    byte
	ptr   *int
	slice []int
	m     map[string]int
	fn    func()
)

fmt.Printf("%d %g %q %t %d %d %v %v %v %v\n", i, f, s, b, r, by, ptr, slice, m, fn)
```

```text
0 0 "" false 0 0 <nil> [] map[] <nil>
```

There is no such thing as an uninitialised variable and no way to create one. A `var` declaration, a struct field that
nobody set and an element of a new slice all hold the zero value of their type: `0` for a number, `""` for a string,
`false` for a boolean, `nil` for a pointer, a slice, a map, a channel, a function and an interface, and a struct of zero
values for a struct.

The practical effect is worth more than the rule sounds. A struct does not need a constructor to be safe to use, a nil
slice can be appended to and ranged over, and a `var buf bytes.Buffer` is ready to write into. What a nil value cannot do
is be written through: appending to a nil slice is fine because `append` allocates, while assigning into a nil map panics.

```text
panic: assignment to entry in nil map
```

That panic is the one exception to "the zero value is usable", and the fix is `make(map[string]int)` or a map literal.

## Constants

```go
const (
	MaxRetries = 3
	Prefix     = "row-"
)

const (
	A = iota
	B
	_
	D
)
```

```text
0 1 3
```

`const` declares a value computed at compile time. `iota` is a counter that restarts at zero in each `const` block and
increments per line, which is why a blank line is how a value is skipped: `A`, `B` and `D` are `0`, `1` and `3`.

The `iota` idiom is at its best when the value is computed rather than counted:

```go
const (
	KB = 1 << (10 * (iota + 1))
	MB
	GB
)
```

```text
1024 1048576 1073741824
```

Each constant repeats the expression with the next `iota`, so the three sizes are written once and cannot disagree.

## An untyped constant takes its type from context

```go
const Answer = 42

var i int = Answer
var f float64 = Answer
```

`Answer` is an untyped constant, so it is usable as an `int`, a `float64` or a `byte`. That is why `math.MaxInt32` can be
assigned to an `int` without a conversion, and why a constant that does not fit the type is a compile error rather than a
wrapped value:

```go
const big = 300

var b byte = big
```

```text
.\pulse.go:5:14: cannot use big (untyped int constant 300) as byte value in variable
declaration (overflows)
```

A constant with no explicit type also has a default type, which is what it gets when nothing else decides: `int` for an
integer literal, `float64` for a decimal, `rune` for a quoted character and `string` for a quoted string. Constants are
computed with arbitrary precision and converted to a type only at the point of use, which is the reason that error is
reported rather than a wrapped `44`.

## Shadowing is silent

```go
x := 3
{
	x := 4
	fmt.Println(x)
}
fmt.Println(x)
```

```text
4
3
```

An inner `x` shadows the outer one for the length of the block, and the compiler reports nothing because the inner variable
is used. That is the mechanism behind the most common Go mistake with `:=`:

```go
if err := check(); err != nil {
	return err
}

err := other()
```

Both are legal and both `err` names are separate variables. Inside an `if` the shadow is deliberate and reads well; in a
long function, a `:=` that was meant to assign is a bug the compiler cannot see, which is the one thing `go vet` does not
check by default. `go vet -vettool` with the shadow analyzer does, and naming variables distinctly is the cheaper habit.

## Naming

```go
type HTTPRoute struct{ URL string }
func (r *HTTPRoute) ID() string { return r.URL }
```

Go names are `MixedCaps`, not `snake_case`, and an initialism keeps its case: `ID`, `URL`, `HTTP`, `JSON`. A short name is
correct for a short scope, so a loop variable is `i` and a function parameter in a three-line function is `n`, while a
variable that outlives the paragraph gets a name that says what it holds.

The exported name is the documentation, so `NewRow`, `ParseConfig` and `ErrNotFound` read as sentences at the call site.
The convention of prefixing a constructor with `New` is what makes `widget.New(...)` distinguishable from `widget.Widget{...}`.

## Check yourself

Print the zero value of an `int`, a `string`, a slice, a map, a pointer and a `func`, and compare with the table above.
Then write a `const` block with `iota` that skips a value, and an enum where the constants are a defined type rather than
plain `int`, which is the next chapter's subject.
