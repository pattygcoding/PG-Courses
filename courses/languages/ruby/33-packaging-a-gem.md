---
title: Packaging a gem
summary: A file list, a version, a build, an install, and the executable that comes out the other end.
chapter: Shipping
minutes: 14
status: draft
---

## The gemspec

```ruby
# frozen_string_literal: true

require_relative "lib/northside/version"

Gem::Specification.new do |spec|
  spec.name = "northside"
  spec.version = Northside::VERSION
  spec.authors = ["Northside Library"]
  spec.summary = "A catalogue and lending tool for a small library."
  spec.description = "Reads a catalogue, records loans and reports what is out and what is waiting."
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.2"

  spec.files = Dir["lib/**/*.rb", "bin/*", "data/*"]
  spec.bindir = "bin"
  spec.executables = ["northside"]
  spec.require_paths = ["lib"]

  # csv left the default gems in Ruby 3.4, so it has to be declared or it is
  # invisible under bundle exec even though plain ruby can require it.
  spec.add_dependency "csv", "~> 3.3"

  spec.add_development_dependency "minitest", "~> 5.25"
  spec.add_development_dependency "rake", "~> 13.2"
end
```

The fields that matter:

| Field | Why |
| --- | --- |
| `name` and `version` | what `gem install northside` looks up |
| `files` | what goes into the package: nothing else is included |
| `bindir` and `executables` | which files in `bin/` become commands |
| `require_paths` | where `require "northside"` searches |
| `required_ruby_version` | the install is refused on an older Ruby |
| `add_dependency` | installed with the gem, and enforced at runtime |
| `add_development_dependency` | installed only when developing the gem |

`spec.files` with `Dir[...]` is the version that works in every shell. Some projects use `git ls-files` so that
anything committed is shipped and anything ignored is not; both are fine, and the one that is wrong is a hand-written
list that gets out of date.

`add_dependency` for `csv` is the line from the previous page. A runtime dependency is installed for every user of the
gem, so it is worth being honest about: `csv` is needed by `lib/northside/store.rb`, which means every user needs it,
which means it belongs there.

## Building

```bash
gem build northside.gemspec
```

```text
WARNING:  no homepage specified
WARNING:  See https://guides.rubygems.org/specification-reference/ for help
  Successfully built RubyGem
  Name: northside
  Version: 0.1.0
  File: northside-0.1.0.gem
```

The warning is a real one and the fix is one line, `spec.homepage = "https://example.com/northside"`. A gem without a
homepage is a gem nobody can read more about, and `gem build` tells you so rather than failing.

The result is a single `.gem` file containing exactly what `spec.files` listed plus the metadata. It is a tar archive
with a checksum, and `gem unpack northside-0.1.0.gem` shows you the contents:

```text
Unpacked gem: 'C:/Users/patty/Programming/Scrapyard/northside-0.1.0'
```

In that directory sit the eleven files the gemspec listed and nothing else:

```text
bin/northside
data/books.json
data/loans.csv
lib/northside.rb
lib/northside/book.rb
lib/northside/catalogue.rb
lib/northside/cli.rb
lib/northside/loan.rb
lib/northside/report.rb
lib/northside/store.rb
lib/northside/version.rb
```

The file list is the contract. A file the code requires and the list omits produces a gem that installs and then
raises `LoadError` on the first command, and building the gem in CI is where that shows up cheaply.

## Installing and running it

```bash
gem install --local ./northside-0.1.0.gem
```

```text
1 gem installed
```

```bash
northside genres
```

```text
non-fiction
poetry
science-fiction
```

That is the whole point of the exercise. The gem installed its dependencies, wrote a wrapper for `northside` into the
executable directory, and the command ran against the `data/` directory that travels with the gem.

The installed copy is separate from the working copy. Editing `lib/northside/book.rb` in the project changes nothing
about the installed gem, which is worth remembering when a fix appears not to take effect:

```bash
gem list northside
gem contents northside
gem uninstall northside
```

`gem contents` prints every installed file, which is the fastest way to answer "which copy is this running".

## Versions

```ruby
module Northside
  VERSION = "0.1.0"
end
```

The number is semantic: `0.1.0` is the third release of something that is not yet stable, `1.0.0` promises that the
public methods will not change without a major bump, and `1.4.2` is a patch. RubyGems compares these as versions
rather than as strings, so `0.10.0` is newer than `0.9.0`, which is the mistake a hand-written comparison makes.

A pre-release is `1.0.0.beta1`, and it is only installed when `gem install northside --pre` asks for it. That is how
a gem publishes a release candidate without every user getting it.

For a gem that ships an executable, the version is also a promise to the command: a change in the output format of
`northside report` is a breaking change for anything parsing it, and the version is where that gets recorded.

## Publishing

```bash
gem push northside-0.1.0.gem
gem owner northside --add someone@example.com
gem yank northside -v 0.1.0
```

`push` needs an account on rubygems.org and sends your API key with the package; the key lives in
`~/.local/share/gem/credentials` or in `GEM_HOST_API_KEY`, and in CI it is a secret rather than a file. `yank` removes
a version from the index without deleting the package, which matters because other projects may have it in a lock
file.

Publishing is irreversible enough in practice that the usual sequence is: bump the version, build, install the built
gem into a clean environment, run the tests there, then push.

## Check yourself

Build the gem, install it, and run `northside report` from a directory that is not the project. Then break the file
list by removing `data/*` from `spec.files`, build again, and explain the error a user would see.
