---
title: Functions and defer
summary: Multiple returns, the defer that runs in reverse, and the two ways defer surprises people.
chapter: Control flow and functions
minutes: 14
status: draft
---

## Several values out, and named results

```go
func divide(a, b int) (int, error) {
	if b == 0 {
		return 0, errors.New("divide by zero")
	}

	return a / b, nil
}

q, err := divide(7, 2)
```

A function returns any number of values, and the last one is conventionally an `error`. There are no tuples and nothing to
unpack, so `q, err :=` is the whole mechanism, and the check comes immediately:

```go
q, err := divide(7, 2)
if err != nil {
	return fmt.Errorf("dividing: %w", err)
}
```

```go
func divide(a, b int) (q int, err error) {
	if b == 0 {
		err = errors.New("divide by zero")
		return
	}

	q = a / b
	return
}
```

Named results declare the variables in the signature, so a bare `return` returns them. That is worth using when a doc
comment needs to explain what each value is, and worth avoiding when it lets a long function return without showing what it
returns. A bare `return` at the bottom of a forty-line function is not readable.

The one case where named results are clearly right is a deferred function that modifies them, which is further down this
page.

## Variadic parameters

```go
func sum(values ...int) int {
	total := 0
	for _, v := range values {
		total += v
	}
	return total
}

sum(1, 2, 3)
sum()
```

`values` is a `[]int` inside the function, so a variadic parameter is a slice with a call syntax that fills it. That is why
`sum()` compiles: the slice is empty rather than something the caller has to construct.

Calling a function with an existing slice needs the ellipsis:

```go
nums := []int{1, 2, 3}
sum(nums...)
```

`fmt.Println` is the variadic function everyone has used. There can be only one variadic parameter and it has to be last.

## defer runs on the way out, in reverse

```go
func lifo() {
	for i := 0; i < 3; i++ {
		defer fmt.Print("defer ", i, " | ")
	}
	fmt.Print("body | ")
}
```

```text
body | defer 2 | defer 1 | defer 0 |
```

The body runs, then the deferred calls run in the reverse of the order they were registered. That is what makes `defer` a
proper cleanup mechanism: the first resource opened is released last, which is the order the acquisitions have to be undone
in.

A deferred call runs when the function returns, when it panics, and when its goroutine exits. It does not run when the
process exits:

```go
if len(os.Args) > 5 {
	os.Exit(0)
}
```

`os.Exit` terminates without running any deferred call, and `log.Fatal` calls `os.Exit`. A cleanup written with `defer` in
the same function as a `log.Fatal` is a cleanup that does not happen, and the fix is to return the error to `main` and let
it decide.

## The arguments to a deferred call are evaluated at the defer

```go
x := 1
defer fmt.Println("captured:", x)
x = 2
fmt.Println("current:", x)
```

```text
current: 2
captured: 1
```

The arguments are evaluated when the `defer` statement runs, so the call sees `1` even though `x` is `2` by the time it
executes. That is a feature for a value worth capturing and a trap when the value is what you meant to observe:

```go
x := 1
defer func() { fmt.Println("closure sees:", x) }()
x = 2
```

```text
closure sees: 2
```

A closure captures the variable rather than its value at that moment, so the deferred closure sees the final `2`. Both
forms are useful and the choice between them is the whole subtlety of `defer`.

The common version of that mistake is a timer that always reports zero. Both of these defer a call and only one measures
anything:

```go
start := time.Now()

defer fmt.Println("took", time.Since(start))
defer func() { fmt.Println("took closure", time.Since(start)) }()

time.Sleep(20 * time.Millisecond)
```

```text
took closure 20.5214ms
took 0s
```

`time.Since(start)` in the first line is an argument, so it is computed at the `defer` statement, which is microseconds
after `start`. The closure computes it when it runs, so it reports the real elapsed time. That pair is worth remembering
because the broken version is the shorter one to write.

## A deferred function can change a named result

```go
func namedReturn() (n int) {
	defer func() { n++ }()
	return 1
}
```

```text
2
```

The deferred closure runs after the `return` statement set `n` to 1 and before the caller receives it, so the increment is
visible. That works only with a named result, because an unnamed one has no variable for the closure to reach. It is the
mechanism behind a wrapper that adds context to an error on the way out:

```go
func load(key string) (rows []Row, err error) {
	defer func() {
		if err != nil {
			err = fmt.Errorf("loading %s: %w", key, err)
		}
	}()
	...
}
```

That adds the key to every error the function returns, from one place. It is worth knowing as a technique and worth using
sparingly, because it moves the error handling away from the line that failed.

## defer in a loop is not a queue

```go
func accumulates() int {
	total := 0
	for i := 0; i < 3; i++ {
		defer func() { total += i }()
	}
	return total
}
```

```text
0
```

The function returns 0. The return value was copied and the caller received it before any deferred call ran, so the
additions happened afterwards and changed nothing that was returned. That is the same named-result rule seen from the other
side.

The other half of the trap is memory rather than values: `defer` inside a loop over a thousand files keeps a thousand files
open until the function returns, because no deferred call runs until then. The fix for both is a function per iteration, so
each defer belongs to a short-lived scope:

```go
for _, path := range paths {
	if err := process(path); err != nil {
		return err
	}
}
```

`process` opens the file, defers the close and returns, so the close happens once per iteration and the open files are
bounded by one.

## defer during a panic

```go
func defersBeforePanic() {
	defer fmt.Println("deferred during panic")
	panic("boom")
}
```

```text
deferred during panic
recovered: boom
```

The deferred call ran as the panic unwound the stack, and a `recover` in the caller's deferred function caught the value.
Every deferred call between the panic and the recovering function runs, in reverse order, which is what makes a cleanup
written with `defer` safe in the presence of a panic. The panic lesson takes the recovery apart.

## Check yourself

Write a function with two returns and one with a named result, then a variadic one. Set up three defers and predict the order
before running it, then defer both a call with an argument and a closure over the same variable to see the two values. Finish
by deferring inside a loop and explaining the result.
