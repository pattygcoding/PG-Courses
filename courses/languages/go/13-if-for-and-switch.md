---
title: if, for and switch
summary: One loop keyword with three shapes, a switch that does not fall through, and labels for the nested case.
chapter: Control flow and functions
minutes: 13
status: draft
---

## for is the only loop

```go
for i := 0; i < 3; i++ {
	fmt.Print(i)
}
```

```text
012
```

The three-part form is the one from C. Dropping the parts gives the other two shapes:

```go
n := 0
for n < 2 {
	n++
}
```

```go
for {
	break
}
```

The first is Go's `while`, written as `for` with one condition. The second is an infinite loop, and `break` inside it is how
a server's accept loop or a `select` is written. There is no `do` and no `while`, so there is nothing to translate from
another language: a loop in Go is one keyword and the shape you give it.

## Range

```go
for range 3 {
	fmt.Print("*")
}
```

```text
***
```

Ranging over an integer is the newest form and it arrived in Go 1.22, so `for range n` is `for i := 0; i < n; i++` with no
index. Ranging over the other types gives the pair you would expect:

| Range over | Gives |
| --- | --- |
| slice, array | index, element |
| string | byte index, rune |
| map | key, value, in random order |
| channel | each received value, until the channel is closed |
| integer (1.22+) | nothing usable, the iteration count |
| function (1.23+) | the values an iterator yields |

```go
for i, w := range words {
	fmt.Print(i, w, " ")
}
```

```text
0a 1b 2c
```

Both variables are copies, so writing to the element inside the loop does not change the slice unless you index it:

```go
for _, w := range words {
	w = strings.ToUpper(w)   // changes the copy
}

for i := range words {
	words[i] = strings.ToUpper(words[i])   // changes the slice
}
```

The second form is the one to write when the slice is being modified, and the compiler does not warn about the first.

## Labels for the nested case

```go
loop:
	for i := 0; i < 3; i++ {
		for j := 0; j < 3; j++ {
			if j == 1 {
				continue loop
			}
			if i == 2 {
				break loop
			}
			fmt.Print(i, j, " ")
		}
	}
```

```text
0 0 1 0
```

`continue loop` restarts the outer loop and `break loop` leaves it, which is what a flag variable would otherwise do. The
label goes before the statement and is indented to match, and `gofmt` puts it at the outer level.

The output above is worth tracing: `i=0, j=0` prints `0 0`; `j=1` continues the outer loop; `i=1, j=0` prints `1 0`; `j=1`
continues; `i=2` breaks. Two pairs printed, which is the loop doing exactly what the labels say.

## if takes an init statement

```go
if n, err := strconv.Atoi(input); err != nil {
	return fmt.Errorf("bad input: %w", err)
} else {
	fmt.Println(n)
}
```

The statement before the semicolon runs first and its variables are scoped to the whole `if` including the `else`. That is
the idiom for a value that is only needed inside the branch, and it keeps `n` and `err` out of the enclosing scope.

The one thing to be careful with is a `:=` inside the `if` that shadows an outer variable of the same name, which the
variables lesson covers.

## switch does not fall through

```go
switch x := 2; {
case x == 1:
	fmt.Println("one")
case x == 2, x == 3:
	fmt.Println("two or three")
default:
	fmt.Println("other")
}
```

```text
two or three
```

A `switch` with no expression is `switch true`, so each case is a condition. That is the readable version of a long
`if`/`else if` chain and it is what Go code uses instead of one.

A case can list several values, the matching stops at the first case that matches, and there is no fallthrough unless it is
written:

```go
switch 1 {
case 1:
	fmt.Println("first")
	fallthrough
case 2:
	fmt.Println("second")
}
```

```text
first
second
```

`fallthrough` is rare and it is a mistake to leave in by accident, because the usual assumption from C does not hold. The
other useful form is the type switch, which is the assertion lesson's subject:

```go
var i any = "s"

switch v := i.(type) {
case string:
	fmt.Println("string", v)
case int:
	fmt.Println("int", v)
default:
	fmt.Println("other")
}
```

```text
string s
```

Inside each case `v` has the case's type, so no assertion is needed. `default` is required if some input has to be
handled, and a type switch with no `default` does nothing for an unmatched type.

## What is not in the language

- No ternary operator, so `x := a; if cond { x = b }` is the shape.
- No `while`, no `do`, no `foreach`.
- No `switch` over an enum that warns about a missing case.
- No `break` out of a `select` in the way a loop's `break` works, which is why a `select` inside a `for` needs a label or a
  return.
- `goto` exists and is almost never the right answer; the one legitimate use is a generated state machine.

## Check yourself

Write the three `for` shapes, then range over a slice, a map and an integer. Add a labeled `continue` to a nested loop and
trace the output by hand before running it. Finally rewrite an `if`/`else if` chain as a `switch` with no expression.
