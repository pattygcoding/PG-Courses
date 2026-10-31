---
title: The performance cost model
summary: Allocations, indirection and syscalls, the order to reach for them, and when not to bother.
chapter: The ecosystem
minutes: 13
status: draft
---

## Where the time goes

Four things cost in Go, in roughly this order of impact:

1. **Allocations.** Every heap allocation is work for the allocator and later for the garbage collector, and the collector
   cost is the one that grows with the program. A function that allocates in a loop is what a profile usually finds.
2. **Indirection.** A method call through an interface cannot be inlined, a pointer chases a possible cache miss, and a slice
   of pointers is a load per element.
3. **Syscalls and I/O.** A file read, a network round trip and lock contention all cost far more than any arithmetic, and
   they are the things to avoid in a loop rather than optimise.
4. **Arithmetic and branching.** The cheapest by a wide margin, and the thing people optimise first.

That order is why the allocation column matters more than the time column, and the string benchmark from the benchmarks
lesson is the example:

```text
BenchmarkConcat-24    	 2805882	       411.7 ns/op	     504 B/op	       6 allocs/op
BenchmarkPlus-24      	  450126	      2758 ns/op	    9744 B/op	      99 allocs/op
```

Six allocations against ninety-nine and 6.7 times the time. The allocation count explains the timing, and a change that
reduces it is almost always the right one.

## Measure, then change one thing

```bash
go test -bench . -benchmem ./...
go test -cpuprofile cpu.out -memprofile mem.out -bench . ./...
go tool pprof -http :8080 cpu.out
```

The order is a benchmark to see whether the thing is slow, a profile to see where the time goes, and one change at a time
with the benchmark re-run after each. Optimising by reading the code finds the thing that looks slow, which is a different
thing from the thing that is slow.

`go tool pprof -top` lists functions by their own time and their cumulative time. `-list <function>` prints the function with
the cost per line, which is the view that answers "which line". The memory profile with `-sample_index=alloc_space` shows what
allocated the most over the run, and `-sample_index=inuse_space` shows what is still held, which is the difference between
churn and a leak.

## The wins worth knowing

**Preallocate a slice when the size is known.**

```go
out := make([]Row, 0, len(in))
```

One allocation instead of the six or seven an `append` does while it grows. The capacity matters and the length does not, and
`slices.Grow` does the same for an existing slice.

**Take a pointer on a large struct in a hot loop.** A struct of a few words is cheaper to copy than to chase, so this is about
large structs rather than a rule.

**Use a slice of values rather than a slice of pointers** when the elements are read in a loop. A `[]Row` is one contiguous
block the CPU can prefetch; a `[]*Row` is a dependent load per element.

**Reuse a buffer instead of allocating per call.**

```go
var bufPool = sync.Pool{
	New: func() any { return new(bytes.Buffer) },
}

buf := bufPool.Get().(*bytes.Buffer)
defer func() {
	buf.Reset()
	bufPool.Put(buf)
}()
```

`sync.Pool` keeps a per-processor free list, so a buffer that is used and returned is reused without the allocator. It is
worth it in a hot path with a short-lived buffer, and it is the wrong answer for a value that has to outlive the call.

**Choose the right function.** `strings.Builder` over `+=`, `strconv.AppendInt` over `strconv.Itoa` plus concatenation, a
`bytes.Buffer` over a `[]string` plus `Join` when the parts arrive over time.

**Avoid reflection and `fmt` in a hot path.** `fmt.Sprintf` parses its format string and walks its arguments with reflection,
which is fine once per request and expensive a million times. `strconv` and manual formatting are the versions for a hot loop,
and the profile says when it matters.

## The escape analysis decides the stack

```bash
go build -gcflags=-m ./...
```

```text
./main.go:14:9: &Row{...} escapes to heap
```

A value whose address outlives the function goes on the heap. The causes I see most:

- Returning a pointer to a local, which is a legitimate design and an allocation.
- Storing a pointer in a struct that outlives the function.
- Passing a pointer into an interface, because the interface holds it.
- A slice that grows past what the compiler could prove about its size.

Reading the escape output is worth doing once on a hot path. The fix is usually to return a value rather than a pointer, or to
take a caller-provided buffer rather than allocating one, and it is worth the change only after the profile says so.

## What not to optimise

- **A function called once at start-up.** A millisecond at boot is nothing.
- **A path with no measurement.** A change read off the source is a guess.
- **Clarity for a few percent.** A hand-unrolled loop and a clever buffer scheme cost every reader and buy a number that
  disappears in the noise.
- **The thing that is the database.** A service at 40 ms per request is not fixed by a faster allocation in the handler, and
  the profile shows the time in the query.
- **Anything before the algorithm.** A quadratic loop with a tight inner allocation needs a different data structure rather
  than a faster allocator.

## The honest summary

Most Go code is fast enough, and the reason is the language's design rather than the average programmer's skill: a goroutine
per request, a garbage collector tuned for latency, and a compiler that allocates a great deal less than the source suggests.
The performance work that matters is at the boundaries: how many database round trips a request makes, how many bytes it
moves, and whether the concurrency is bounded.

The measurement habits are worth having anyway, because they turn a performance conversation into a decision: a benchmark, a
profile, one change and a number that says whether it helped.

## Check yourself

Benchmark a function that builds a string with `+=` and one with a builder, then read the allocation columns. Take a CPU
profile of a benchmark and read the top three functions, then make one change and re-run the benchmark with `benchstat` to
see whether it helped.
