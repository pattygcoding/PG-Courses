---
title: Minitest
summary: One file per class, assertions that say what failed, and the version that ships with Ruby.
chapter: Gems and tests
minutes: 14
status: draft
---

## The framework

Minitest ships with Ruby. A test file is a class that inherits from `Minitest::Test`, with methods whose names start
with `test`, and `minitest/autorun` runs them all when the file is executed:

```ruby
# frozen_string_literal: true

require_relative "test_helper"

class BookTest < Minitest::Test
  def test_a_book_has_a_genre_label
    book = Northside::Book.new(id: "dune", title: "Dune", author: "Frank Herbert", genre: "science-fiction")

    assert_equal "Science Fiction", book.genre_label
  end

  def test_a_book_with_no_copies_is_not_available
    book = Northside::Book.new(id: "dune", title: "Dune", author: "Frank Herbert", genre: "science-fiction", copies: 0)

    refute book.available?
  end
end
```

That is the whole shape. There is no configuration file, no runner to register and no assertion library to add.

The output of a run is the other half of the design:

```text
Finished in 0.024904s, 1847.0706 runs/s, 4095.6783 assertions/s.

46 runs, 102 assertions, 0 failures, 0 errors, 0 skips
```

Counts of runs, assertions and failures. A failure prints the test's name, the file and line, what was expected and
what was found:

```text
  1) Failure:
BookTest#test_a_book_has_a_genre_label [test/book_test.rb:8]:
Expected: "Science Fiction"
  Actual: "Science fiction"
```

That is a bug report you can act on without re-running anything.

## The assertions

| Assertion | Asks |
| --- | --- |
| `assert_equal expected, actual` | `expected == actual` |
| `assert_nil value` | the value is nil |
| `assert_empty collection` | the collection is empty |
| `assert_includes collection, value` | membership |
| `assert_instance_of klass, value` | the class, exactly |
| `assert_kind_of klass, value` | the class or a subclass |
| `assert_match /pattern/, string` | a regex matches |
| `assert_operator a, :<, b` | `a < b` |
| `assert_raises(Klass) { ... }` | the block raises that class |
| `refute`, `refute_equal`, ... | the same, negated |

`assert_raises` returns the exception, which is how the message gets checked:

```ruby
def test_fetch_raises_for_an_unknown_id
  error = assert_raises(Northside::MissingBook) { catalogue.fetch("nope") }

  assert_equal "nope", error.id
  assert_match(/nope/, error.message)
end
```

Asserting on the error's fields matters more than asserting on the message: a message can be reworded, the class and
its data are the interface. The project has a test for each error it raises.

## setup and teardown

```ruby
class StoreTest < Minitest::Test
  def setup
    @directory = Dir.mktmpdir("northside")
    @store = Northside::Store.new(@directory)
  end

  def teardown
    FileUtils.remove_entry(@directory)
  end
end
```

`setup` runs before each test and `teardown` after each, and instance variables set in `setup` are visible in the
tests. A fresh object per test is the point: tests that share state fail in an order-dependent way, which is the most
expensive kind of flake to debug.

Shared data can live in a module rather than a base class:

```ruby
module CatalogueFixture
  def books
    [ Northside::Book.new(id: "dune", title: "Dune", author: "Frank Herbert", genre: "science-fiction", copies: 3),
      Northside::Book.new(id: "edda", title: "The Poetic Edda", author: "Anonymous", genre: "poetry", copies: 1) ]
  end

  def catalogue
    Northside::Catalogue.new(books)
  end
end
```

`include CatalogueFixture` in a test class gives it those two methods and nothing else.

## Running one test, and other options

```bash
bundle exec ruby -Ilib -Itest test/book_test.rb --verbose -n /genre/
```

```text
Run options: --verbose -n /genre/ --seed 27119

# Running:

BookTest#test_a_book_has_a_genre_label = 0.00 s = .

1 runs, 1 assertions, 0 failures, 0 errors, 0 skips
```

The `-Ilib -Itest` pairs add the two directories to the load path; the Rakefile does the same thing, which is why
`rake test` works without them. Minitest randomises the order and prints the seed it used, so a test that only fails
in one order can be reproduced with `--seed`.

## The version that ships with Ruby

```bash
ruby -e "require 'minitest/autorun'; puts Minitest::VERSION"
```

```text
6.0.6
```

```bash
bundle exec ruby -e "require 'minitest/autorun'; puts Minitest::VERSION"
```

```text
5.26.2
```

Two different versions, and the project's suite runs against the second. The gemspec pins `~> 5.25`, so Bundler
installs minitest 5.26.2 and makes it visible; plain `ruby` uses the 6.0.6 that ships with Ruby 3.4. This is the
bundled gem situation from the previous page with a different name, and it is why the difference between `ruby test.rb`
and `bundle exec ruby test.rb` is worth knowing before you have a failure to explain.

The practical consequence: a helper that exists in 5.x may be gone in 6.x, and the error is a `LoadError` in a test
file that looks fine. Pinning the version in the gemspec and running everything through `bundle exec` is the whole
defence.

## Check yourself

Write tests for a `Member` class with a name and an email, covering a valid member, a blank name, an invalid email and
two members with the same email. Then run only the tests whose names mention email with `-n`, and run the file twice
with different seeds to confirm the order does not change the result.
