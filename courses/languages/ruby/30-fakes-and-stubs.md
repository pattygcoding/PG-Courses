---
title: Fakes and stubs
summary: A four-method object beats a mock, and minitest gives you both.
chapter: Gems and tests
minutes: 13
status: draft
---

## The test that does not need a file

The command line tool takes its store as an argument, so the tests hand it a stand-in:

```ruby
# A stand-in for the store that keeps everything in memory. The CLI only calls
# four methods on whatever it is given, so a test does not need files.
class FakeStore
  def initialize(catalogue:, loans: [])
    @catalogue = catalogue
    @loans = loans
  end

  attr_reader :loans

  def read_catalogue = @catalogue
  def read_loans = @loans
  def write_loans(loans) = @loans = loans
end
```

Twenty lines, no framework, and the CLI tests never touch the disk:

```ruby
class CLITest < Minitest::Test
  def setup
    @store = FakeStore.new(catalogue: catalogue)
    @out = StringIO.new
    @err = StringIO.new
  end

  def test_it_records_a_loan
    run_cli("lend", "dune", "--member=Ada Lovelace", "--days=7")

    assert_equal 0, @status
    assert_match(/Lent Dune to Ada Lovelace/, @out.string)
    assert_equal 1, @store.loans.size
  end
end
```

Three things made this possible, and none of them is a testing library:

- `FakeStore` responds to the four methods the CLI calls. It does not inherit from `Store` and it is not an
  interface; it is duck typing, which is why the trick works in Ruby and needs a framework in languages without it.
- The CLI takes `out` and `err` as arguments, so `StringIO` catches the output.
- The fake records what was written, so the test can assert on the effect rather than on the call.

A fake with behaviour is more useful than a mock that records calls. `@store.loans.size == 1` says the loan was
recorded; `expect(:write_loans, [loan])` says the method was called with that argument, which is a statement about
the implementation rather than about the result.

## Where a mock is right

`minitest/mock` is part of minitest 5 and gives you `stub` and `Minitest::Mock`:

```ruby
require "minitest/mock"

def test_a_stub_replaces_one_method
  store = Store.new("nowhere")

  store.stub(:read_loans, [ 1, 2, 3 ]) do
    assert_equal 3, Report.new(store: store).print_count
  end
end

def test_an_expectation_checks_it_was_called
  fake = Minitest::Mock.new
  fake.expect(:read_loans, [ 1 ])

  assert_equal 1, Report.new(store: fake).print_count
  fake.verify
end
```

`stub` replaces one method for the duration of the block, which is the whole toolkit for "this class reads a file and
I do not want it to". `Minitest::Mock` records expectations and `verify` fails the test if one was not met, which is
what you want when the *call* is the behaviour under test: a mailer that must send one email, a job that must be
enqueued.

Both are in the `minitest/mock` file rather than in minitest itself, and that file is not in the version of minitest
that Ruby 3.4 ships:

```text
cannot load such file -- minitest/mock (LoadError)
```

The previous page explains why, and the fix is the same: the project's gemspec pins `~> 5.25`, so
`bundle exec ruby mock_test.rb` finds it and a bare `ruby mock_test.rb` does not. When a test helper is missing
rather than wrong, check which version of the framework is loaded before rewriting the test.

## Capturing output

```ruby
def test_capture_io_reads_what_was_printed
  store = Store.new("nowhere")

  store.stub(:read_loans, [ 1, 2 ]) do
    out, _err = capture_io { Report.new(store: store).print_count }

    assert_equal "2 loans\n", out
  end
end
```

`capture_io` replaces `$stdout` and `$stderr` for the block and returns what was written to each. It is the framework
version of the `StringIO` trick, and it is the right tool when the class under test writes to the global stream rather
than to one it was given.

A run with the mock tests shows what happens without it:

```text
1 loans
...3 loans
..

5 runs, 5 assertions, 0 failures, 0 errors, 0 skips
```

The two lines are the code under test printing to a stream nothing captured. The tests pass, and the output is noisy
in a way that makes a real failure harder to spot.

## What to fake, and what not to

| Fake this | Because |
| --- | --- |
| the network | slow, unreliable, and the other end changes |
| the clock | a test that depends on today fails next month |
| a file system | except when the file work *is* the class, as in `Store` |
| random numbers | otherwise a seed-dependent failure is a flake |
| a paid API | cost, and rate limits |

Do not fake the class under test's own logic, and do not fake a value object: a `Book` takes four arguments and
answers immediately, so a fake would be more code than the real thing. The line to hold is that a fake replaces a
*collaborator* whose real version is slow, shared or unpredictable.

The one that pays off most is the clock, and the way to make it easy is to pass the day in:

```ruby
def overdue?(today = Date.today)
  due_on < today
end
```

That default argument is why the loan tests can pin an overdue loan and a loan due today without touching the system
clock. A method that reads `Date.today` inside its body with no way to pass one in is a method whose test will fail in
November.

## Check yourself

Write a fake for the store that raises when `read_loans` is called, and a test that asserts the CLI reports the error
and returns status 1. Then write the same test with `Minitest::Mock` and decide which of the two you would keep.
