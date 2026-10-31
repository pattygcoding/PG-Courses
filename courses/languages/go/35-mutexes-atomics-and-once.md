---
title: Mutexes, atomics and Once
summary: The lock that is not reentrant, the counter that needs no lock, and the initialisation that runs once.
chapter: Concurrency
minutes: 13
status: draft
---

## A mutex protects a value

```go
type Counter struct {
	mu sync.Mutex
	n  int
}

func (c *Counter) Inc() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n++
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.n
}
```

```text
mutex counter: 100
```

A hundred goroutines each incrementing once gives exactly 100, because the lock makes the read-modify-write sequence atomic.
The `defer` on the line after the `Lock` is the idiom and it is not optional: every path out of the function has to release
the lock, and a missed release is a deadlock rather than an error.

The zero value of a `sync.Mutex` is ready to use, so a struct with a mutex needs no constructor. That is the same zero-value
property as the rest of the language, and it is why a mutex is a field of the struct rather than an allocated thing.

Two rules follow from the type:

- **Do not copy a mutex.** A copy is a second mutex protecting the same value, which is worse than no lock. `go vet`'s
  `copylocks` check reports a struct containing one being copied, including a method with a value receiver on such a type.
- **The lock and the data go in one struct.** A mutex in a separate variable from what it protects is a lock a reader cannot
  associate with anything.

## A mutex is not reentrant

```go
func (c *Counter) Reentrant() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.Inc()
}
```

```text
fatal error: all goroutines are asleep - deadlock!

goroutine 1 [sync.Mutex.Lock]:
...
main.(*Counter).Inc(...)
	/tmpgo/synctest/main.go:15
main.(*Counter).Reentrant(...)
	/tmpgo/synctest/main.go:29
```

`Reentrant` holds the lock and calls `Inc`, which tries to take it again and blocks for ever. Go's mutex has no owner
tracking, so there is no way for `Lock` to know that the same goroutine already holds it.

The fix is to split the function into a public one that locks and a private one that assumes the lock is held:

```go
func (c *Counter) Add(n int) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.add(n)
}

func (c *Counter) add(n int) {
	c.n += n
}
```

That naming convention is worth following: a lowercase method that requires the lock, with a comment saying so. It is the Go
equivalent of a private method in a class that expects the caller to hold the monitor.

## RWMutex for read-heavy data

```go
var mu sync.RWMutex

mu.RLock()
value := cache[key]
mu.RUnlock()
```

`RLock` allows any number of readers at once and blocks a writer; `Lock` excludes everything. It is worth it when reads
outnumber writes by a lot and the critical section is long enough for the contention to matter, which is a measurement
rather than a guess.

For a map read by many goroutines, the answers in order of preference are: fill it before the goroutines start and never
write again, which needs no lock; a `sync.Map`; or a `RWMutex` around a plain map. Only the third has the reader/writer
trade to think about.

## Atomics for a counter

```go
var counter atomic.Int64

counter.Add(1)
fmt.Println(counter.Load())
```

```text
atomic: 100
```

`sync/atomic` has typed values since Go 1.19: `atomic.Int64`, `atomic.Uint64`, `atomic.Bool`, `atomic.Pointer[T]` and the
rest, each with `Load`, `Store`, `Add`, `Swap` and `CompareAndSwap`. They are faster than a mutex for a single value and
they cannot protect two values that have to change together, which is the line between the two tools.

```go
var ptr atomic.Pointer[Config]

ptr.Store(&Config{Name: "stored"})
fmt.Println(ptr.Load().Name)
```

```text
stored
```

`atomic.Pointer[T]` is the one to know for a configuration replaced wholesale: a reader loads the pointer, a writer builds a
new value and stores it, and no reader ever sees a half-updated struct. That is copy-on-write with no lock on the read path,
and it is how a hot reload is usually implemented.

`atomic.Value` is the untyped predecessor and it is still what an `any` needs. `atomic.Bool.CompareAndSwap` is how a
one-shot flag is set from several goroutines:

```text
true true false
```

## Once for initialisation that must happen once

```go
var (
	once     sync.Once
	initRuns int
)

once.Do(set)
once.Do(set)
fmt.Println("init runs:", initRuns)
```

```text
init ran
init runs: 1
```

`Do` runs the function exactly once across all goroutines, and every caller blocks until the first one has finished. The
second call returned immediately without running `set` again, which is the whole contract.

That is the mechanism for a lazily initialised shared value:

```go
var (
	once   sync.Once
	client *http.Client
)

func getClient() *http.Client {
	once.Do(func() {
		client = &http.Client{Timeout: 10 * time.Second}
	})

	return client
}
```

The alternative, a package-level `init` or a variable initialiser, runs before `main` and cannot report an error. A `Once`
runs when the value is first needed, which is the better trade for anything that opens a connection.

## OnceValue when the initialisation can fail

`Once` has no way to return an error, so the value it builds has to be one that cannot fail. `sync.OnceValue` and
`sync.OnceValues` (Go 1.21) are the versions that return what the function returned:

```go
var loadConfig = sync.OnceValues(func() (Config, error) {
	return readConfig("config.json")
})

cfg, err := loadConfig()
```

```text
c <nil>
```

The function ran once and both callers got the same values, including the same error. That is the right shape for a lazily
opened connection, a parsed template or a loaded file, and it removes the hand-written mutex-plus-error-field pattern that
used to be needed.

## Which to reach for

| Situation | Tool |
| --- | --- |
| One value, simple updates | `atomic.Int64` and friends |
| Several values that change together | `sync.Mutex` |
| Many readers, few writers, measured | `sync.RWMutex` |
| A map, read after a fill and never written | no lock |
| A map, written at run time | `sync.Map` or a mutex |
| Initialise once | `sync.Once`, `sync.OnceValue`, `sync.OnceValues` |
| Wait for a group to finish | `sync.WaitGroup` |
| Copy-on-write configuration | `atomic.Pointer[T]` |

The advice the standard library's own concurrency documentation gives is the one to keep: use a channel to transfer
ownership of data and a mutex to protect state, and do not use channels to implement a lock. A `sync.Mutex` guarding a
struct's fields is the shape that reads best, and a lock implemented with channels is a shape that hides its failure modes.

## Check yourself

Write a counter with a mutex and one with an `atomic.Int64`, run a hundred goroutines against each and confirm the totals.
Make a method call another method that locks again and read the deadlock, then fix it with a private method that assumes the
lock. Finish with a `sync.OnceValues` and a `sync.Once`.
