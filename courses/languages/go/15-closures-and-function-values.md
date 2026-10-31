---
title: Closures and function values
summary: Functions as values, what a closure captures, and the loop variable change in Go 1.22.
chapter: Control flow and functions
minutes: 13
status: draft
---

## A function is a value

```go
double := func(n int) int { return n * 2 }

apply := func(f func(int) int, v int) int { return f(v) }

fmt.Println(apply(double, 21))
```

```text
42
```

A function literal is a value that can be assigned, passed and returned, and a function type is written with the signature:
`func(int) int`. That is what makes `sort.Slice`, `http.HandlerFunc` and a callback parameter work with no interface or
delegate in the language.

A named function and a function literal are the same kind of value, and a method expression or method value is a third:

```go
f := row.Label        // a function value bound to that row
g := Row.Label        // a function taking the receiver as its first argument
```

The first is a method value, which captures the receiver, and the second is a method expression. They are rare outside of
reflection and generics, and they exist because a method is a function with the receiver as its first parameter.

## A closure captures the variable

```go
counter := 0

inc := func() int {
	counter++
	return counter
}

fmt.Println(inc(), inc(), inc())
```

```text
1 2 3
```

The closure refers to `counter` itself rather than to a copy of its value, so the three calls increment the same variable.
That is what makes a closure a stateful object without a struct: the captured variables are the state and they live as long
as the closure does.

An accumulator that returns a closure is the shape this produces:

```go
func newCounter() func() int {
	n := 0

	return func() int {
		n++
		return n
	}
}
```

Each call to `newCounter` allocates a separate `n`, so two counters do not interfere. The compiler keeps `n` on the heap
because it outlives the function that declared it, which is escape analysis doing its job.

## Memoisation in seven lines

```go
memo := func() func(int) int {
	cache := map[int]int{}

	return func(n int) int {
		if v, ok := cache[n]; ok {
			return v
		}

		cache[n] = n * n
		return cache[n]
	}
}()

fmt.Println(memo(3), memo(3))
```

```text
9 9
```

The cache is closed over and private: nothing outside can reach it, and the map is a field of the closure rather than of a
struct. That is the whole reason a closure is a reasonable substitute for a small type, and the reason to prefer a struct
when the state grows or when it needs a name for the documentation.

A closure that caches is not safe for concurrent use, because a map is not. Wrapping the map access in a `sync.Mutex` or
using `sync.Map` is the concurrency chapter's subject.

## The loop variable change in Go 1.22

```go
var fns []func()

for i := range 3 {
	fns = append(fns, func() { fmt.Print(i) })
}

for _, f := range fns {
	f()
}
```

```text
012
```

That prints `012` because Go 1.22 made the loop variable per-iteration: each iteration of a `for` with `:=` gets its own
variable, so each closure captured a different one.

Before 1.22 the same program printed `333`, because there was one variable for the whole loop and every closure captured it,
which is the bug every Go programmer of a certain age has fixed by hand:

```go
for i := range 3 {
	i := i   // the pre-1.22 workaround
	fns = append(fns, func() { fmt.Print(i) })
}
```

That line is now unnecessary and harmless. It still appears in older code, and it is the reason a `go.mod` line matters: a
module with `go 1.21` or lower in it compiles with the old semantics, so the language version decides what the loop does.

The one place the change does not help is a `for` written with the three-part form where the variable is declared outside:

```go
i := 0
for ; i < 3; i++ {
	fns = append(fns, func() { fmt.Print(i) })
}
```

That variable is declared once, so the closures still share it, and the workaround is still needed.

## Where a function value earns its place

| Use | Why |
| --- | --- |
| A callback parameter | the caller decides what to do with each element |
| `sort.Slice` with a comparison | no type needed for the sort order |
| A table of handlers | a map from a name to a function |
| A middleware wrapper | `func(http.Handler) http.Handler` |
| A deferred cleanup | `defer func() { ... }()` |

The middleware one is the pattern to look at when you reach the HTTP chapter: a function that takes a handler and returns a
handler is a wrapper with the types doing the work, and a chain of them is five lines of composition.

Where a function value is the wrong answer: an interface with one method is a named function type with documentation, and
the compiler's error messages for it name the interface rather than the signature. `http.Handler` is a `ServeHTTP` method
and `http.HandlerFunc` is the adapter that lets a function be one, which is the standard library having it both ways.

## Check yourself

Write a function that returns a closure incrementing a captured counter, call it twice to check the counters are separate.
Then build a slice of closures in a loop and print them, and explain what the output would have been before Go 1.22 and why.
