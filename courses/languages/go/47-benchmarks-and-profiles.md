---
title: Benchmarks and profiles
summary: Measuring a function, reading the allocation column, and finding where the time goes.
chapter: Testing and tooling
minutes: 14
status: draft
---

## A benchmark is a function with b

```go
func BenchmarkConcat(b *testing.B) {
	for b.Loop() {
		Concat(100)
	}
}
```

```bash
go test -bench . -benchmem ./bench
```

```text
goos: windows
goarch: amd64
pkg: example.com/tmpgo/bench
cpu: Intel(R) Core(TM) i7-14650HX
BenchmarkConcat-24    	 2805882	       411.7 ns/op	     504 B/op	       6 allocs/op
BenchmarkPlus-24      	  450126	      2758 ns/op	    9744 B/op	      99 allocs/op
BenchmarkSink-24      	 2946232	       402.3 ns/op	     504 B/op	       6 allocs/op
PASS
ok  	example.com/tmpgo/bench	4.698s
```

Five columns and a header. The header names the operating system, the architecture, the package and the CPU, which is the
context a number is meaningless without. The name has `-24` appended, which is `GOMAXPROCS` at the time. Then the iteration
count, the time per operation, the bytes allocated per operation and the number of allocations per operation.

`b.Loop()` is the loop to write in Go 1.24 and later. It handles the timing, keeps the body from being optimised away, and
scales the iteration count to the machine. The older form is still everywhere in existing code:

```go
func BenchmarkConcat(b *testing.B) {
	for range b.N {
		Concat(100)
	}
}
```

`b.ResetTimer` is what the older form needs after a setup step, and `b.Loop` makes it unnecessary. What still matters is
using the result so the compiler cannot delete the call: assigning to a package-level variable is the idiom.

## The two numbers that matter

```go
BenchmarkConcat-24    	 2805882	       411.7 ns/op	     504 B/op	       6 allocs/op
BenchmarkPlus-24      	  450126	      2758 ns/op	    9744 B/op	      99 allocs/op
```

Those two functions build the same string, one with `strings.Builder` and one with `+=`. The builder is **6.7 times faster**
and performs **16 times fewer allocations**, which is the strings lesson's claim measured rather than asserted. The allocation
count is the column to read first: a change that reduces allocations is almost always a real improvement, and the time
column follows.

A benchmark that reports `0 B/op` and `0 allocs/op` is one the compiler optimised away or one that genuinely allocates
nothing, and the way to tell is to use the result.

```bash
go test -bench . -benchtime 100x ./bench
go test -bench . -count 10 ./bench
go test -bench . -cpu 1,2,4 ./bench
```

`-benchtime` fixes the iterations or the duration, `-count` runs each benchmark several times so the variance is visible, and
`-cpu` runs with several values of `GOMAXPROCS`. A single run of a benchmark is an anecdote: the same binary on the same
machine varies by a few percent, so a ten percent improvement is worth confirming with `-count 10`.

## Comparing two implementations with benchstat

```bash
go test -bench . -count 10 ./bench > old.txt
# make the change
go test -bench . -count 10 ./bench > new.txt
benchstat old.txt new.txt
```

`benchstat` is an external tool that reads two benchmark outputs and reports each one's mean with its variance, and the
difference between them with a p-value and a confidence interval. A row whose change is not statistically significant is
marked to say so, and the rows that matter are the ones without that marker.

```bash
go install golang.org/x/perf/cmd/benchstat@latest
```

That is what makes a benchmark a measurement rather than an impression, and the tool to reach for before claiming an
optimisation worked. The output is a table with one row per benchmark, an old column, a new column and a comparison column,
and the comparison is the one to read.

## What to profile

```bash
go test -bench BenchmarkConcat -cpuprofile cpu.out -memprofile mem.out ./bench
go tool pprof -top cpu.out
go tool pprof -http :8080 cpu.out
```

`-cpuprofile` and `-memprofile` write a profile that `pprof` reads. `-top` prints the functions ordered by time or by
allocations, and `-http` opens a browser with a flame graph, a call graph and the source annotated with the cost of each
line. `go tool pprof -list Concat cpu.out` prints the function with the per-line cost, which is the view that answers "which
line is slow".

The order to work in: benchmark to see that a change matters, profile to find where the time is, and change one thing at a
time. A profile on a program that has never been measured produces a list of things that could be faster, and the top of that
list is often not on the hot path.

```go
import _ "net/http/pprof"

go func() {
	_ = http.ListenAndServe("localhost:6060", nil)
}()
```

Importing `net/http/pprof` for its side effect registers handlers on the default mux, so a running service can be profiled
while it runs:

```bash
go tool pprof -http :8080 http://localhost:6060/debug/pprof/profile?seconds=30
```

That is a thirty-second CPU profile of a live process, which is how a production problem is diagnosed when it cannot be
reproduced. The security implication is worth stating: that endpoint exposes internals, so it belongs on a localhost
listener or behind an authenticated admin route, and never on the public port.

## The rules

1. `b.Loop()` for a new benchmark, and use the result.
2. Read the allocation column first.
3. `-count 10` and `benchstat` before claiming an improvement.
4. Profile before optimising.
5. One change at a time, and benchmark again after each.
6. Keep the pprof endpoint off the public listener.

## Check yourself

Benchmark `strings.Builder` against `+=` for a hundred concatenations with `-benchmem`, and explain the allocation counts.
Run one of them with `-count 10` and compare the two runs with `benchstat`, then take a cpu profile of one benchmark and
read the top ten lines.
