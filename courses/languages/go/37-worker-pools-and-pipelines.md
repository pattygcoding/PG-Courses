---
title: Worker pools and pipelines
summary: Bounding the concurrency, chaining stages, and where a goroutine per item stops working.
chapter: Concurrency
minutes: 13
status: draft
---

## A pipeline is a function per stage

```go
func generate(ctx context.Context, nums ...int) <-chan int {
	out := make(chan int)

	go func() {
		defer close(out)

		for _, n := range nums {
			select {
			case out <- n:
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

func square(ctx context.Context, in <-chan int) <-chan int {
	out := make(chan int)

	go func() {
		defer close(out)

		for n := range in {
			select {
			case out <- n * n:
			case <-ctx.Done():
				return
			}
		}
	}()

	return out
}

for v := range square(ctx, generate(ctx, 1, 2, 3, 4)) {
	fmt.Print(v, " ")
}
```

```text
1 4 9 16
```

Three properties make that pattern work, and they are worth naming because every pipeline has them:

1. **Each stage is a function returning a receive-only channel.** The caller cannot send into it.
2. **The goroutine closes its own output channel with a `defer`.** The next stage's `range` terminates.
3. **Every send is in a `select` with `ctx.Done()`.** A cancelled pipeline stops rather than leaking a goroutine blocked on a
   channel nobody reads.

The `defer close(out)` at the top of the goroutine is what makes the close happen on every path including the cancellation
return, which is the defer lesson applied to channels.

## Bounding the concurrency

```go
var (
	jobs  = make(chan int)
	wg    sync.WaitGroup
	total atomic.Int64
)

for range 3 {
	wg.Go(func() {
		for j := range jobs {
			total.Add(int64(j))
		}
	})
}

for i := range 10 {
	jobs <- i
}
close(jobs)
wg.Wait()
```

```text
total: 45
```

Three goroutines consume from one channel, ten jobs go in, the channel is closed and the `WaitGroup` waits for the consumers
to drain it. `total` is an `atomic.Int64` because three goroutines write to it, which is the alternative from the mutex
lesson and the right one for a single counter.

The bound is the whole point. A goroutine per job is unbounded, and for ten thousand jobs against a database with fifty
connections it is a queue of nine thousand five hundred waiting goroutines and a pool that has been exhausted. Three workers
is the number the next stage can take, and the jobs channel's back pressure is what keeps the producer honest.

The number to use:

| Work | Bound |
| --- | --- |
| An HTTP call to a third party | the rate limit, or two to ten |
| A database query | the connection pool size |
| CPU-bound work | `runtime.GOMAXPROCS(0)` |
| A file read | the disk, which is one to four |
| Anything unknown | start at four and measure |

## A semaphore when the count is per call

```go
sem := make(chan struct{}, 4)

for _, url := range urls {
	sem <- struct{}{}

	wg.Go(func() {
		defer func() { <-sem }()
		fetch(url)
	})
}
```

A buffered channel of empty structs is the semaphore: the send blocks when four are outstanding and the receive releases one.
`struct{}` is the type to use because it is zero bytes, so the channel is a counter and nothing else.

The difference from the worker pool is where the jobs come from. A pool has a channel of jobs and a fixed set of consumers; a
semaphore has the jobs already and only limits how many run at once. Both bound the concurrency, and the pool is the one to
prefer when the work arrives as a stream.

## Fan-in with a WaitGroup

```go
func merge(ctx context.Context, chans ...<-chan int) <-chan int {
	out := make(chan int)
	var wg sync.WaitGroup

	for _, c := range chans {
		wg.Go(func() {
			for v := range c {
				select {
				case out <- v:
				case <-ctx.Done():
					return
				}
			}
		})
	}

	go func() {
		wg.Wait()
		close(out)
	}()

	return out
}
```

```text
merged total: 15
```

The pattern to notice is the last four lines: a goroutine whose whole job is to wait for the senders and then close the
output. Without it, the merged channel never closes and the consumer waits for ever. `wg.Go` handles the counting, and the
close happens after `Wait` returns, in its own goroutine so that `merge` can return the channel.

That is the answer to "who closes the channel when there are several senders": a `WaitGroup`, and one goroutine that waits
and closes. The rest of the senders never close anything.

## Errors from a pool

A pool that can fail needs somewhere for the errors, and there are three shapes:

- **A result struct on the channel**, carrying each job's outcome including its error, which the consumer reads.
- **The first error wins and the context is cancelled**, which stops the rest.
- **An error count and a log line per failure**, which is right for a batch job where one bad row should not stop the others.

The middle one is `golang.org/x/sync/errgroup`, a small external package worth reading: `Group.Go` takes a function returning
an error, the first non-nil error cancels the group's context, and `Wait` returns it.

```go
g, ctx := errgroup.WithContext(ctx)

for _, url := range urls {
	g.Go(func() error {
		return fetch(ctx, url)
	})
}

if err := g.Wait(); err != nil {
	return err
}
```

There is no standard library equivalent, so the choice is that package or the hand-written version with a result struct and a
`sync.Once` around the first error. Where the pool is small and the errors are rare, the hand-written version is twenty lines
and one less dependency.

## Shutting down in order

The order matters when the stages hold resources:

1. **Stop accepting new work**, which is the listener closing or the producer stopping.
2. **Cancel the context**, so the in-flight work is told to stop.
3. **Wait for the goroutines**, with a `WaitGroup` or the error group.
4. **Wait for the in-flight requests**, with `http.Server.Shutdown(ctx)`.

A program that calls `os.Exit`, or lets `main` return between those steps, skips the rest of the list, which is how a
deployment loses the requests that were in flight. The server chapter builds that sequence, and it is the last thing to get
right rather than the first.

## Check yourself

Write a three-stage pipeline with a generator, a transform and a sink, then cancel the context in the sink and confirm every
stage returns. Write a pool of four workers over twenty jobs with an `atomic.Int64` total, then write the same thing as a
semaphore over a slice and compare the two shapes.
