---
title: Files and io
summary: Reader, Writer, the buffered reader that does the work, and the deferred close.
chapter: The standard library
minutes: 13
status: draft
---

## The two interfaces everything implements

```go
type Reader interface {
	Read(p []byte) (n int, err error)
}

type Writer interface {
	Write(p []byte) (n int, err error)
}
```

A file, a network connection, a compressed stream, a byte buffer, an HTTP response body and a string reader all satisfy
those two. The consequence is that a function written against them works on all of them, and the standard library's own
functions are written that way:

```go
func Copy(dst Writer, src Reader) (written int64, err error)
```

`io.Copy` is what to reach for instead of a read loop. It uses `WriterTo` or `ReaderFrom` when the pair supports one, so
`io.Copy(&buf, file)` and `io.Copy(file, resp.Body)` take a fast path rather than copying byte by byte.

| Function | Use |
| --- | --- |
| `io.Copy` | move everything from a reader to a writer |
| `io.CopyN` | move exactly n bytes |
| `io.ReadAll` | read everything into a `[]byte` |
| `io.Discard` | a writer that throws the data away |
| `io.MultiWriter` | write to several writers at once |
| `io.MultiReader` | read from several readers in order |
| `io.LimitReader` | stop a reader after n bytes |
| `io.TeeReader` | read and write the same data elsewhere |

`io.LimitReader` is the one to remember for safety: reading an HTTP body into memory with no limit is how a service runs out
of memory, and wrapping the body in a limit is one line.

## Reading a small file

```go
data, err := os.ReadFile(path)
if err != nil {
	return fmt.Errorf("reading %s: %w", path, err)
}
```

`os.ReadFile` opens, reads to the end, closes and returns the bytes, which removes four lines and a `defer` from the common
case. `os.WriteFile` is the same for writing. For a file that is large, is a stream, or is read more than once, the
open-and-defer version is the right one:

```go
f, err := os.Open(path)
if err != nil {
	return nil, fmt.Errorf("opening %s: %w", path, err)
}
defer f.Close()

return io.ReadAll(f)
```

`os.Create` is `os.OpenFile` with the flags for create, truncate and write. `os.OpenFile` is the one to use when the file
mode matters or the file must not be truncated.

## Scanning lines

```go
scanner := bufio.NewScanner(f)

for scanner.Scan() {
	line := scanner.Text()
	...
}

if err := scanner.Err(); err != nil {
	return fmt.Errorf("reading %s: %w", path, err)
}
```

`bufio.Scanner` reads line by line with a default buffer, and `scanner.Err()` is not optional: the loop ends either because
the input ended or because a read failed, and the two look identical without the check.

The default limit is 64 KB per line, and a longer line produces `bufio.Scanner: token too long`. A large JSON document on one
line hits that, and the fix is a bigger buffer or a different reader:

```go
scanner.Buffer(make([]byte, 0, 1024*1024), 1024*1024)
```

For a genuinely large file the alternative is `bufio.Reader.ReadString('\n')` or reading in chunks, because a scanner
buffers a whole token before returning it.

## Writing with a buffer

```go
f, err := os.Create(path)
if err != nil {
	return err
}
defer f.Close()

w := bufio.NewWriter(f)

for _, row := range rows {
	fmt.Fprintln(w, row)
}

return w.Flush()
```

```text
flushed: <nil>
closed: <nil>
```

A `bufio.Writer` collects writes and issues them in 4 KB chunks, so a loop of a thousand `Fprintln` calls becomes a handful
of syscalls. The `Flush` is what commits the last partial buffer, and forgetting it loses the tail of the output with no
error at all, which is why it goes on the line before the return.

## Walking a directory

```go
err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
	if err != nil {
		return err
	}

	if d.IsDir() || filepath.Ext(path) != ".json" {
		return nil
	}

	return load(path)
})
```

`filepath.WalkDir` is the modern walker: it hands each entry an `fs.DirEntry`, which carries the type information without a
second `stat` call, and its `err` parameter is the error from reading that directory. Returning `filepath.SkipDir` from a
directory skips its contents, and `fs.SkipAll` stops the walk, which is how a filter with an early exit is written.

`os.ReadDir` returns the entries sorted by name, and each `DirEntry` has `Name`, `IsDir`, `Type` and `Info`. That is the
non-recursive version and the one to use for a single level.

Use `filepath.Join` rather than string concatenation, and `filepath.Ext`, `filepath.Base` and `filepath.Dir` for the parts.
`path` and `path/filepath` are different packages: `path` is for URLs and always uses `/`, `filepath` is for the local
filesystem and uses the separator the platform uses.

## The embedded filesystem

```go
import "embed"

//go:embed sql/*.sql
var queries embed.FS

data, err := queries.ReadFile("sql/rows.sql")
```

`embed` puts files into the binary at build time, so a program that ships with templates, migrations or a default
configuration needs no files beside it. `embed.FS` satisfies `fs.FS`, which means a function can take an `fs.FS` and be
given the embedded one in production and a directory in a test:

```go
func loadMigrations(fsys fs.FS) error
```

That signature is the pattern worth copying: the caller decides whether the files come from the binary or the disk, and the
function needs no knowledge of either. `testing/fstest` has an in-memory `MapFS` for the third case, which is what a test of
a file-reading function wants.

## The rules

1. `os.ReadFile` for a small file, open and defer for anything else.
2. `defer` the close on the line after the error check.
3. Check `scanner.Err()` after the loop.
4. Flush a buffered writer before returning.
5. Limit what you read from outside the program.
6. Take an `fs.FS` where the files might be embedded.

## Check yourself

Write a program that reads a file line by line and counts the lines, with the `scanner.Err()` check. Write one that
generates a file with a buffered writer and confirm the flush. Then embed a file with `//go:embed` and read it through the
same function that reads it from disk.
