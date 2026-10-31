---
title: Gems and Bundler
summary: A Gemfile, a lock file, and why bundle exec finds the version your project pinned.
chapter: Gems and tests
minutes: 15
status: draft
---

## Three commands, three jobs

```bash
gem install minitest          # install one gem on this machine
gem list                      # what is installed
gem update                    # update all of them
```

`gem` works on the machine. It has no idea which project you are in, and it will happily install a version that
breaks the project two directories up. That is the problem Bundler solves.

```bash
bundle install                # install what the Gemfile says, for this project
bundle exec rake test         # run a command with those versions
bundle update                 # re-resolve to newer versions
bundle outdated               # what has moved on
```

## The Gemfile

```ruby
# frozen_string_literal: true

source "https://rubygems.org"

gemspec
```

That is the whole Gemfile for this project. `source` names the server, and `gemspec` means "read the dependency list
from `northside.gemspec`", which is how a gem and the project that develops it share one list:

```ruby
spec.add_development_dependency "minitest", "~> 5.25"
spec.add_development_dependency "rake", "~> 13.2"
```

`~> 5.25` means "5.25 or later, but below 6". The alternative forms are worth knowing:

| Constraint | Means |
| --- | --- |
| `"5.25.1"` | exactly that version |
| `"~> 5.25"` | 5.25 and up, below 6.0 |
| `"~> 5.25.1"` | 5.25.1 and up, below 5.26 |
| `">= 5.25"` | anything from 5.25 up |
| none | the newest released version |

A dependency in a group is only installed for some purposes:

```ruby
group :development, :test do
  gem "minitest", "~> 5.25"
end

group :production do
  gem "puma"
end
```

## The lock file

```text
    rake (13.4.2)

PLATFORMS
  x64-mingw-ucrt

DEPENDENCIES
  minitest (~> 5.25)
  northside!
  rake (~> 13.2)

BUNDLED WITH
   2.6.9
```

`Gemfile.lock` records what was actually installed: exact versions, where each gem came from, the platform the
resolution was done on, and the Bundler version. It goes in the repository, and the Gemfile does not. Together they
say "this project works with these versions" rather than "this project works with something from 5.25 onwards".

The `PLATFORMS` line is the one that causes trouble across machines. A lock file resolved on Windows records
`x64-mingw-ucrt`, and a Linux CI job with only that platform line in the file will fail until it is added. Bundler
handles it if you let it, and the fix when it does not is `bundle lock --add-platform x86_64-linux`.

## A bare command runs with whatever the machine has

The first `rake test` in this project failed, and the error was in the project's own loader:

```text
lib/northside.rb:3:in 'Kernel#require_relative': cannot load such file -- .../lib/book (LoadError)
```

The next page is about that mistake. What matters here is the shape of the command: a bare `rake` runs with whatever
gems the machine has and does not read `Gemfile.lock`. `bundle exec` runs with the versions the lock file pinned:

```bash
bundle exec rake test
```

```text
46 runs, 103 assertions, 0 failures, 0 errors, 0 skips
```

The rule for a project: every command that runs project code goes through `bundle exec`, and every script in `bin/`
starts with it. The alternative is a bug that only appears on a machine where a newer version of a gem is installed,
which is the least reproducible kind.

## Making a command that is not on PATH

```bash
bundle exec rails -v
```

```text
Rails 8.1.4
```

That is how the Rails course calls `rails`. The executable is in the bundle, `bundle exec` puts the bundle's `bin`
directory first, and `PATH` is not consulted. It is the same reason `bundle exec rake` works on a machine where the
`rake` command is an older stub.

## What a gem does when it installs

Two kinds of gem exist, and the difference shows up at install time:

- A pure Ruby gem is source code, and installing it copies files.
- A gem with a C extension compiles at install time, which needs a compiler and a devkit on Windows.

The second kind is why the RubyInstaller devkit matters, and why a `bundle install` that fails on one machine and
works on another is usually a missing build tool rather than a missing gem. Where the maintainers publish precompiled
binaries for the platform, the lock file's platform line means no compilation happens at all.

## A warning worth recognising

```text
lib/northside/store.rb:3: warning: csv was loaded from the standard library,
but is not part of the default gems starting from Ruby 3.4.0.
You can add csv to your Gemfile or gemspec to silence this warning.
```

Ruby 3.4 moved `csv` out of the default gems, so requiring it now prints a warning telling you what to do about it.
The message is easy to ignore and expensive to ignore, because the next thing that happens is this:

```text
bundled_gems.rb:82:in 'Kernel#require': cannot load such file -- csv (LoadError)
```

That is `bundle exec rake test` failing after a plain `rake test` succeeded, and the difference is the point of this
page. Bundler makes the listed gems visible and hides the rest; a bundled gem that ships with the Ruby installation is
not in the bundle unless the Gemfile or the gemspec says so. The fix is one line, and it belongs in the gemspec
because `lib/northside/store.rb` is what requires `csv`:

```ruby
spec.add_dependency "csv", "~> 3.3"
```

```bash
bundle install
```

```text
Installing csv 3.3.7
Bundle complete! 3 Gemfile dependencies, 5 gems now installed.
```

```bash
bundle exec rake test
```

```text
46 runs, 102 assertions, 0 failures, 0 errors, 0 skips
```

A default gem, such as `json` or `date`, is part of Ruby and stays visible under Bundler. A bundled gem, such as `csv`
or `minitest`, ships with Ruby and is installed like any other gem, so Bundler needs it named. The warning says which
case you are in, and the difference only shows up when the code runs under `bundle exec`.

## Check yourself

Add `gem "colorize"` to the Gemfile, run `bundle install`, and check that `bundle exec ruby -e "require 'colorize'; puts 'red'.red"`
prints in red. Then run the same one-liner without `bundle exec` and explain the difference in what the interpreter
could see.
