---
title: Return or log, not both
summary: Where an error is handled, where it is logged, and why doing both makes a mess.
chapter: Errors and reliability
minutes: 12
status: draft
---

## An error travels until somebody can act on it

The two rules that between them describe most of Go error handling:

1. **A function returns the error and adds context.** It does not log it, because it does not know whether the caller will
   handle it.
2. **One place at the top decides what to do.** It logs, it retries, it returns a 500, or it exits.

The failure mode both rules prevent is the same error logged at four levels as it unwinds, which turns one line of log into
four with no extra information and makes every request produce a wall of output. The other failure mode is an error that is
logged once and then returned as `nil`, which means nobody above knows anything went wrong.

```go
func loadConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("reading %s: %w", path, err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parsing %s: %w", path, err)
	}

	return cfg, nil
}
```

That function returns and wraps, and it logs nothing. The caller has the path in the message, so a log line at the top has
everything it needs, and a test can assert on the error without capturing log output.

## The boundary is where logging belongs

```go
func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}
```

For a command line tool the boundary is `main`: one place with one `slog.Error` and one exit code. Everything below it
returns, which is why the error can be checked in a test.

For an HTTP service the boundary is the handler chain, and the shape is a handler that returns an error wrapped by a
middleware that converts it to a status and logs it once. That is also where a request id belongs, so every line from one
request can be found together.

## What slog gives you

```go
slog.Info("started", "port", 8080, "env", "dev")
```

```text
time=2026-10-31T02:04:22.299-04:00 level=INFO msg=started port=8080 env=dev
```

`log/slog` is the structured logger that arrived in Go 1.21. A record is a level, a message and a list of key-value pairs,
and the handler decides the format: `TextHandler` for a terminal, `JSONHandler` for anything a machine reads.

```go
slog.Error("failed", "err", os.ErrNotExist)
```

```text
time=2026-10-31T02:04:22.300-04:00 level=ERROR msg=failed err="file does not exist"
```

An `error` value is rendered as its message, so a record carries the error with no formatting at the call site. An attribute
containing a space is quoted, which is the text handler keeping the output parseable.

## Levels, groups and the logger you carry

```go
handler := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})
logger := slog.New(handler)

logger = logger.With("component", "report")
logger.Info("with attrs")
```

```text
time=2026-10-31T02:04:22.300-04:00 level=INFO msg="with attrs" component=report
```

`With` returns a logger that adds those attributes to every record, which is how a component name or a request id is
attached once rather than repeated in forty calls. The JSON handler writes the same record as an object:

```text
{"time":"2026-10-31T02:04:22.3003988-04:00","level":"INFO","msg":"started","port":8080}
```

That is the format to log in a container, because a collector can index the fields instead of parsing a string. The
handler's `Level` is the threshold and the four levels are `Debug`, `Info`, `Warn` and `Error`; a `Debug` call is compiled
in rather than removed, so the cost is a check per call.

```go
group := slog.Group("request", "method", "GET", "path", "/rows")
logger.Info("handled", group)
```

```text
time=2026-10-31T02:04:22.300-04:00 level=INFO msg=handled component=report request.method=GET request.path=/rows
```

A group namespaces attributes under a prefix, so the text handler writes `request.method` and the JSON handler nests an
object. It is how a record stays readable once it has eight attributes.

## What I log

- **Once, at the boundary**, with the request id and the path.
- **The error itself**, so the chain arrives with the context every layer added.
- **A level that means something.** `Warn` for something that recovered, `Error` for something a human should look at,
  `Info` for a state change, `Debug` for detail that is off in production.
- **Not the value that failed when it could be a secret.** A password, a token and a whole config struct are the three to
  keep out, and the config struct is the one that gets logged by accident.

## The mistakes

| Mistake | Effect |
| --- | --- |
| log and return | the error is logged twice, once with less context |
| log and return `nil` | the failure disappears |
| wrap with the function name | a chain of noise the stack trace already had |
| log a whole struct | fields you did not intend, possibly a secret |
| `log.Fatal` in a library | the process exits and no test can catch it |
| `os.Exit` in a function with a `defer` | the deferred cleanup does not run |

`log.Fatal` is worth naming because it breaks tests: it calls `os.Exit`, so a deferred cleanup does not run and a test
process dies. A library returns an error and the program's `main` decides what to do.

## Check yourself

Take a function in a codebase that logs an error and returns it, remove the log, and move the logging to the top of the call
chain. Then log the same record through a text handler and a JSON handler and compare the two, and add a `With` logger to a
service and check that every record carries the attribute.
