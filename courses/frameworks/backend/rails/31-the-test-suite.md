---
title: The test suite
summary: minitest, fixtures in YAML, and the one setting that made this suite fail on SQLite.
chapter: Testing
minutes: 13
status: draft
---

## What a generated application has

```text
test/models/book_test.rb
test/controllers/books_controller_test.rb
test/integration/borrowing_test.rb
test/fixtures/books.yml
test/test_helper.rb
```

`rails new` writes the setup and the first fixture, and each generator adds a test file and a fixture for what it
generated. The framework is minitest, the same one the Ruby course uses, and the assertions are the same.

```bash
bundle exec rails test
```

```text
Run options: --seed 2236

# Running:

.............................................................

Finished in 0.919456s, 66.3483 runs/s, 235.9850 assertions/s.

61 runs, 217 assertions, 0 failures, 0 errors, 0 skips
```

That is this application's suite: 61 tests across models, controllers and integration, in under a second.

## The test helper

```ruby
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require_relative "test_helpers/session_test_helper"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers. SQLite writes to one file,
    # so parallel workers contend for its write lock and the suite fails with
    # "database is locked". One worker by default; set PARALLEL_WORKERS to raise
    # it when the database is something that can take concurrent writers.
    parallelize(workers: Integer(ENV.fetch("PARALLEL_WORKERS", 1)), with: :threads)

    fixtures :all
  end
end
```

Two lines do most of the work. `fixtures :all` loads every fixture for every test, so a test starts from a known
database rather than from whatever ran before it. And `parallelize` is the line that had to be changed here.

The generated version was `parallelize(workers: :number_of_processors, with: :threads)`, which on this machine meant
sixteen workers over one SQLite file:

```text
LoanTest#test_returning_a_loan_puts_the_copy_back:
ActiveRecord::StatementTimeout: SQLite3::BusyException: database is locked
    app/models/loan.rb:35:in 'Loan#return!'
```

Two threads wrote to the same file at the same instant and one waited longer than the five-second timeout in
`config/database.yml`. The fix for SQLite is one worker, or a database that can take concurrent writers, and either way
the setting belongs with a comment so that nobody turns it back on to make the suite faster.

## Each kind of test

| Directory | Class | Tests |
| --- | --- | --- |
| `test/models` | `ActiveSupport::TestCase` | a model and its rules |
| `test/controllers` | `ActionDispatch::IntegrationTest` | one controller's actions |
| `test/integration` | `ActionDispatch::IntegrationTest` | a flow across requests |
| `test/system` | `ActionDispatch::SystemTestCase` | a real browser |
| `test/mailers`, `test/jobs`, `test/helpers` | their own base classes | one component each |

Controller and integration tests are the same class and differ in intent: one checks the responses of a resource, the
other walks a story. This application has one of each, and recording a loan end to end happens in the integration file.

## Fixtures

```yaml
# test/fixtures/books.yml
dune:
  title: Dune
  author: Frank Herbert
  genre: science-fiction
  copies: 3

darkness:
  title: The Left Hand of Darkness
  author: Ursula K. Le Guin
  genre: science-fiction
  copies: 0
```

A fixture is a row, named so a test can ask for it with `books(:dune)`. Fixtures load once and are used inside a
transaction that rolls back after each test, which is why a test that writes does not affect the next one.

Three things worth knowing in advance:

- A column the file does not set is nil or the database default, so a fixture with an accidental nil is a fixture that
  was not read closely.
- Fixture names are not ids. `books(:dune).id` is whatever the database assigned, so a test never writes a number.
- ERB works in a fixture, which is how the user fixture carries a real password digest:

```erb
<%# A fixture cannot hold a password, only the digest, so the digest is built
    when the fixture is loaded. Every user here has the password "password". %>
<% password_digest = BCrypt::Password.create("password") %>

librarian:
  email_address: librarian@northside.test
  password_digest: <%= password_digest %>
```

## Facts inside a test

A factory library builds records in the test instead of in a file, which reads better when a test needs a variation:

```ruby
book = create(:book, copies: 0, genre: "poetry")
```

The trade is that the data a test relies on is no longer visible in one file. My preference: fixtures for the handful of
records most tests share, and direct creation for anything specific to one test, which is what this application does.

```ruby
Loan.create!(book: books(:edda), member: members(:grace), days: 7)
```

That one line is the whole setup for the query-count test, and it is readable without knowing a factory's syntax.

## What to test

| Worth a test | Not worth a test |
| --- | --- |
| a validation and its message | that a gem works |
| a scope's result | that `find` finds |
| an authorisation rule, both ways | the framework's routing |
| a controller's response and status | every line of a view |
| a flow across several requests | a getter with no logic |
| a bug that was fixed | a number that will change |

The last row on the right is the one that ages worst: a test asserting a page has four rows fails when somebody adds a
record to a fixture for an unrelated reason. Assert on shape, on order and on relationships, and use a ceiling rather
than an exact count where a count is the point.

## Check yourself

Write a test for the loan rules through the model, then one for the same rule through the controller. Then run the suite
with two workers and read the failure for yourself.
