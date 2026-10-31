---
title: Observability
summary: The pprof endpoints, structured logs with a request id, and the metrics worth having.
chapter: Building and shipping
minutes: 13
status: draft
---

## pprof is one import away

```go
import _ "net/http/pprof"
```

```text
Types of profiles available:
allocs       A sampling of all past memory allocations
block        Stack traces that led to blocking on synchronization primitives
cmdline      The command line invocation of the current program
goroutine    Stack traces of all current goroutines
heap         A sampling of memory allocations of live objects
mutex        Stack traces of holders of contended mutexes
profile      CPU profile
symbol       Maps given program counters to function names
threadcreate Stack traces that led to the creation of new OS threads
trace        A trace of execution of the current program
```

The blank import registers handlers on `http.DefaultServeMux`, so a server already using the default mux exposes all of them
at `/debug/pprof/`. Each one is a live view of the running process:

```bash
go tool pprof -http :8080 http://localhost:6060/debug/pprof/profile?seconds=30
go tool pprof -http :8080 http://localhost:6060/debug/pprof/heap
go tool pprof -top http://localhost:6060/debug/pprof/goroutine
```

`profile` is a CPU sample of thirty seconds, `heap` is the live objects, `goroutine` is every goroutine's stack and `trace`
is an execution trace for `go tool trace`. Those four are enough to diagnose a service that is slow, leaking, stuck or
scheduled badly, and none of them needs a rebuild or a restart.

```go
import _ "net/http/pprof"

go func() {
	_ = http.ListenAndServe("localhost:6060", nil)
}()
```

That is the version I use in a server: a second listener on localhost, so an operator reaches it through a port forward or an
SSH tunnel and nothing public exposes it. The `goroutine` profile is a dump of every stack in the process and `cmdline`
prints the arguments, which may include a credential.

The production question worth answering in advance is how you reach that port during an incident. A sidecar, a port forward
or an authenticated internal route are the three answers, and the one that does not work is the one nobody tested until it
was needed.

## Structured logs with a request id

```go
type ctxKey int

const requestIDKey ctxKey = iota

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Request-ID")
		if id == "" {
			id = randomID()
		}

		ctx := context.WithValue(r.Context(), requestIDKey, id)
		w.Header().Set("X-Request-ID", id)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

The middleware puts an id on the request context and echoes it in a response header, so a user reporting a failure can quote
the id and the log lines can be found. A handler reads it through a function rather than through `ctx.Value` at each call
site:

```go
func requestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}
```

A logger carrying the id is the pattern that makes the log usable:

```go
logger := slog.Default().With("request_id", requestID(r.Context()))
logger.Info("handling", "path", r.URL.Path)
```

Every record from that request then carries the id and a log collector can group by it. Taking an `X-Request-ID` from the
client when it sends one is worth doing, because that is how a trace id from an upstream service survives the hop.

## The metrics worth having

```go
var (
	requestsTotal = expvar.NewInt("requests_total")
	inFlight      = expvar.NewInt("requests_in_flight")
)
```

`expvar` publishes counters on `/debug/vars` as JSON with no dependency, which is the smallest possible metrics setup:

```json
{
  "requests_total": 1043,
  "requests_in_flight": 2,
  "memstats": { "Alloc": 4291832, "NumGC": 12 }
}
```

`expvar` gives counters and gauges and nothing else, which is enough for four numbers and not enough for anything with
labels. `prometheus/client_golang` is the dependency to add when a metric needs a dimension:

```go
var requests = promauto.NewCounterVec(prometheus.CounterOpts{
	Name: "http_requests_total",
	Help: "Total requests by route and status.",
}, []string{"route", "status"})
```

The four signals to start with for an HTTP service:

| Signal | Metric |
| --- | --- |
| Traffic | requests per second, by route |
| Errors | the 5xx rate per route |
| Latency | a histogram of request duration |
| Saturation | in-flight requests, and the goroutine count |

Latency is worth a histogram rather than an average, because an average hides the slow requests that users notice. The p99
is the number to alert on and the p50 is the one to put beside it on a dashboard.

A label whose values are unbounded is the mistake to avoid: `path` as a label on a service with user ids in the URL creates a
series per user and the metrics system falls over. The fix is a route pattern rather than a path, which is what the
`ServeMux` pattern gives you in Go 1.22 and later:

```go
pattern := r.Pattern   // "GET /rows/{key}"
```

## A trace when the logs are not enough

A request touching four services produces four sets of logs, and correlating them by hand is the slow part of an incident.
`go.opentelemetry.io/otel` is the library for that: a span per operation, a trace id across the services, and the context
carries it.

```go
ctx, span := tracer.Start(ctx, "loadRows")
defer span.End()
```

The setup is more than a page can cover, and the reason to mention it is the design consequence: because a context flows
through every call, the trace attaches to the request and travels with it. That is why the context lesson's "pass it as the
first parameter" rule matters beyond cancellation, and why a function that drops its context breaks tracing as well as
timeouts.

## What I would ship

1. **`slog` with a JSON handler** in production and a text handler locally.
2. **A request id** in the context, echoed in a header and in every log record.
3. **Four metrics**: requests, errors, a latency histogram and in-flight.
4. **A pprof listener on localhost**, with the access path documented.
5. **`/healthz` and `/readyz`**, where health means the process is running and ready means it can serve traffic.
6. **No secrets in a log line**, which is a rule and a test on the output rather than a hope.

The health and readiness distinction is worth two endpoints: an orchestrator restarts a process that fails its liveness check
and takes a failing one out of the load balancer, so a single endpoint for both means a restart every time a dependency
blips.

## Check yourself

Add the pprof import, expose it on a second listener and take a thirty-second CPU profile of a busy handler with
`go tool pprof -http`. Then add a request id middleware and a `With` logger, confirm every record from one request carries
the id, and publish two counters with `expvar` and read them from `/debug/vars`.
