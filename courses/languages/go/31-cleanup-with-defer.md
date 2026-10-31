---
title: Cleanup with defer
summary: Releasing what you acquire, the error a Close returns, and the loop that leaks.
chapter: Errors and reliability
minutes: 12
status: draft
---

## Acquire and defer the release

```go
func readConfig(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("opening %s: %w", path, err)
	}
	defer f.Close()

	return io.ReadAll(f)
}
```

The `defer` goes on the line after the check that the open succeeded, and the two lines belong together. Every acquisition
has a release, and the release is deferred immediately so no later `return` can skip it.

The order matters: the error check comes first, because a failed `Open` returns a nil file and `defer f.Close()` on a nil
`*os.File` is a nil dereference. The pattern is `err := acquire()`, `if err != nil`, `defer release()`.

Which things need this:

| Acquired | Released with |
| --- | --- |
| `os.Open` | `Close` |
| `sql.DB` | `Close`, at the end of the program |
| `sql.Rows` | `Close` |
| `sync.Mutex` | the release method |
| `context.WithCancel` | the `cancel` function |
| A `bufio.Writer` | `Flush` |
| An `http.Response.Body` | `Close` |

The `Flush` row is the one that is not a `Close` and is equally necessary: a buffered writer whose buffer is never flushed
loses the data, and nothing reports it. `defer w.Flush()` after the writer is created is the habit.

## The context cancel is a release

```go
func load(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return fetch(ctx)
}
```

`cancel` must be called even when the work finished, because the timer and the child context live until it is. That is why
`go vet` has a `lostcancel` check, which reports a `context.WithCancel` whose cancel is not called on every path:

```text
lostcancel\check.go:15:1: the cancel function is not used on all paths (possible context leak)
lostcancel\check.go:17:1: this return statement may be reached without using the
cancel var defined on line 15
```

Both messages name the variable and the path, and both are worth fixing rather than suppressing. The fix is a `defer cancel()`
on the line after the `WithTimeout`, which covers every path including a panic.

## A Close error is sometimes the real error

```go
func writeReport(path string, rows []Row) (err error) {
	f, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("creating %s: %w", path, err)
	}

	defer func() {
		if cerr := f.Close(); cerr != nil && err == nil {
			err = fmt.Errorf("closing %s: %w", path, cerr)
		}
	}()

	w := bufio.NewWriter(f)

	if err := writeRows(w, rows); err != nil {
		return fmt.Errorf("writing rows: %w", err)
	}

	return w.Flush()
}
```

Three things are going on. The named return `err` lets the deferred function set it. The `cerr != nil && err == nil` check
keeps the original error when there already is one, because a close failure after a write failure is not the interesting
part. And the flush happens before the close, because a `bufio.Writer`'s data is only written on `Flush`.

For a file that is only read, ignoring the close error is fine and most code does. For a file that was written, the close is
where the last of the data is committed, and a full disk shows up there rather than on the write. That asymmetry is the
reason the idiom above exists.

## defer in a loop does not run until the function returns

```go
func processAll(paths []string) error {
	for _, path := range paths {
		f, err := os.Open(path)
		if err != nil {
			return err
		}

		defer f.Close()
	}
}
```

Every deferred close runs at the end of `processAll`, so the function holds one open file per path until then. For a
thousand paths that is a thousand file descriptors, and the operating system's limit is the one that fails, with a message
about too many open files that points at the line of the `Open` rather than at the `defer`.

The fix is a function per iteration:

```go
func processAll(paths []string) error {
	for _, path := range paths {
		if err := processOne(path); err != nil {
			return err
		}
	}

	return nil
}

func processOne(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	return process(f)
}
```

Now the close happens at the end of each iteration and the open descriptors are bounded by one. That is a general rule: a
`defer` belongs in a function whose lifetime is the lifetime of the resource.

## What a defer costs

A deferred call is a small amount of bookkeeping per function, and since Go 1.14 the common cases are inlined so the cost is
a few nanoseconds. That is worth knowing because the old advice to avoid `defer` in a loop for performance is out of date:
the reason is the file descriptors and the memory, not the speed.

The one case where the cost is measurable is a deferred call in a function called a hundred million times, which is what the
benchmarking lesson teaches you to find rather than guess at.

## The rules

1. Acquire, check the error, then defer the release, in that order.
2. A `defer` belongs in a function whose scope matches the resource's lifetime.
3. A `Close` on a written thing can fail, and that failure is worth reporting.
4. A `cancel` from a context must be called on every path.
5. A deferred call runs on return, on panic and on goroutine exit, and not on `os.Exit`.

## Check yourself

Write a function that opens a file, reads it and closes it with a `defer`, then one that writes and reports a close error.
Write a loop that defers inside the loop and explain what the descriptor count does, then fix it with a function per
iteration.
