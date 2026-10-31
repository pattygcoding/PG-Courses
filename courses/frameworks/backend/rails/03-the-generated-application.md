---
title: The generated application
summary: What each directory is for, the config files that matter, and the command that describes the running app.
chapter: Getting started
minutes: 14
status: draft
---

## Rails about the application

```bash
bundle exec rails about
```

```text
About your application's environment
Rails version             8.1.4
Ruby version              ruby 3.4.7 (2025-10-08 revision 7a5688e2a2) +PRISM [x64-mingw-ucrt]
RubyGems version          3.6.9
Rack version              3.2.8
Middleware                ActionDispatch::HostAuthorization, Rack::Sendfile, ActionDispatch::Static,
                          Propshaft::Server, ActionDispatch::Executor, ActionDispatch::ServerTiming,
                          ActiveSupport::Cache::Strategy::LocalCache::Middleware, Rack::Runtime,
                          Rack::MethodOverride, ActionDispatch::RequestId, ActionDispatch::RemoteIp,
                          Propshaft::QuietAssets, Rails::Rack::Logger, ActionDispatch::ShowExceptions,
                          WebConsole::Middleware, ActionDispatch::DebugExceptions,
                          ActionDispatch::ActionableExceptions, ActionDispatch::Reloader,
                          ActionDispatch::Callbacks, ActiveRecord::Migration::CheckPending,
                          ActionDispatch::Cookies, ActionDispatch::Session::CookieStore,
                          ActionDispatch::Flash, ActionDispatch::ContentSecurityPolicy::Middleware,
                          Rack::Head, Rack::ConditionalGet, Rack::ETag, Rack::TempfileReaper
Application root          C:/Users/patty/Programming/Scrapyard/pg-rails-verify
Environment               development
Database adapter          sqlite3
Database schema version   0
```

Read that middleware list as the answer to "what happens to a request before my controller sees it". The entries worth
knowing:

| Middleware | Does |
| --- | --- |
| `HostAuthorization` | blocks requests whose `Host` header is not allowed |
| `Rack::MethodOverride` | lets a form send `_method=patch` and be treated as a PATCH |
| `RequestId` | tags each request for the logs |
| `DebugExceptions` | the error page with the code, development only |
| `WebConsole::Middleware` | the console on that error page, development only |
| `Reloader` | reloads application code between requests in development |
| `Migration::CheckPending` | refuses to serve a page while migrations are pending |
| `Cookies`, `Session::CookieStore`, `Flash` | session state, signed into a cookie |
| `ContentSecurityPolicy` | the header configured in `config/initializers/` |
| `ETag`, `ConditionalGet` | the rules behind a 304 response |

`ActionDispatch::ServerTiming` and `Propshaft::Server` are Rails 8 additions: the first adds a response header with
timings, the second serves assets from the pipeline's directory with no separate web server.

## The directories

```text
app/
  assets/          CSS and images, served by Propshaft as they are
  controllers/     one class per resource, actions as methods
  helpers/         view helpers, one module per controller by default
  javascript/      importmap entry point and Stimulus controllers
  jobs/            Active Job classes
  mailers/         Action Mailer classes and their views
  models/          Active Record classes and plain Ruby objects
  views/           ERB templates, in a directory per controller
config/
  environments/    development, test and production settings
  initializers/    files that run once at boot
  locales/         translations
db/
  migrate/         one file per schema change
  seeds.rb         the data a new environment starts with
bin/
  rails, rake      the commands, wrapped so they use the application's bundle
  ci               the whole CI pipeline as a Ruby file
  dev              starts the server and anything else development needs
  setup            installing a fresh checkout
test/
  models, controllers, integration  the three kinds of test this course writes
```

Two rules matter before writing anything. `app/` is autoloaded: the file path decides the constant name, so
`app/models/book.rb` defines `Book` and a file in the wrong place defines a constant nothing can find. And `lib/` is
not autoloaded, so application code belongs under `app/` in a directory that says what it is.


## The config files worth opening

| File | Holds |
| --- | --- |
| `config/application.rb` | the application class, autoload paths, framework settings |
| `config/environments/development.rb` | code reloading on, eager loading off, detailed logs |
| `config/environments/production.rb` | eager loading on, caching on, Solid Queue and Solid Cache |
| `config/database.yml` | the databases, one per environment |
| `config/routes.rb` | URLs to actions |
| `config/puma.rb` | the server: threads, workers, ports |
| `config/credentials.yml.enc` | secrets, encrypted, with `master.key` beside it |
| `config/importmap.rb` | which JavaScript the browser loads |
| `config/deploy.yml` | Kamal's deployment description |
| `config/ci.rb` | the pipeline that `bin/ci` runs |

`config/database.yml` in a Rails 8.1 application is worth reading in full, because the development and test databases
live under `storage/` rather than at the top level:

```yaml
development:
  <<: *default
  database: storage/development.sqlite3

production:
  primary:
    <<: *default
    database: storage/production.sqlite3
  cache:
    <<: *default
    database: storage/production_cache.sqlite3
    migrations_paths: db/cache_migrate
  queue:
    <<: *default
    database: storage/production_queue.sqlite3
    migrations_paths: db/queue_migrate
  cable:
    <<: *default
    database: storage/production_cable.sqlite3
    migrations_paths: db/cable_migrate
```

Four databases in production, and the subject of the Solid Queue chapter is why: caching, jobs and websockets each get
their own database file, so a queue that is writing hard cannot hold a lock on the table a page is reading. In
development and test there is one database and none of those three adapters is used.

## What boot does

```text
config/boot.rb          sets up Bundler and bootsnap
config/application.rb   requires the frameworks and defines the app
config/environment.rb   runs the initializers
config/initializers/    your setup, in alphabetical order
```

`config/boot.rb` requires `bootsnap/setup`, which caches the load path and bytecode so the second boot of an
application is much faster than the first. That is also the file whose `LoadError` announced the half-installed bundle
on the previous page.

Initializers run in alphabetical order, and one is the right place for configuration belonging to a library: time
zone, inflections, logging, a service client. The one to read first is `inflections.rb`, where you tell Rails that
`Book` pluralises as `Books` and that `Person` has many `People`.

## Where things are loaded from

```text
app/models/          loaded by Zeitwerk, one constant per file
app/controllers/     loaded by Zeitwerk
lib/                 not loaded unless you require it or add it to the autoload paths
test/                not loaded by the application at all
```

Zeitwerk is the autoloader, and it derives the constant from the path: `app/services/catalogue_search.rb` must define
`CatalogueSearch`. A name it cannot work out raises `Zeitwerk::NameError` at boot with the file and the expected
constant, which is the most useful error in the framework.

`eager_load_paths` in development is false, so a file is loaded when something refers to the constant. In production
it is true, so every file is loaded at boot and a missing one stops the deploy rather than the first request that
touches it.

## Check yourself

Run `rails about` and pick three middleware entries you cannot explain, then find each class in the gems under
`bundle show actionpack`. Then compare `config/environments/development.rb` with `production.rb` and list every
difference that changes how your code behaves.
