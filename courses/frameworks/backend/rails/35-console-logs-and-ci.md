---
title: Console, logs and CI
summary: The three commands that answer most questions, and the CI file the generator wrote.
chapter: Operations
minutes: 14
status: draft
---

## The console

```bash
bundle exec rails console
bundle exec rails console --sandbox
```

```irb
>> Book.count
=> 4
>> Book.find_by(title: "Dune").loans.outstanding.count
=> 2
```

The console is an `irb` session with the application loaded, which is why every example in this course can be checked in
it. `--sandbox` wraps everything in a transaction that is rolled back on exit, which is the habit to have on a production
console:

```irb
>> Book.first.update(copies: 0)
...
>> exit
ROLLBACK
```

Every change is undone and the message says so. Without `--sandbox`, that console is live.

Two mistakes are worth naming because they waste the most time. A change to a model or controller needs `reload!` in the
console before it takes effect. And a console is a *different process* from the server, so `Current.user` is nil in it and
a broadcast from it may not arrive in a browser: the generated `cable.yml` says as much in its own comment.

## runner, for one command

```bash
bundle exec rails runner "puts Book.count"
```

```text
4
```

```bash
bundle exec rails runner "puts Loan.overdue.includes(:book, :member).map { |loan| [loan.member.name, loan.book.title, loan.due_on].join(' | ') }"
```

```text
Ada Lovelace | Dune | 2026-10-25
```

That output came from the running application, and it is the shape of a report: build a query, print a line per row.
`runner` boots the application, runs the string and exits, which makes it the tool for a cron job, a one-off migration and
a check in a deploy script:

```bash
bundle exec rails runner -e production "puts User.count"
```

`rails dbconsole` is the third of the set: it opens the database's own client with the credentials from `database.yml`,
so a query can be run without the application in the way.

## Logs

```text
Started GET "/books/3" for 127.0.0.1 at 2026-10-31 10:09:15 -0400
Processing by BooksController#show as HTML
  Parameters: {"id" => "3"}
  Book Load (0.2ms)  SELECT "books".* FROM "books" WHERE "books"."id" = ? LIMIT ?
  ↳ app/controllers/books_controller.rb:12:in 'show'
Rendered books/show.html.erb within layouts/application (Duration: 5.2ms)
Completed 200 OK in 13ms (Views: 6.9ms | ActiveRecord: 0.4ms (6 queries, 0 cached))
```

`log/development.log` has that, appended, for every request. It is the first place to look for a slow page, an N+1, or a
request that did not do what the controller appears to say.

```ruby
Rails.logger.debug "the params were #{params.inspect}"
Rails.logger.info "lending #{book.id} to #{member.id}"
Rails.logger.warn "no catalogue file, starting empty"
Rails.logger.error "payment failed for loan #{loan.id}"
```

The levels map to a setting per environment:

```ruby
config.log_level = :debug   # development
config.log_level = :info    # production
```

Production writes `:info` and above, which is what makes a `debug` line a development tool rather than a record.
`Rails.logger.tagged("loan-#{loan.id}") { ... }` prefixes everything inside the block, which is how a job's lines are
found among the rest.


## Debugging

```ruby
def create
  @book = Book.find(params[:id])
  binding.break                               # stops here
  @loan = @book.loans.build(...)
end
```

`rails new` puts the `debug` gem in the development and test groups, and it gives you a breakpoint that opens an `irb`
session with the local variables in scope. It is the fastest way to answer "what is in `params` here" without editing the
controller to print it.

The web console is the other half: `WebConsole::Middleware` is in the stack in development, so an error page has a
console at the bottom of it with the request in scope. That is why a development error page is far more useful than a
production one, and why `config.consider_all_requests_local` is false in production.

## The generated scripts

```bash
bin/setup              # install gems, prepare the database, start the server
bin/setup --skip-server
bin/dev                # start whatever development needs
bin/ci                 # the whole CI pipeline
```

`bin/dev` in a Rails 8.1 application is one line:

```ruby
exec "./bin/rails", "server", *ARGV
```

It exists as a name so that a project which later needs a CSS watcher, a job worker or a websocket server has somewhere to
put them, and a contributor's habits do not change when it does.

`bin/ci` is where the checks live, and its steps are a Ruby file:

```ruby
CI.run do
  step "Setup", "bin/setup --skip-server"

  step "Style: Ruby", "bin/rubocop"

  step "Security: Gem audit", "bin/bundler-audit"
  step "Security: Importmap vulnerability audit", "bin/importmap audit"
  step "Security: Brakeman code analysis", "bin/brakeman --quiet --no-pager --exit-on-warn --exit-on-error"
  step "Tests: Rails", "bin/rails test"
  step "Tests: Seeds", "env RAILS_ENV=test bin/rails db:seed:replant"
end
```

Two things in that file are worth copying into any project. `bin/setup --skip-server` is a step, so a fresh clone that
cannot be set up fails the pipeline rather than the test step. And the seeds are tested separately, which is the check that
finds a `seeds.rb` broken by a validation added three months after it was written.

Whatever runs that file, the steps are the ones a person runs:

```text
bin/rubocop                   56 files inspected, no offenses detected
bin/brakeman -q --no-pager    Security Warnings: 0
bundle exec rails test        61 runs, 217 assertions, 0 failures, 0 errors, 0 skips
```

## Where a step in a pipeline belongs

| Check | Runs in |
| --- | --- |
| formatting and style | every commit, in seconds |
| a static security scan | every commit |
| the test suite | every commit |
| the seeds | every commit, because they break silently |
| the container build | before a deploy |
| a smoke test against the deployed app | after a deploy |

The last two are the ones people add late and wish they had added earlier. A Docker build that has been broken for two
weeks is discovered at the worst moment, and nothing catches a deploy that started, passed its health check and serves
errors for one route.

## Check yourself

Run `bin/ci` and read the steps in order. Then break a validation in `db/seeds.rb`, run `bin/ci` again, and explain which
step caught it and why the seed step exists separately from the test step.

What must never be logged is a password or a token, and that is what the filter list from the configuration page is for:

```ruby
Rails.application.config.filter_parameters += [ :password, :token, :secret, :card ]
```

Anything named there shows as `[FILTERED]`, so a password field is not written in plain text an hour before somebody
pastes a log into a chat.
