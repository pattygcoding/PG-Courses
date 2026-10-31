---
title: The testing package
summary: Table tests, subtests, the helper that reports the caller's line, and the cleanup that always runs.
chapter: Testing and tooling
minutes: 14
status: draft
---

## A test is a function with a signature

```go
func TestSum(t *testing.T) {
	got := Sum([]int{1, 2, 3})

	if got != 6 {
		t.Errorf("Sum() = %d, want %d", got, 6)
	}
}
```

A test lives in a file ending `_test.go`, in the same package or in a `<package>_test` package, and its name starts with
`Test` and takes a `*testing.T`. `go test ./...` finds them with no registration and no configuration.

`t.Errorf` records a failure and continues; `t.Fatalf` records it and stops that test. The difference matters: a `Fatalf`
in the middle of a check means the later checks do not run, which is right when the value being nil makes the rest
meaningless and wrong when it hides three other problems. `t.Error` takes an `any` message if the formatted version is not
needed.

The message convention is the one from the standard library: `Operation(args) = got, want expected`. A reader knows what was
compared and which side is which without reading the code.

## Table tests

```go
func TestParse(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    int
		wantErr bool
	}{
		{name: "empty", in: "", want: 0, wantErr: true},
		{name: "one", in: "a", want: 1},
		{name: "many", in: "a,b,c", want: 3},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Parse(tt.in)

			if (err != nil) != tt.wantErr {
				t.Fatalf("Parse(%q) error = %v, wantErr %v", tt.in, err, tt.wantErr)
			}

			if got != tt.want {
				t.Errorf("Parse(%q) = %d, want %d", tt.in, got, tt.want)
			}
		})
	}
}
```

A table of anonymous structs is the standard shape, and `t.Run` gives each case a name and its own test:

```text
=== RUN   TestParse
=== RUN   TestParse/empty
=== RUN   TestParse/one
=== RUN   TestParse/many
--- PASS: TestParse (0.00s)
    --- PASS: TestParse/empty (0.00s)
    --- PASS: TestParse/one (0.00s)
    --- PASS: TestParse/many (0.00s)
```

The subtests are indented under the parent, and the parent's result is printed after all of them have finished. Spaces in a
subtest name become underscores in the reported name, so a case named `sub a` runs as `TestFailing/sub_a`. The name shows in
`-run`, so a failing case can be run alone:

```bash
go test -run 'TestParse/many' ./...
```

```text
=== RUN   TestParse
=== RUN   TestParse/many
--- PASS: TestParse (0.00s)
    --- PASS: TestParse/many (0.00s)
```

Subtests also run in parallel with `t.Parallel()` inside the `t.Run` closure, which is how a suite of independent cases is
made faster, and `go test -parallel 8` bounds them. The loop variable is not a problem since Go 1.22, so `tt` inside the
closure is the current case; on an older `go` line the copy `tt := tt` is still needed.

## t.Helper marks an assertion function

```go
func assertNoError(t *testing.T, err error) {
	t.Helper()

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
```

`t.Helper()` makes the reported line the caller's rather than the line inside the helper, which is the difference between an
error pointing at the assertion and an error pointing at line 12 of a shared file. Every assertion helper needs it, and it
is the first line of the function.

That function is also the reason a small internal assertion package is worth having in a codebase: `assertNoError(t, err)`
and `assertEqual(t, got, want)` remove the same four lines from two hundred tests, and `t.Helper` keeps the failure messages
useful.

## Cleanup

```go
func TestWithTempFile(t *testing.T) {
	dir := t.TempDir()

	path := filepath.Join(dir, "rows.txt")

	if err := os.WriteFile(path, []byte("a,b"), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Cleanup(func() {
		slog.Info("test finished", "path", path)
	})
	...
}
```

`t.TempDir` creates a directory that is removed when the test finishes, and it is per-test and per-subtest, so two tests
never share a path. That is the answer to the temporary-file problem: no `os.MkdirTemp`, no `defer os.RemoveAll`, and a
directory whose name appears in the failure output so a leftover file can be inspected.

`t.Cleanup` registers a function that runs when the test and all its subtests finish, in reverse order, which is what makes
each subtest's cleanup independent. It is the `defer` of the testing package and it is the right place for anything that
has to happen after the test rather than at the end of it.

```go
t.Setenv("APP_MODE", "test")
```

`t.Setenv` sets an environment variable for the test and restores it afterwards, and setting one makes the test unable to
run in parallel, which is a deliberate check rather than a surprise.

## t.Context and timeouts

```go
func TestSlowThing(t *testing.T) {
	ctx := t.Context()

	if err := doWork(ctx); err != nil {
		t.Fatal(err)
	}
}
```

`t.Context()` is the context for the test, cancelled when the test ends, added in Go 1.24. Passing it to the code under test
is how a test proves that a goroutine stops when the test finishes, which is the leak check from the concurrency chapter.

A test that hangs is bounded by `go test -timeout`, which defaults to ten minutes and prints the stack of every goroutine
when it fires. That stack is the diagnostic of last resort for a deadlock, and it is worth running once deliberately to see
what it looks like:

```bash
go test -timeout 5s ./...
```

## Check yourself

Write a table test with four cases including a failure, and run one of them with `-run`. Add an assertion helper with
`t.Helper` and confirm the reported line. Then write a test that uses `t.TempDir` and `t.Cleanup` and explain what would
leak without them.
