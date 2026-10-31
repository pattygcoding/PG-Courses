---
title: Fixtures, golden files and fakes
summary: Test data on disk, the diff that explains a failure, and a fake that is a real implementation.
chapter: Testing and tooling
minutes: 13
status: draft
---

## testdata is ignored by the tool

```text
parse/
  parse.go
  parse_test.go
  testdata/
    valid.json
    badly-formed.json
```

A directory named `testdata` is ignored by the go tool: it is not compiled, and `./...` does not match it as a package. That
is the place for an input file, a fixture or an expected output, and the convention means no build tag and no exclusion in a
configuration file.

```go
data, err := os.ReadFile(filepath.Join("testdata", "valid.json"))
```

`filepath.Join` from the test's own directory, which is how a `go test` process sees its working directory: the package
directory, not the module root. That is the reason a relative path in a test is relative to the package, and the reason to
use a path relative to the test file rather than a module-relative one.

## A golden file

```go
var update = flag.Bool("update", false, "update the golden files")

func TestRender(t *testing.T) {
	got := render(input)

	golden := filepath.Join("testdata", "render.golden")

	if *update {
		if err := os.WriteFile(golden, []byte(got), 0o600); err != nil {
			t.Fatal(err)
		}
	}

	want, err := os.ReadFile(golden)
	if err != nil {
		t.Fatal(err)
	}

	if got != string(want) {
		t.Errorf("render() differs from %s\ngot:\n%s\nwant:\n%s", golden, got, want)
	}
}
```

```bash
go test -update ./...
```

A golden file is the expected output stored beside the input, and the `-update` flag is the convention for regenerating it.
That flag is what makes the pattern usable: the test never writes the file unless it is asked to, so a failing test shows a
diff rather than rewriting the expectation to match the bug.

The message prints both sides, which is what makes the failure readable. For a large output the diff is what you want
rather than two full documents, and `github.com/google/go-cmp` is the external package that produces a readable
field-by-field difference:

```go
if diff := cmp.Diff(want, got); diff != "" {
	t.Errorf("render() mismatch (-want +got):\n%s", diff)
}
```

`cmp.Diff` prints only the lines that changed, with the two sides marked, and it handles a struct, a slice and a nested
value the same way. That is worth the dependency in any codebase with a test that compares something larger than a number.

## Table tests with fixtures

```go
func TestParseFiles(t *testing.T) {
	entries, err := os.ReadDir("testdata")
	if err != nil {
		t.Fatal(err)
	}

	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".json" {
			continue
		}

		t.Run(e.Name(), func(t *testing.T) {
			data, err := os.ReadFile(filepath.Join("testdata", e.Name()))
			if err != nil {
				t.Fatal(err)
			}

			if _, err := Parse(data); err != nil {
				t.Errorf("Parse(%s) = %v", e.Name(), err)
			}
		})
	}
}
```

A directory of inputs and a loop over `os.ReadDir` is the version that scales past a table written in the source: adding a
case is adding a file, and the subtest name is the file name. The convention to pair it with is a `_want_error` suffix or a
sibling directory for the cases that are expected to fail.

## An in-memory filesystem

```go
func TestLoad(t *testing.T) {
	fsys := fstest.MapFS{
		"config.json": &fstest.MapFile{Data: []byte(`{"port":8080}`)},
	}

	if err := Load(fsys); err != nil {
		t.Fatal(err)
	}
}
```

`testing/fstest` provides `MapFS`, which satisfies `fs.FS` from a map of names to contents. A function that takes an `fs.FS`
is testable with no disk, no temporary directory and no cleanup, and the same function reads the embedded filesystem in
production.

That is the reason the io lesson argued for an `fs.FS` parameter: the interface makes the test trivial, which is a design
property rather than a testing trick.

## A fake instead of a mock

```go
type fakeStore struct {
	rows  map[string]Row
	calls int
}

func (f *fakeStore) Find(key string) (Row, error) {
	f.calls++

	row, ok := f.rows[key]
	if !ok {
		return Row{}, ErrNotFound
	}

	return row, nil
}

func (f *fakeStore) Save(row Row) error {
	f.rows[row.Key] = row
	return nil
}
```

A fake is a working implementation with a shortcut, and for a map-backed interface it is about ten lines. It also lets a
test assert on behaviour that no mock expresses:

```go
if store.calls != 2 {
	t.Errorf("store calls = %d, want 2", store.calls)
}
```

A call count is the kind of assertion that catches an accidental double call, and it is one field on the fake. A generated
mock does the same with three times the code and a `EXPECT()` that has to be read to know what the test asserts.

The rule I use: a fake for anything with real logic worth shortcutting, and a stub (a struct whose methods return fixed
values) for an interface that is only there to satisfy a signature. A mock framework earns its place when the sequence of
calls is the thing under test, which is rare.

## What not to do

- **A fixture that is only used by one test.** Inline it: a literal in the test is easier to read than a file.
- **A golden file with no `-update` flag.** The test rewrites its own expectation and stops detecting anything.
- **A fake that reimplements the real logic.** At that point the test asserts that two implementations agree, and the real
  one is not tested.
- **A test that depends on `testdata` being the current directory.** Use a path relative to the test file.
- **A mock with an `EXPECT()` that is never called.** A mock in a codebase that stopped using it is dead weight that still
  compiles.

## Check yourself

Write a test that reads a fixture from `testdata` and compares the result with a golden file with an `-update` flag. Then
write an `fstest.MapFS` test for a function taking an `fs.FS`, and a fake with a call counter and an assertion on it.
