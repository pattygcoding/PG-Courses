---
title: Designing for testability
summary: Taking an interface rather than constructing one, and the test that needs no framework.
chapter: Testing and tooling
minutes: 12
status: draft
---

## The design decision that makes a test easy

```go
type Store interface {
	Find(key string) (Row, error)
}

type Service struct {
	store Store
	clock func() time.Time
}
```

A `Service` that takes its dependencies is testable with a fake; a `Service` that constructs them is testable only by
replacing a package-level variable or by having a database available. That is the whole of testability in Go, and it is a
design decision rather than a testing technique.

The three dependencies that make the difference in practice:

| Dependency | Replace with |
| --- | --- |
| A database or an API | an interface with the two methods the code calls |
| The clock | a `func() time.Time` field |
| The filesystem | an `fs.FS` |

The clock is the one people forget. A function that calls `time.Now()` directly cannot be tested for its handling of an
expired token or a future date, and a `now func() time.Time` field with a default of `time.Now` is one line in the
constructor.

## A fake is a struct with the two methods

```go
type fakeStore struct {
	rows map[string]Row
	err  error
}

func (f *fakeStore) Find(key string) (Row, error) {
	if f.err != nil {
		return Row{}, f.err
	}

	row, ok := f.rows[key]
	if !ok {
		return Row{}, ErrNotFound
	}

	return row, nil
}
```

The interface is declared by the consumer, so it has the methods the consumer calls rather than the methods the
implementation has. That is why the fake is small, and why the interface is worth keeping in the package that uses it.

```go
func TestServiceTotal(t *testing.T) {
	svc := Service{
		store: &fakeStore{rows: map[string]Row{"a": {Key: "a", Value: 2}}},
		clock: func() time.Time { return time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC) },
	}

	got, err := svc.Total("a")
	if err != nil {
		t.Fatal(err)
	}

	if got != 2 {
		t.Errorf("Total() = %d, want 2", got)
	}
}
```

No framework, no `EXPECT()`, and the test reads as the scenario: a store with one row, a fixed clock, and the assertion. The
`clock` field is what makes a time-dependent assertion possible, and it is the reason to take it as a dependency even when
the default is the real thing.

## Testing the error path

```go
func TestServiceTotalMissing(t *testing.T) {
	svc := Service{store: &fakeStore{rows: map[string]Row{}}}

	_, err := svc.Total("a")

	if !errors.Is(err, ErrNotFound) {
		t.Errorf("Total() error = %v, want ErrNotFound", err)
	}
}
```

The error path is the one worth a test and the one a fake makes cheap: setting `err` on the fake is one field, and the
assertion is `errors.Is` rather than a string comparison. A service tested only on the happy path is a service whose errors
are untested, and the errors are what a caller branches on.

## The table of behaviours

```go
func TestServiceTotal(t *testing.T) {
	tests := []struct {
		name    string
		store   *fakeStore
		want    int
		wantErr error
	}{
		{name: "found", store: &fakeStore{rows: map[string]Row{"a": {Value: 2}}}, want: 2},
		{name: "missing", store: &fakeStore{rows: map[string]Row{}}, wantErr: ErrNotFound},
		{name: "store error", store: &fakeStore{err: errBoom}, wantErr: errBoom},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := Service{store: tt.store, clock: time.Now}

			got, err := svc.Total("a")

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Total() error = %v, want %v", err, tt.wantErr)
			}

			if got != tt.want {
				t.Errorf("Total() = %d, want %d", got, tt.want)
			}
		})
	}
}
```

A table of dependencies and outcomes is the shape that scales: each row is a scenario, the name is the case, and adding one
is adding a row. `errors.Is(err, nil)` is false for a nil error and true for the target nil only when both are nil, which is
why the want-error column can hold `nil` without a special case in the assertion.

## What makes a test hard to write

- **A package-level `var db`.** The test has to replace a global, which needs a setter and a way to restore it.
- **A constructor that takes a connection string and opens it.** The test needs a real database.
- **`time.Now()` called inside the function.** The test cannot control the clock.
- **A handler that reads `os.Getenv` mid-request.** The test has to set the environment and remember to unset it.
- **A function that returns a concrete type nobody could fake.** The test needs the real thing.
- **A method that does five things.** The test has to arrange all five.

Each of those is a design smell that a test surfaces, which is the useful thing about writing the test first: the difficulty
of the test is information about the code rather than about the test.

## What not to do

- **Test an implementation detail.** A test that asserts on the number of calls to an internal method breaks on a refactor
  that changed nothing.
- **Test the standard library.** A test that asserts `strings.Split` works is a test of the toolchain.
- **Mock everything.** A test with five mocks asserts that the code calls what it calls, which the compiler already knows.
- **Share state between tests.** Package-level mutable state makes the test order matter, and `go test -shuffle=on` will find
  it.
- **Assert on a whole struct with `==` when only one field matters.** The failure message names every field and the test
  breaks on an unrelated change.

## Check yourself

Take a function that calls `time.Now()` and reads a file, and rewrite it to take a clock function and an `fs.FS`. Write a
table test with a found case, a missing case and an error case, and confirm that each row fails independently when the
implementation breaks.
