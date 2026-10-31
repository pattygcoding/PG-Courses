---
title: The basic types
summary: Integers that overflow quietly, floats that do not, and the conversions Go makes you write.
chapter: Types and values
minutes: 13
status: draft
---

## Integers

```go
var a int = 42
var b int64 = 1 << 40
var c uint8 = 255
var d byte = 'A'
var e rune = 'A'
```

`int` is 64-bit on a 64-bit platform and 32-bit on a 32-bit one, which is the type to use for a count or an index. The
sized forms (`int8` to `int64`, `uint8` to `uint64`) are for a value whose width is part of the problem: a wire format, a
binary file, a bit mask. `uint` exists and is worth avoiding outside of that, because a subtraction that would go negative
wraps instead of failing.

`byte` is an alias for `uint8` and `rune` is an alias for `int32`. They are the same types under different names, and the
names say which is meant: a `byte` is a unit of data and a `rune` is a character.

## Arithmetic is exact except when it wraps

```go
fmt.Println(7 / 2)
fmt.Println(7.0 / 2)
fmt.Println(7 % 2)
fmt.Println(-7 % 2)
```

```text
3
3.5
1
-1
```

Integer division truncates toward zero, so `7 / 2` is `3` and `7.0 / 2` is `3.5`. There is no implicit promotion: if one
operand is a float, the other has to be converted by hand, and the compiler says so.

```go
var i int = 3
var f float64 = 1.5

fmt.Println(i + f)
```

```text
types\main.go:9:14: invalid operation: i + f (mismatched types int and float64)
```

The remainder follows the sign of the dividend, so `-7 % 2` is `-1` rather than `1`. That catches people who expect
`math.Mod`'s answer from Python or from a modulo that always returns a positive value.

```go
var big int8 = 127
big++
fmt.Println(big)

var u uint8 = 0
u--
fmt.Println(u)
```

```text
-128
255
```

An integer overflow wraps silently in both directions. `127 + 1` is `-128` for an `int8` and `0 - 1` is `255` for a
`uint8`, with no panic and no error. That is the arithmetic a CPU does, and it is one of the reasons a counter that can
exceed its type is a real bug rather than a theoretical one.

## Floats are approximate

```go
fmt.Printf("%.20f\n", 0.1+0.2)
fmt.Println(1e21, 1e-7, float64(1)/3)
```

```text
0.29999999999999998890
1e+21 1e-07 0.3333333333333333
```

`float64` is a 53-bit binary mantissa, so `0.1` and `0.2` are not exactly representable and their sum is not `0.3`. This
is the same in every language, and Go's answer to it is the same: compare with a tolerance, or keep money in an integer
number of the smallest unit.

`Println` renders a float with `%v`, which uses the shortest representation that round-trips, so `0.1+0.2` prints as
`0.3` while `%.20f` shows the truth. `math.Abs(a-b) < 1e-9` is the comparison to write, and `math.IsNaN` and
`math.IsInf` are how a computed value is checked for the two values that behave unlike every other.

`float32` costs half the memory and has about seven decimal digits, which matters for a large array of geometry and not
for anything else. `float64` is the default.

## Conversions are explicit and can lose data

```go
fmt.Println(float64(i) + f)
fmt.Println(int(f))

var big int64 = 1 << 40
fmt.Println(int32(big))
```

```text
4.5
1
0
```

A conversion writes the type in front of the value, and there are no implicit ones anywhere in the language. `int(1.5)`
truncates toward zero and `int32(1 << 40)` keeps the low 32 bits, which is `0`. Both are silent, which is the argument for
converting as late as possible and for checking a range before narrowing a value that came from outside the program.

The conversions between a number and a string are where this bites hardest, and they are the reason `strconv` exists:

```go
var r rune = 65
var b byte = 66
fmt.Println(string(r), string(b), r, b)
```

```text
A B 65 66
```

`string(rune)` is the character and `strconv.Itoa` is the digits, and `go vet` reports the conversion that was probably a
mistake. There is no ambiguity in the language and there is plenty in the reading, which is what the vet check is for.

## What is left

| Type | Note |
| --- | --- |
| `bool` | `true` and `false`, no truthiness, so `if 1` is an error |
| `string` | immutable, and a sequence of bytes rather than characters |
| `any` | an alias for `interface{}`, the empty interface |
| `error` | an interface with one method, which the errors chapter covers |

`any` was added in Go 1.18 as an alias, so `any` and `interface{}` are the same type and either spelling compiles. The
modern one is `any`, and the time to use it is when a value really can be anything, such as the argument list of
`fmt.Println`. A function that takes `any` and then asserts it back to a concrete type is a function that has given up on
the type system, and the generics chapter covers the version that does not.

The `string` row is the one worth a lesson, because Go's strings are bytes and the difference between a byte and a
character is the next page.

## Check yourself

Print `7/2`, `7%2`, `-7%2` and `7.0/2`. Then overflow an `int8` in both directions, and convert a `float64` to an `int`
and a `int64` to an `int32` to see both kinds of quiet loss.
