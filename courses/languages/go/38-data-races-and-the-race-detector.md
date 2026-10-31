---
title: Data races and the race detector
summary: The bug that is invisible in review, the tool that finds it, and the traps around concurrency.
chapter: Concurrency
minutes: 14
status: draft
---

## A data race is two goroutines and no ordering

```go
var counter int

for range 2 {
	wg.Go(func() {
		for range 1000 {
			counter++
		}
	})
}

wg.Wait()
fmt.Println("counter:", counter)
```

```text
counter: 2000
```

That program is wrong and the output is right, which is the problem. `counter++` is a read, an add and a write, and two
goroutines interleaving those three steps lose increments. Whether it loses one depends on the timing, so the bug appears
under load and never on a developer's machine.

Go defines it precisely: a data race is two goroutines accessing the same memory, with at least one write, and no
synchronisation between them. The memory model says a program with a data race has undefined behaviour, which means the
compiler and the CPU are allowed to do anything, including reordering the accesses so a half-updated value is observed.

## The race detector

```bash
go run -race ./cmd
go test -race ./...
go build -race -o app-race ./cmd
```

The race detector is part of the toolchain: it instruments the memory accesses and reports the pairs that raced. It is a
build mode rather than a separate tool, so `-race` works with `run`, `test` and `build`.

```text
==================
WARNING: DATA RACE
Read at 0x00c00000a0e8 by goroutine 8:
  main.main.func1()
      /tmpgo/datacounter/main.go:15 +0x37

Previous write at 0x00c00000a0e8 by goroutine 9:
  main.main.func1()
      /tmpgo/datacounter/main.go:15 +0x49

Goroutine 8 (running) created at:
  sync.(*WaitGroup).Go()
      /usr/local/go/src/sync/waitgroup.go:237 +0x86
  main.main()
      /tmpgo/datacounter/main.go:13 +0x7d

==================
counter: 2000
Found 1 data race(s)
exit status 66
```

Six things in that report make the tool usable:

- **`WARNING: DATA RACE`**, with the record fenced by `====` lines so a log file can be grepped.
- **The read and the write**, each with the goroutine number and the address.
- **The line of each access**, which is the first thing to look at.
- **Where each goroutine was created**, which is how you find the code that started it.
- **`Found 1 data race(s)`** at the end, so the count is visible.
- **`exit status 66`**, the race detector's own exit code, which is why a pipeline can fail the build on it.

## What the detector does not do

- It only reports races that happen during the run. A race on a path the test does not take is invisible, so a program with
  no report is a program that has not raced yet.
- It costs time and memory: the instrumented binary is several times slower, which is why it runs in continuous integration
  rather than in production.
- It does not find a deadlock, a goroutine leak, or a logical race between a channel and a shared field.

So `go test -race ./...` belongs in the build, and passing it is evidence rather than proof. The habit that makes races rare
in the first place is the one from the previous lessons: a value is either owned by one goroutine, protected by a mutex, or
passed through a channel, and never all three or none.

## The traps

**A goroutine per item with no bound.** Ten thousand goroutines against a pool of fifty connections, which is the worker
pool lesson's subject. The symptom is a memory climb and a timeout rather than a crash.

**A shared map.** A map written from two goroutines is a fatal error rather than a panic:

```text
fatal error: concurrent map writes
```

That one cannot be recovered, because the runtime detects it while the map is being corrupted. The fixes are a mutex, a
`sync.Map`, or filling the map before the goroutines start.

**A struct field read by one goroutine and written by another.** The counter at the top of this lesson, and the reason
`atomic.Int64` and a mutex both exist.

**A loop variable captured by a goroutine.** This was the classic bug and Go 1.22 fixed it by making the loop variable
per-iteration:

```go
for _, row := range rows {
	wg.Go(func() {
		process(row)
	})
}
```

On 1.22 and later each goroutine sees its own `row`. Before that, every goroutine saw the last one, and the fix was
`row := row` inside the loop. The behaviour is decided by the `go` line in `go.mod`, so a module at `go 1.21` still needs
the copy.

**A `WaitGroup` used before the `Add`.** A goroutine started before the `Add(1)` can call `Done` first and the counter goes
negative:

```text
panic: sync: negative WaitGroup counter
```

`wg.Go` removes the whole class, because the count and the goroutine start together in one call.

**A channel closed twice, or closed by the receiver.** Both panic, and both are the closing rules being ignored: one sender
closes, once, with a `defer`.

**A goroutine waiting for ever.** A receive on a channel nobody sends to, or a `select` with no cancellation case. The
goroutine and everything it refers to live for the rest of the program, and `runtime.NumGoroutine` is how to find one that
climbs with traffic.

## Finding a leak

```go
fmt.Println(runtime.NumGoroutine())
```

Print that at a steady state in a long-running service and watch it over time. A number that returns to a baseline after the
traffic stops is healthy; one that steps up with every batch is a leak.

For a test, the check is a baseline before and an assertion after:

```go
func TestNoLeak(t *testing.T) {
	before := runtime.NumGoroutine()

	doWork(t.Context())

	deadline := time.Now().Add(time.Second)

	for runtime.NumGoroutine() > before {
		if time.Now().After(deadline) {
			t.Fatalf("goroutines: %d, want %d", runtime.NumGoroutine(), before)
		}

		time.Sleep(10 * time.Millisecond)
	}
}
```

The loop is needed because a goroutine that is finishing takes a moment to disappear, and the deadline is what stops the
test hanging when it does not. `go.uber.org/goleak` is the external package that does this properly, including knowing
which runtime goroutines to ignore, and it is worth the dependency for a package with several pipelines.

`t.Context()` is the context a test has for itself, added in Go 1.24 and cancelled when the test ends. Passing it to the code
under test is how a test proves that a goroutine stops when it is told to.

## The checklist for a review

1. Which goroutine owns each value, and is that obvious from the code?
2. Is every shared field behind a mutex, an atomic, or only read after a fill?
3. Does every goroutine have a way to stop, and does something wait for it?
4. Is every stage's channel closed by its sender, with a `WaitGroup` for the multi-sender case?
5. Are the bounds on concurrency tied to a real limit rather than a guess?
6. Does `go test -race ./...` pass?

## Check yourself

Write the counter with the lost increments and run it under `-race` to read the report, then fix it with a mutex and confirm
the report is gone. Trigger the negative `WaitGroup` and a double close and read both messages, then print
`runtime.NumGoroutine` around a block that starts a goroutine with no exit path.
