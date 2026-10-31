---
title: select and timeouts
summary: Waiting on several channels at once, the default that does not block, and what the garbage collector now handles.
chapter: Concurrency
minutes: 13
status: draft
---

## select waits on several channels

```go
select {
case v := <-ch:
	fmt.Println("received", v)
case <-time.After(10 * time.Millisecond):
	fmt.Println("timeout")
}
```

```text
timeout
```

`select` blocks until one of its cases can proceed and then runs that one. If several are ready at the same moment it picks
one at random, which is deliberate: it stops a program from depending on the order of two channels that happened to be
ready together.

Every case has to be a channel operation, either a receive or a send. A `select` with no cases at all blocks for ever, and
that is occasionally useful as a deliberate stop.

## default makes it non-blocking

```go
select {
case v := <-ch:
	fmt.Println("received", v)
default:
	fmt.Println("nothing ready")
}
```

```text
nothing ready
```

With a `default` the `select` never blocks: it runs the ready case or the default. That is the shape for a poll, a
best-effort send and a check that does not wait.

A nil channel in a case never becomes ready, so a `default` still fires:

```go
var nilCh chan int

select {
case v := <-nilCh:
	fmt.Println(v)
default:
	fmt.Println("nil channel is not ready")
}
```

```text
nil channel is not ready
```

That is what makes a nil channel useful in a `select`: assigning nil to a channel variable disables that case, which is how
a set of dynamic cases is built.

## A timeout, and the advice that changed

```go
select {
case v := <-work:
	return v, nil
case <-time.After(5 * time.Second):
	return 0, errors.New("timed out")
}
```

`time.After` returns a channel that receives one value after the duration, so it is a case in a `select` and nothing else.
In Go 1.23 and later it can be used in a loop without a thought, which is a change worth knowing because the older advice
was the opposite. From the `time` package documentation:

> Before Go 1.23, this documentation warned that the underlying Timer would not be recovered by the garbage collector until
> the timer fired, and that if efficiency was a concern, code should use NewTimer instead and call Timer.Stop if the timer is
> no longer needed. As of Go 1.23, the garbage collector can recover unreferenced, unstopped timers. There is no reason to
> prefer NewTimer when After will do.

The same change applies to tickers. A `time.Tick` in a loop is no longer a leak, and `NewTicker` with a `defer t.Stop()` is
still worth writing when the ticker has to stop for a reason of its own.

```go
ticker := time.NewTicker(time.Second)
defer ticker.Stop()

for {
	select {
	case <-ticker.C:
		poll()
	case <-ctx.Done():
		return ctx.Err()
	}
}
```

## The loop with a cancellation case

That shape, a `for` around a `select` with a `done` case, is the standard worker loop and it is worth reading as a piece of
grammar:

```go
for {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case job, ok := <-jobs:
		if !ok {
			return nil
		}
		process(job)
	}
}
```

Five things are going on. The `for` with no condition is an infinite loop. The `ctx.Done()` case is the only way out that
does not depend on the input. The `ok` from the receive distinguishes a closed channel from a job. The `return nil` on a
closed channel is how a consumer stops when the producer is finished. And the `process` call is the work, in one place.

That loop reads as a list of the ways the goroutine can end, which is the property to aim for in concurrent code.

## Several channels, one at a time

```go
for {
	select {
	case v, ok := <-a:
		if !ok {
			a = nil
			continue
		}
		sink(v)
	case v, ok := <-b:
		if !ok {
			b = nil
			continue
		}
		sink(v)
	case <-ctx.Done():
		return
	}
}
```

Setting a channel variable to nil after it closes removes that case, because a receive on a nil channel never proceeds. That
is the mechanism behind a fan-in that finishes when both inputs have: the `select` waits for whichever is still open, and
the loop exits when both variables are nil and the only case left is the cancellation.

The alternative, and the one to prefer when it fits, is a `sync.WaitGroup` plus one goroutine per input writing to a single
channel.

## The rules

1. A `select` with no `default` blocks, so it needs a case that will eventually proceed.
2. A `select` inside a `for` needs a cancellation case, or it is a goroutine that cannot be stopped.
3. Point out the random choice when reviewing: a `select` that relies on which case wins is a bug.
4. A `default` in a loop is a busy loop unless something else in the loop blocks.
5. A nil channel disables a case, which is the tool for a variable set of cases.

## Check yourself

Write a `select` with two cases and a timeout, then one with a `default` and confirm it does not block. Write a worker loop
with a cancellation case and a closed-channel check, then set one of two channel variables to nil and confirm the `select`
stops considering it.
