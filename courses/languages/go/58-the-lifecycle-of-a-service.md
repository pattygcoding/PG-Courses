---
title: The lifecycle of a service
summary: Starting in order, stopping in reverse, and the part a deployment depends on.
chapter: Patterns and design
minutes: 12
status: draft
---

## A service has three phases

```go
func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "err", err)
		os.Exit(1)
	}
}
```

A `main` that does nothing but call `run` and report the error is the shape everything else needs: `run` returns an error,
the deferred calls inside it work, and there is exactly one place that exits the process. `os.Exit` in the middle of a
function skips every `defer` in the stack, which is why the exit belongs at the top.

```go
func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := loadConfig()
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}

	logger := newLogger(cfg.LogLevel)

	db, err := openDB(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("database: %w", err)
	}
	defer db.Close()

	srv := newServer(cfg, db, logger)

	return serve(ctx, srv, logger)
}
```

Three phases: start the things that have to start in order, run until the context is cancelled, and let the deferred calls
release in reverse. The `signal.NotifyContext` at the top makes the whole function tree cancellable from one line, and
`SIGTERM` is what a container runtime sends before it kills the process.

## Startup order

1. **The configuration**, because everything else needs it.
2. **The logger**, because a later failure has to be reported.
3. **The database**, with a ping and a timeout, so a bad connection string fails at start rather than on the first request.
4. **The migrations**, if the service owns its schema.
5. **The handlers and the server**, which connect to nothing until the first request.
6. **The listener**, last, so nothing accepts traffic before the dependencies are ready.

```go
pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()

if err := db.PingContext(pingCtx); err != nil {
	return fmt.Errorf("database ping: %w", err)
}
```

That ping is the difference between a container that fails its readiness check and one that starts, reports healthy and
returns a 500 for the first thirty seconds. A readiness check only protects a deployment if it fails when a dependency is
unavailable.

## Shutdown order, which is the reverse

```go
func serve(ctx context.Context, srv *http.Server, logger *slog.Logger) error {
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("listen", "err", err)
		}
	}()

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	logger.Info("shutting down")

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}

	return nil
}
```

1. **Stop accepting new work**, which is what `Shutdown` does first.
2. **Wait for in-flight requests**, up to the deadline.
3. **Stop the background workers**, by cancelling their context.
4. **Wait for the workers**, with a `WaitGroup`.
5. **Close the resources** in reverse order of opening, which the `defer`s do.

The order matters for one reason above all: a request arriving during the shutdown has to be served or refused, and a process
that exits between the two produces a connection reset the client cannot tell from a crash. A load balancer that removes the
instance before sending `SIGTERM` is what makes this invisible, and the readiness endpoint is what tells it to.

`Shutdown` does not wait for a handler that never returns, so the deadline is what stops a stuck request from holding the
process open until the orchestrator kills it. Fifteen seconds is a reasonable figure; the number to choose is the longest
request the service is willing to finish.

## The parts that are easy to forget

- **A background goroutine with no way to stop.** A poller started in `run` and cancelled by nothing keeps the process alive
  and the shutdown waiting. It needs the context, and the `WaitGroup` is what proves it stopped.
- **A connection pool closed before the requests finish.** `db.Close()` deferred in `run` runs after `serve` returns, which is
  after the shutdown, which is the right order.
- **A migration that runs on every start.** Fine for a small service, and a lock-by-design problem for two replicas starting
  at once, which is what a migration tool with an advisory lock is for.
- **A kill after the grace period.** The orchestrator sends `SIGTERM`, waits, then kills. The service's deadline has to be
  shorter than the orchestrator's grace period, and both numbers belong in a comment.
- **A health endpoint that checks the database.** That turns every dependency blip into a restart of every replica, which is
  the opposite of what the check is for.

## The two endpoints

```go
mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
})

mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		http.Error(w, "not ready", http.StatusServiceUnavailable)
		return
	}

	w.WriteHeader(http.StatusOK)
})
```

`/healthz` says the process is alive and does no I/O, so it is the liveness check. `/readyz` says the service can serve
traffic now, so it is the readiness check and it is allowed to fail temporarily. An orchestrator restarts a process that
fails liveness and takes one out of rotation for readiness, which is why they cannot be the same endpoint.

## Running the same code as a CLI

```go
func run(ctx context.Context, args []string, stdout io.Writer) error
```

A `run` signature that takes its arguments and its output is a program a test can drive: the test calls `run` with a slice
and a buffer, and `main` passes `os.Args` and `os.Stdout`. That is how a command line tool gets coverage for its flags and
its output without spawning a process, and it is the same idea as taking an `fs.FS` instead of reading the disk.

```go
func TestRun(t *testing.T) {
	var buf bytes.Buffer

	if err := run(t.Context(), []string{"-n", "3"}, &buf); err != nil {
		t.Fatal(err)
	}

	if !strings.Contains(buf.String(), "3") {
		t.Errorf("output = %q, want it to mention 3", buf.String())
	}
}
```

## Check yourself

Write a `main` that only calls `run`, and a `run` that takes a context and returns an error. Start a database connection, a
server and a background worker, cancel the context and confirm the shutdown order, then add a `/healthz` and a `/readyz` and
explain which one an orchestrator restarts.
