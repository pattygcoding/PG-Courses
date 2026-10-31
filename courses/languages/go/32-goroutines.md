---
title: Goroutines
summary: A function call with go in front of it, what it costs, and where the work actually goes.
chapter: Concurrency
minutes: 13
status: draft
---

## go starts a goroutine

```go
go fmt.Println("from a goroutine")
fmt.Println("before:", runtime.NumGoroutine())
```

```text
before: 2
from a goroutine
```

A goroutine is a function running concurrently with the one that started it. `go` is a statement rather than a call, so
nothing is returned and nothing waits: the starting function continues immediately, and the output order above is not
guaranteed to be what it was in that run.

That non-determinism is the first thing to internalise. Without a channel or a `WaitGroup` there is no ordering at all
between a goroutine and its parent, and a program that relies on one is a program that fails occasionally.

## The main goroutine exiting ends the program

```go
func main() {
	go fmt.Println("from a goroutine")
}
```

That program usually prints nothing. `main` returns immediately, the runtime exits, and every other goroutine is stopped
where it is, with no deferred calls run. Nothing reports that the work was abandoned.

So a goroutine needs a way to be waited for, and there are three: a `sync.WaitGroup`, a channel that receives from it, or a
`select` that watches it. The shape for the simple case:

```go
var wg sync.WaitGroup

wg.Go(func() {
	fmt.Println("from a goroutine")
})

wg.Wait()
```

`wg.Go` was added in Go 1.25 and it does the `Add(1)` and the `Done()` in one call, which removes the two mistakes people
make with a `WaitGroup`: a `Done` without an `Add` and an `Add` after the goroutine has already finished. On an older
toolchain the three-line version is:

```go
wg.Add(1)

go func() {
	defer wg.Done()
	...
}()
```

## What a goroutine costs

A goroutine starts with a 2 KB stack that grows and shrinks as needed, and the runtime multiplexes many of them onto the
available operating system threads. That is the difference from a thread: a hundred thousand goroutines is a normal number
and a hundred thousand threads is not.

```go
fmt.Println(runtime.GOMAXPROCS(0))
```

```text
24
```

`GOMAXPROCS` is the number of operating system threads the runtime will use to run Go code at once, and it defaults to the
number of logical CPUs. It is not a limit on goroutines: a program with ten thousand goroutines and eight cores runs on
eight threads, and the scheduler switches between the runnable goroutines.

Two consequences worth knowing. Goroutines are cheap enough to use per request, per connection and per row of a file, and
CPU-bound work does not get faster by adding goroutines past `GOMAXPROCS` because the threads are the limit. Concurrency is
how you use the cores you have, and it is not parallelism by itself.

## The scheduler switches at safe points

A goroutine gives up its thread when it calls a function, blocks on a channel, waits on a mutex or hits a loop the
compiler instrumented. A tight loop with no function call in it is the case that does not yield, which is one of the few
places a `runtime.Gosched` is the answer.

Since Go 1.14 the runtime also preempts a goroutine that has run too long even at a function call boundary, so a runaway
loop no longer starves the others the way it used to. What it does not do is stop an infinite loop from being an infinite
loop: it makes it a loop that other goroutines can still make progress around.

## Goroutines leak

```go
func leak() {
	ch := make(chan int)

	go func() {
		<-ch
	}()
}
```

```go
fmt.Println("before:", runtime.NumGoroutine())
leak()
leak()
```

```text
before: 2
after: 3
```

Each call to `leak` starts a goroutine that waits on a channel nobody will ever send to, so it lives for the rest of the
program. That is a goroutine leak, and it is the most common concurrency bug after the data race, because a leaked goroutine
holds its whole stack and everything it refers to.

`runtime.NumGoroutine` is the cheap way to look for one: print it at a steady state in a long-running service, and a number
that climbs with traffic is a leak. The fixes are a cancellation path (`context`), a channel the sender closes, or a `select`
with a `default` where waiting is optional.

## Where a goroutine is the right tool

- **Per connection or per request.** The unit of independent work in a server.
- **Per item in a batch of slow calls.** Twenty HTTP requests at once rather than one after another.
- **A background loop.** A poller, a consumer, a ticker.
- **A pipeline stage.** One goroutine per stage, connected by channels.

Where it is the wrong tool: a tiny amount of work, because the coordination costs more than the work; CPU-bound work where
you already have a goroutine per core; and anything where the result is needed before the next line, which is a function
call.

The question I ask before adding one: what happens to this goroutine if the program has to stop right now? If there is no
answer, the goroutine needs a `context` or a channel to receive on.

## Check yourself

Start a goroutine that prints and see whether the output appears, then add a `WaitGroup` and confirm it does. Print
`runtime.NumGoroutine` before and after starting ten goroutines that block on a channel, and decide how you would get them
to exit.
