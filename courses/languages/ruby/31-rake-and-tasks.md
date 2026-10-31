---
title: Rake and tasks
summary: A Rakefile is Ruby that answers to task names, and the test task is four lines of it.
chapter: Gems and tests
minutes: 12
status: draft
---

## The whole Rakefile

```ruby
require "rake/testtask"

Rake::TestTask.new(:test) do |task|
  task.libs << "test"
  task.libs << "lib"
  task.pattern = "test/**/*_test.rb"
  task.warning = true
  task.description = "Run the tests with warnings on"
end

desc "Print the catalogue"
task :catalogue do
  require_relative "lib/northside"

  Northside::Store.new(File.expand_path("data", __dir__)).read_catalogue.each { |book| puts book }
end

task default: :test
```

A Rakefile is a Ruby file with `task` in it, so it has methods, blocks and `require_relative` like everything else.
`Rake::TestTask` is a ready-made task that builds the command line to run a test suite: it puts `lib` and `test` on
the load path, decides which files match the pattern, and runs them in one process.

`task.warning = true` adds `-w`, which is why the task is called "the tests with warnings on". One line, and every
warning the project produces shows up in the output of the command people already run.

## Listing and running

```bash
rake -T
```

```text
rake catalogue  # Print the catalogue
rake test       # Run the tests with warnings on
```

`rake -T` lists the tasks that have a description. `desc` is the line above a task and the text after `#` in the
listing is that description, which is the entire help system.

```bash
rake catalogue
```

```text
Dune by Frank Herbert (Science Fiction)
A Brief History of Time by Stephen Hawking (Non Fiction)
The Left Hand of Darkness by Ursula K. Le Guin (Science Fiction)
The Poetic Edda by Anonymous (Poetry)
```

```bash
rake
```

Running `rake` with no arguments runs the default task, which is `test` here. That is the convention a reader
expects: the command they can never remember is the one they need least often.

## Dependencies

```ruby
task default: :test

task :report => [ :catalogue, :loans ] do
  puts "both files were produced"
end
```

`task :report => [ :catalogue, :loans ]` means "run those two first, once each, even if this task is asked for
twice". A task that another task depends on runs at most once per invocation, which is what makes a longer chain work
without coordinating anything.

A `file` task is the other kind and it compares timestamps:

```ruby
file "data/report.txt" => [ "data/books.json", "data/loans.csv" ] do |task|
  # rebuild the report because one of the inputs changed
end
```

Build systems are made of those. For a small project, a `task` that always runs is simpler and fast enough, and this
Rakefile does not need the timestamp logic.

## Namespaces

```ruby
namespace :data do
  desc "Print the catalogue"
  task :catalogue do
    # ...
  end
end
```

That task is now `rake data:catalogue`. Two levels are plenty; `data:import:from:csv:legacy` is a task nobody can
remember.

## Why a Rakefile and not a shell script

A shell script in `bin/` does the same job until it has to run on Windows, at which point the two versions diverge and
the Windows one lags. A Rakefile is Ruby and runs wherever Ruby runs:

```ruby
namespace :setup do
  desc "Install the gems and copy the sample data"
  task :all do
    sh "bundle install"
    cp "data/books.sample.json", "data/books.json", verbose: true
  end
end
```

`sh` runs a command and raises when it fails, `cp` copies a file with a Ruby implementation, and both are portable.
The `verbose: true` is the difference between a task you can watch and one that seems to do nothing.

## Check yourself

Add a task `rake data:report` that prints the report to standard output by building the same objects `bin/northside`
builds, and give it a description. Then make `rake catalogue` print the titles only, and decide whether the task
belongs in the Rakefile or in the CLI.
