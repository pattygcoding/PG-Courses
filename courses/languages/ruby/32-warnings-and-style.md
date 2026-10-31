---
title: Warnings and style
summary: What -w catches, what it misses, and the frozen string comment every file starts with.
chapter: Gems and tests
minutes: 13
status: draft
---

## Two flags worth putting on by habit

```bash
ruby -c lib/northside/book.rb
```

```text
Syntax OK
```

`-c` parses without running, which finds a missing `end` in a file that takes a second to load.

```bash
ruby -w warnings.rb
```

```text
warnings.rb:2: warning: assigned but unused variable - leftover
warnings.rb:10: warning: method redefined; discarding old label
warnings.rb:6: warning: previous definition of label was here
[2, 4]
second
```

The program still ran and still printed its output. The warnings are about code that says something different from
what was meant: a variable assigned and never used is usually a typo, and a method defined twice means the first
definition is gone.

That is the profile of what `-w` is good at. It catches unused variables, redefined methods, uninitialised instance
variables in some positions, and a handful of similar mistakes. The Rakefile in this project turns it on for the test
task:

```ruby
task.warning = true
```

## What it does not catch

```ruby
class Counter
  def initialize
    @count = 0
  end

  def count
    @cout          # a typo
  end
end
```

```text
nil
```

An instance variable that was never assigned is nil, with no warning, even under `-w`. Ruby removed that warning in
3.0 because it fired on perfectly good code, and the cost is this: a typo in an `@` name reads as a missing value
rather than as a mistake.

The defences are the ones from earlier in the course: a test that asserts on the value, `instance_variables` when you
are unsure, and keeping the number of instance variables low enough to read in one glance.

The other thing `-w` will not catch is a block passed to a method that does not use one, which is the `tally` bug from
the arrays page. Both are the same category of silent mistake: the code runs and the answer is wrong.

## The frozen string comment

```ruby
# frozen_string_literal: true
```

Every file in this project starts with it. Strings in that file are frozen, so `"northside" << "!"` raises instead of
building a new string, and a constant holding a string literal cannot be changed by accident from another file.

The cost is real: a method that mutates a literal string has to write `+""` or `String.new` to get a mutable one. The
benefit is that a string literal behaves like a value rather than like a buffer, and the allocation for it happens
once.

RuboCop's default configuration enables the cop that requires the comment, which is why a project that adopts it ends
up with it everywhere rather than in the files that look risky.

## The style tool

Linters are not part of Ruby, and the two that matter are both gems:

```ruby
# Gemfile
gem "rubocop", "~> 1.68", require: false
```

```bash
bundle exec rubocop
bundle exec rubocop --autocorrect
```

The output names the file, the line, the cop and what it would change, and `--autocorrect` applies the safe ones.
`standard` is the other option: it is RuboCop with a fixed configuration and no bikeshedding.

The Rails course's application runs the Rails team's own configuration, `rubocop-rails-omakase`:

```text
56 files inspected, no offenses detected
```

The useful part of that is not the number. It is that the style rules live in the repository, so a reviewer does not
have to have an opinion about quote marks and a new contributor gets told by a tool rather than by a person.

Two habits make a linter worth having: it goes in the Rakefile's default task or the CI script, and it is run before
the review rather than during it. A linter that only runs when someone remembers is a linter that produces a
thousand-line diff once a quarter.

## The warning that arrives with a new Ruby

```text
lib/northside/store.rb:3: warning: csv was loaded from the standard library,
but is not part of the default gems starting from Ruby 3.4.0.
You can add csv to your Gemfile or gemspec to silence this warning.
```

Ruby's move away from default gems produces these one at a time, and each one names its own fix. The gems page has
the full story; the habit for this page is to read a warning when it appears, because the same line is a `LoadError`
on the next major version.

## Check yourself

Run `ruby -w` over the whole project with
`ruby -w -Ilib -e "require 'northside'" | grep warning` (or `Select-String warning` in PowerShell) and fix anything that
comes back. Then write a file with three deliberate mistakes in it: an unused variable, an unassigned instance
variable read in a method, and a method defined twice. Check which of the three `-w` reports.
