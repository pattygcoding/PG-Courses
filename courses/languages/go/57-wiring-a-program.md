---
title: Wiring a program
summary: Constructors, a main that reads as a list of dependencies, and no globals.
chapter: Patterns and design
minutes: 12
status: draft
---

## Dependencies are parameters

```go
type Service struct {
	store  Store
	logger *slog.Logger
	clock  func() time.Time
}

func NewService(store Store, logger *slog.Logger) *Service {
	return &Service{
		store:  store,
		logger: logger,
		clock:  time.Now,
	}
}
```

A struct that takes what it needs is testable, and the constructor is the only place that has to get the defaults right.
`clock` is unexported with a default of `time.Now`, so a test in the same package sets it directly and a caller cannot.

The alternative, which is the thing to avoid:

```go
var db *sql.DB   // do not

func Save(row Row) error {
	return db.Exec(insertSQL, row.Key)
}
```

A package-level `db` makes the package untestable without replacing a global, hides the dependency from every signature, and
means `Save` cannot be used against a second database. It is two characters shorter than the version with a receiver, which
is why it happens.

## main is the wiring

```go
func main() {
	cfg, err := loadConfig()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}

	logger := newLogger(cfg.LogLevel)
	db, err := openDB(cfg.DatabaseURL)
	if err != nil {
		logger.Error("database", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	store := store.New(db)
	svc := service.New(store, logger)
	handler := api.NewHandler(svc, logger)

	if err := serve(cfg, handler, logger); err != nil {
		logger.Error("server", "err", err)
		os.Exit(1)
	}
}
```

`main` reads as a list of the program's dependencies in the order they are created, and it is the only place that knows which
implementation of each interface is used. The test for `service` never runs `main` and never needs a database, because the
wiring is a function rather than a package-level variable.

The property worth naming: **every line of `main` is a decision about what the program is made of**. A `main` with logic in
it hides those decisions in among the branches.

Two details in that function are worth copying: the `defer db.Close()` comes right after the successful open, and each
failure logs and exits with a status so a supervisor sees the failure rather than a container restarting happily.

## A container is a struct

```go
type app struct {
	cfg    Config
	logger *slog.Logger
	db     *sql.DB
	store  *store.Store
	svc    *service.Service
}

func newApp(ctx context.Context, cfg Config, logger *slog.Logger) (*app, error) {
	db, err := openDB(cfg.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	a := &app{cfg: cfg, logger: logger, db: db}
	a.store = store.New(db)
	a.svc = service.New(a.store, logger)

	return a, nil
}
```

An `app` struct holds the whole graph, which is what makes the shutdown order explicit in one place:

```go
func (a *app) close() error {
	return a.db.Close()
}
```

That is dependency injection without a framework: a constructor per component, a struct for the whole graph, and a `main`
that calls the constructors. The reasons to prefer it to a reflection-based container:

- **The graph is checked at compile time.** A missing dependency is a compile error rather than a panic at start-up.
- **The order is visible.** A container resolves in whatever order it can, and the shutdown order has to be inferred.
- **The tests are ordinary.** No container in the test, no registration, no reflection.
- **A failure is a return value.** `newApp` returns an error, and a container that fails to resolve panics or exits.

A framework earns its place in a program with hundreds of components and a plugin system where the graph is built from
configuration. Below that, the constructor-and-struct version is shorter and its failures are the ones the compiler catches.

## Groups of dependencies

```go
type Deps struct {
	Store  Store
	Logger *slog.Logger
	Clock  func() time.Time
}

func NewService(deps Deps) *Service { ... }
```

A `Deps` struct is worth it once a constructor takes more than four things, because the parameters stop fitting on a line.
The trade is that a caller can pass a zero `Deps` and get a nil logger, which the constructor has to defend against, so the
version with explicit parameters is the safer one until the count is genuinely annoying.

The other option is functional options, which the previous lesson covers, and it works well for a component with many
optional settings and a few required ones:

```go
func NewService(store Store, opts ...Option) *Service
```

## Where to draw the line

- **A dependency that does I/O**: an interface, declared by the consumer.
- **A dependency that is a value**: a parameter, no interface.
- **A dependency that is a standard library type**: take the type, not an interface around it.
- **A package's own helper**: an unexported function.
- **A global that is read everywhere**: a parameter, which is the whole point of this lesson.

The interface only for the first of those is the rule I use: an interface is for a boundary that a test has to cross or an
implementation that has to change, and everything else is a value.

## Check yourself

Take a package that uses a package-level database handle and rewrite it so the handle is a field, with a constructor that
takes it. Write the `main` that wires the program up and count the lines that are decisions rather than setup, then write a
test for the component that needs no database.
