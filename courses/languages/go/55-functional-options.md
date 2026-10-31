---
title: Functional options
summary: A variadic function of setters, why Go uses it, and when an options struct is simpler.
chapter: Patterns and design
minutes: 13
status: draft
---

## The problem an options type solves

```go
func NewServer(addr string, readTimeout time.Duration, writeTimeout time.Duration) *Server
```

Two problems. Adding a parameter breaks every caller, and a call with four arguments reads as
`NewServer(":8080", 5*time.Second, 10*time.Second)` with nothing at the call site saying which timeout is which.

The alternatives in Go:

| Style | Cost |
| --- | --- |
| Positional parameters | unreadable past three, and breaking on every addition |
| An options struct | the caller writes every field, and the zero value has to mean something |
| A pointer options struct | `nil` handling in every call, and no validation |
| Functional options | one type and one loop, and the call site reads well |
| A builder | a second type to maintain |

## The pattern

```go
type Option func(*Server)

func WithReadTimeout(d time.Duration) Option {
	return func(s *Server) {
		s.readTimeout = d
	}
}

func WithLogger(l *slog.Logger) Option {
	return func(s *Server) {
		s.logger = l
	}
}

func NewServer(addr string, opts ...Option) *Server {
	s := &Server{
		addr:         addr,
		readTimeout:  5 * time.Second,
		writeTimeout: 10 * time.Second,
		logger:       slog.Default(),
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}
```

```go
srv := NewServer(":8080", WithReadTimeout(2*time.Second), WithLogger(logger))
```

Four things make that work:

1. **The defaults are in the constructor**, not in the option, so a zero value in the struct never reaches a caller.
2. **The `Option` type is exported and its shape is not.** A caller cannot construct a broken one by accident, and the fields
   of `Server` stay private.
3. **A variadic parameter keeps the call site short.** One option or five, and no `nil` to pass.
4. **Each option is a function with a name that reads**, so `WithReadTimeout(2*time.Second)` is a sentence.

Validation goes in the option or in the constructor, and the choice matters:

```go
func WithRetries(n int) Option {
	return func(s *Server) {
		if n < 0 {
			n = 0
		}

		s.retries = n
	}
}
```

Clamping in the option is the version that never fails, and returning an error from an option is not possible with this
shape. When a bad value has to be reported, the constructor validates after the loop and returns an error:

```go
func NewServer(addr string, opts ...Option) (*Server, error)
```

That pair, options for the common case and an error for an impossible one, is the arrangement I use.

## Keeping the configurable fields separate

```go
type Server struct {
	addr string
	options
}

type options struct {
	readTimeout time.Duration
	retries     int
}

func WithRetries(n int) Option {
	return func(s *Server) {
		s.retries = n
	}
}
```

Splitting the configurable fields into an embedded struct keeps `Server`'s own state separate from what a caller can set,
which matters once the struct grows past a handful of fields. It is the shape `net/http` and `grpc` use, and it means the
option functions all touch one place.

A reusable option across two types needs a small adapter:

```go
type timeout time.Duration

func (t timeout) applyServer(s *Server) { s.readTimeout = time.Duration(t) }
func (t timeout) applyClient(c *Client) { c.timeout = time.Duration(t) }
```

That is how one `WithTimeout` serves both, and it is worth it only after the second type exists. The single-type version above
is twenty lines and covers most cases.

## Where an options struct is the better answer

```go
type Config struct {
	Addr         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	Retries      int
}

func DefaultConfig() Config {
	return Config{
		Addr:         ":8080",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		Retries:      3,
	}
}
```

An exported struct with a `DefaultConfig()` function is simpler when:

- **The options come from a file or the environment**, because a struct is what a decoder produces and a JSON decoder cannot
  produce a functional option.
- **Every value is optional and the zero value is meaningful**, so absent and empty mean the same thing.
- **There are more than about eight options**, at which point the list of `With` functions is longer than the struct.
- **The struct is also the configuration of something else**, such as an `http.Server`.

The pairing that works for a service is both: a `Config` that is decoded from the environment, and a constructor that takes
it. Functional options are for a library whose caller sets two things.

## The complaints, answered

- **It hides the fields.** That is the point: the option names are the API and the fields are free to change.
- **It is a lot of code for one option.** Then take a parameter. The pattern earns itself at three options or the first time a
  caller has to skip one.
- **`WithX(0)` and no `WithX` mean different things.** Usually true, and worth documenting: the option sets a value and the
  default lives in the constructor, so a caller who wants zero has to say so.
- **The options cannot be inspected.** A library that needs to read what was set can record the applied values, or a test can
  assert on the result.

The one real cost is the debugging experience: a struct built by ten option functions shows nothing useful in a debugger
until the loop has run, and printing the `Server` after construction is how to see the result. That is a small price for an
API a caller can read at the call site.

## Check yourself

Write a constructor with three functional options and the defaults in the constructor, then add a fourth option and confirm
no caller changes. Write the same thing as a config struct with a `Default()` function and compare the two call sites, then
decide which you would give a library and which a service.
