---
title: Fuzzing
summary: A test that generates its own inputs, the corpus it keeps, and the crash it hands you.
chapter: Testing and tooling
minutes: 13
status: draft
---

## A fuzz target is a test with a seed corpus

```go
func FuzzParse(f *testing.F) {
	f.Add("a:b")
	f.Add(":")
	f.Add("")

	f.Fuzz(func(t *testing.T, s string) {
		req, err := Parse(s)
		if err != nil {
			return
		}

		if !strings.Contains(s, ":") {
			t.Fatalf("Parse(%q) accepted an input with no separator", s)
		}

		_ = req
	})
}
```

`f.Add` seeds the corpus with values worth starting from, and `f.Fuzz` takes a function whose arguments are the ones to
generate. Each argument type has to be a string, a byte slice or a number, which is what the engine knows how to mutate.

The seeded values also run as ordinary tests:

```text
=== RUN   FuzzParse
=== RUN   FuzzParse/seed#0
=== RUN   FuzzParse/seed#1
=== RUN   FuzzParse/seed#2
--- PASS: FuzzParse (0.00s)
```

So `go test ./...` runs a fuzz target on its seeds with no special flag, which means a fuzzer is a test that happens to have
more inputs available rather than something separate from the suite.

## Running the fuzzer

```bash
go test -fuzz FuzzParse -fuzztime 5s ./fuzz
```

```text
fuzz: elapsed: 0s, gathering baseline coverage: 0/3 completed
fuzz: elapsed: 1s, gathering baseline coverage: 3/3 completed, now fuzzing with 24 workers
fuzz: elapsed: 3s, execs: 335462 (111799/sec), new interesting: 33 (total: 36)
fuzz: elapsed: 6s, execs: 1819887 (494505/sec), new interesting: 35 (total: 38)
PASS
```

The engine starts with the seeds, runs the target across the cores, and mutates the inputs that produced new coverage. The
`execs` count and the rate are the scale: half a million executions in a few seconds is what makes a fuzzer find something a
hand-written table never would.

`new interesting` counts inputs that reached new code, and the corpus grows as the run continues. Nothing is written back to
the source tree unless a failure is found.

## What a failure looks like

```text
--- FAIL: FuzzParse (0.00s)
    --- FAIL: FuzzParse/seed#0 (0.00s)
            fuzz_test.go:35: Parse("a") accepted an input with no separator
    Failing input written to testdata/fuzz/FuzzParse/9be7a2a1e4b3c9d0
    To re-run:
    go test -run=FuzzParse/9be7a2a1e4b3c9d0
```

The input that failed is written into `testdata/fuzz/<Target>/` as a small file, and it is committed. From then on the target
fails on every run, because the corpus is part of the test rather than something regenerated, which is what turns a found bug
into a regression test with no extra work.

```text
go test fuzz v1
string("a")
```

That file's contents are a header and one encoded value per argument, which is why it is readable and small enough to review
in a pull request.

## A fuzz target is an invariant

The interesting part of writing one is deciding what has to be true for every input rather than for the inputs you thought
of:

- **No panic.** The default expectation: any panic is a failure.
- **A round trip.** `Parse(Format(x)) == x` for any value of `x` is the invariant that finds the most bugs, and it needs no
  knowledge of the implementation.
- **Idempotence.** `Normalise(Normalise(x)) == Normalise(x)`.
- **An equivalence.** Two implementations of the same thing agree on every input, which is how a fast path is checked
  against a slow one.
- **A bound.** The output is never longer than the input, or the count is never negative.

A round trip is worth trying first on anything with a parser and a formatter, and an equivalence check is worth trying on a
rewritten function: `FuzzEqual(f, slow, fast)` with both called on the same input finds the one case the tests missed.

```go
func FuzzRoundTrip(f *testing.F) {
	f.Add(Row{Key: "a", Value: 1})

	f.Fuzz(func(t *testing.T, key string, value int) {
		row := Row{Key: key, Value: value}

		got, err := ParseRow(FormatRow(row))
		if err != nil {
			t.Fatalf("ParseRow(FormatRow(%+v)) = %v", row, err)
		}

		if got != row {
			t.Errorf("round trip = %+v, want %+v", got, row)
		}
	})
}
```

That target is the reason to fuzz a serialiser rather than only test it: a key with a delimiter character in it, or a value
at the boundary of the integer range, is found by the engine in a few seconds.

## What fuzzing does not replace

- **A value test.** The invariant is one property, and a test with a known input and a known output is how the format is
  pinned down.
- **A schema at the boundary.** The fuzzer generates values for the arguments, not bytes from a network, and a boundary
  needs its own check.
- **A decision about what an invalid input should do.** A fuzzer finds a panic; whether a bad input is an error or a
  normalisation is a design decision that has to be written down.

The cost of a fuzz target is one function, and it is worth having on a parser, a serialiser, a validator and anything that
takes a string from outside. It is not worth having on a function whose input has three possible values, which a table covers
in fewer lines.

## Running it in continuous integration

```bash
go test -run '^$' -fuzz FuzzParse -fuzztime 30s ./...
```

That command runs only the fuzz targets, for a bounded time, which is the version to put in a scheduled build. A
`-fuzztime` of thirty seconds in the nightly pipeline and a longer local run is the usual arrangement, and the corpus that
accumulates in `testdata` is what makes each run a little stronger.

## Check yourself

Write a round-trip fuzz target for a pair of format and parse functions, run it on the seeds, then run it with `-fuzztime 10s`
and read the coverage line. Break the parser on purpose and confirm that the failing input is written to `testdata` and that
`go test` fails on it afterwards.
