---
title: Project layout
summary: lib, bin and test, the require that fails, and the naming rules that make a file findable.
chapter: Gems and tests
minutes: 13
status: draft
---

## The tree

```text
pg-ruby-verify/
  Gemfile
  Gemfile.lock
  Rakefile
  northside.gemspec
  .ruby-version
  bin/northside
  data/books.json
  data/loans.csv
  lib/northside.rb
  lib/northside/book.rb
  lib/northside/catalogue.rb
  lib/northside/loan.rb
  lib/northside/report.rb
  lib/northside/store.rb
  lib/northside/cli.rb
  lib/northside/version.rb
  test/test_helper.rb
  test/book_test.rb
  test/catalogue_test.rb
  test/loan_test.rb
  test/report_test.rb
  test/store_test.rb
  test/cli_test.rb
```

Every part of that layout is a convention rather than a requirement, and the conventions are what make the project
work with `gem build`, `rake test` and a reader's expectations:

| Directory | Holds |
| --- | --- |
| `lib/` | the code, loaded with `require` |
| `bin/` | executables that a user runs |
| `test/` | tests, one file per class under test |
| `data/` | files the tool reads and writes at runtime |

`lib/northside.rb` is the entry point and the only file a caller has to know about:

```ruby
require_relative "northside/book"
require_relative "northside/catalogue"
require_relative "northside/loan"
require_relative "northside/report"
require_relative "northside/store"
require_relative "northside/cli"
require_relative "northside/version"
```

The rest of the world writes `require "northside"` and gets the whole library. Internal files require what they need
and nothing else, so `book.rb` can be read on its own and the loader can be reordered without surprises.

## The require that fails

The first version of that file said `require_relative "book"`, which was wrong:

```text
lib/northside.rb:3:in 'Kernel#require_relative': cannot load such file -- .../lib/book (LoadError)
```

`require_relative` resolves against the directory of the file doing the requiring, so from `lib/northside.rb` the name
`book` means `lib/book.rb`. The files are in `lib/northside/`, so the path has to include that directory.

The two loaders are worth keeping straight:

```ruby
require "northside/book"           # found on the load path: lib/ is on it, so this is lib/northside/book.rb
require_relative "northside/book" # relative to this file
```

A gem uses `require_relative` inside `lib/`, because the load path may not be set up the way it expects. A script or a
test file uses `require`, because it is running with the project's `lib/` on the load path. Mixing them up is the
source of the error above and of a class of "works in the test, not from the executable" bugs.

## What puts lib on the load path

```ruby
# frozen_string_literal: true

$LOAD_PATH.unshift File.expand_path("../lib", __dir__)

require "minitest/autorun"
require "northside"
```

That is `test/test_helper.rb`. `$LOAD_PATH` is the list of directories `require` searches, and the test suite adds the
project's `lib/` to the front of it. Rake's `TestTask` does the same thing with `task.libs << "lib"`, and the gemspec
declares `spec.require_paths = ["lib"]`, so installed code and tested code search the same place.

When those three disagree, the symptom is a test that passes and a gem that raises `LoadError` after installation,
which is why the packaging page builds the gem and runs it.

## File and class names

Two rules, both mechanical:

- The file name is the class name in snake case: `Northside::Catalogue` is `lib/northside/catalogue.rb`.
- The path matches the nesting: a class inside `module Northside` lives under `lib/northside/`.

Ruby does not enforce either. `require "northside/catalogue"` loads whatever that file defines, and a file called
`helpers.rb` full of unrelated classes is legal. The rules exist because the gem ecosystem's autoloaders, `zeitwerk` in
Rails and everything that generates documentation, derive the constant from the path. A project that breaks the
convention works until the day it meets one of them.

One more: `lib/northside/version.rb` exists as a separate file because the gemspec requires it:

```ruby
require_relative "lib/northside/version"

Gem::Specification.new do |spec|
  spec.version = Northside::VERSION
end
```

The gemspec runs before the rest of the library is loadable, so the version lives in a file with no dependencies of
its own.

## The executable

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

require "optparse"
require_relative "../lib/northside"

directory = ENV.fetch("NORTHSIDE_DATA", File.expand_path("../data", __dir__))
store = Northside::Store.new(directory)

exit Northside::CLI.new(store: store).run(ARGV)
```

Four lines of setup and a call. Everything else is in `lib/`, which is what makes the tool testable: the test suite
builds a `CLI` with a fake store and never runs `bin/northside` at all. The script's only job is wiring the real store
to the real argv and returning the status.

## Where the lines go and why

| Question | Answer |
| --- | --- |
| New class? | `lib/<gem>/<name>.rb`, added to `lib/<gem>.rb` |
| New command? | a method on the CLI class rather than a new script |
| New data file? | `data/`, read through the store rather than opened directly |
| New test? | `test/<name>_test.rb`, one per class under test |
| Shared test setup? | `test/test_helper.rb`, and a module for fixtures |

The one that needs saying out loud is the second: a script per command is how a `bin/` directory turns into twenty
files with six lines of duplicated setup each. The entry point is a dispatcher, and the commands are methods.

## Check yourself

Add a `lib/northside/member.rb` with a `Member` data object holding a name and an email, wire it into the catalogue,
and add `test/member_test.rb`. Then check the gem still builds with `gem build northside.gemspec` and that the new
file is inside it.
