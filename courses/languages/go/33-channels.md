---
title: Channels
summary: A typed pipe between goroutines, the close that ends a range, and the side that has to close it.
chapter: Concurrency
minutes: 14
status: draft
---

## A channel is a typed queue

```go
ch := make(chan int, 2)

fmt.Println(len(ch), cap(ch))
ch <- 1
ch <- 2
fmt.Println(len(ch), cap(ch))
```

```text
0 2
2 2
```

`make(chan T)` is unbuffered and `make(chan T, n)` has room for `n` values before a send blocks. `len` is how many are
queued and `cap` is the buffer size.

The two channels behave differently and the difference is the whole design decision:

| Kind | A send | A receive |
| --- | --- | --- |
| unbuffered | blocks until a receiver takes it | blocks until a sender gives one |
| buffered, not full | queues and returns | blocks until one is queued |
| buffered, full | blocks until there is room | queues and returns |

An unbuffered channel is a rendezvous, so a send and a receive happen together and either side knows the other arrived. That
is what makes it a synchronisation point as well as a data transfer, and it is why the plain `make(chan T)` is the right
default: a buffer hides whether the receiver was ready.

## Receiving, and the two values

```go
v := <-ch
v, ok := <-ch
```

The two-value form reports whether the value came from a send or from a closed channel. A receive from a closed channel
returns the zero value immediately and `false`, which is the fact that makes `range` terminate:

```go
ch := make(chan int, 1)
ch <- 1
close(ch)

v, ok := <-ch
fmt.Println("drained:", v, ok)

v, ok = <-ch
fmt.Println("closed:", v, ok)
```

```text
drained: 1 true
closed: 0 false
```

A buffered channel drains before it reports the close, so the value queued before `close` is still delivered. The zero value
after that is why `ok` matters: a channel of `int` that is closed gives `0`, which is indistinguishable from a real `0`
without the second return.

## range over a channel

```go
func producer() <-chan int {
	ch := make(chan int, 2)

	go func() {
		defer close(ch)
		for i := range 3 {
			ch <- i
		}
	}()

	return ch
}

for v := range producer() {
	fmt.Print("got ", v, " | ")
}
```

```text
got 0 | got 1 | got 2 |
```

`range` receives until the channel is closed, so it needs somebody to close. The `defer close(ch)` inside the goroutine is
the idiom: the sender closes when it is finished, and the deferred call makes that true on every return path.

That is the rule: **the sender closes, the receiver never does.** Closing a channel from the receiver side panics if a
sender writes afterwards, and nothing about a receive tells you whether other senders exist.

## The three channel panics and the one that hangs

```text
panic: send on closed channel
```

Sending on a closed channel panics. Closing an already-closed channel panics. Receiving from a closed channel does not
panic, it returns the zero value.

```text
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [chan send]:
main.main()
	/tmpgo/deadlock/main.go:5 +0x28
```

A send with no receiver on an unbuffered channel blocks the only goroutine, and the runtime detects that no goroutine can
ever make progress and reports the deadlock. The `[chan send]` is the goroutine's state, and it is the part that says which
operation the program was stuck on.

A nil channel is the fourth case: a send or receive on it blocks for ever, and the runtime does not report a deadlock if
another goroutine is still running. That is why a `nil` channel is useful in a `select`: a case on a nil channel never fires,
which is how a `select` can be given a set of dynamic cases.

## Channel direction in a signature

```go
func produce(ch chan<- int) { }
func consume(ch <-chan int) { }
```

`chan<- int` is send-only and `<-chan int` is receive-only, and the arrow points the way the data flows. A two-way channel
converts to either implicitly, so a function that only sends should say so in its signature, and the compiler then stops it
from receiving.

```go
func producer() <-chan int
```

That return type is how a constructor says "you may receive from this and you may not send to it", which is a useful promise
even though the underlying channel is two-way. It removes a whole class of misuse.

## Buffered or unbuffered

- **Unbuffered** for a handoff where the sender should know the receiver took it, and for a signal.
- **Buffered with size 1** for a result nobody has asked for yet, which is how a semaphore of one works.
- **Buffered with a size equal to the number of senders** for a fan-in where every result must be collected.
- **Buffered with a large size** rarely, and only with a measurement.

The reason to be careful with a big buffer is that it removes the back pressure. A pipeline with an unbounded queue in the
middle converts a slow consumer into a growing memory use instead of a slow producer, and the failure arrives as an
out-of-memory kill rather than a queue that is visibly full.

## Closing rules

1. Close from the sender, never from the receiver.
2. Close exactly once, and let `defer` guarantee it.
3. Do not close as a way to tell a goroutine to stop when you might send again; use a `context` or a separate `done` channel.
4. A channel that nobody needs to know has finished does not need closing at all: letting it be collected is fine.
5. Never close a channel that has more than one sender without a `WaitGroup` to decide when they are all done.

The third rule is worth reading twice, because closing is a common way to signal and it interacts badly with a sender that
has not finished. A dedicated `done` channel that is only closed and never sent on is the clean version of the signal.

## Check yourself

Write a producer that sends three values and closes the channel, and a consumer that ranges over it. Print `len` and `cap`
for a buffered channel before and after filling it. Then send on a closed channel and read the panic, and write a function
taking a receive-only channel that a two-way channel can be passed to.
