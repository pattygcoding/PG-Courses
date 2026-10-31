---
title: Environment and arguments
summary: ENV for configuration, OptionParser for the command line, and an exit status for every ending.
chapter: Files and data
minutes: 13
status: draft
---

## ENV

```irb
>> ENV["NORTHSIDE_DATA"] = "/tmp/northside"
=> "/tmp/northside"
>> ENV.fetch("NORTHSIDE_DATA")
=> "/tmp/northside"
>> ENV.fetch("NORTHSIDE_MISSING", "default")
=> "default"
>> ENV.fetch("NORTHSIDE_MISSING")
=> KeyError
>> ENV.delete("NORTHSIDE_DATA")
=> "/tmp/northside"
```

`ENV` is a hash-like object of the process's environment, with strings on both sides. `ENV.fetch` with a default is
the form to use when absence is normal, and `ENV.fetch` with no default is the form to use when the variable is
required, because `KeyError` names the variable that is missing:

```ruby
directory = ENV.fetch("NORTHSIDE_DATA", File.expand_path("../data", __dir__))
secret = ENV.fetch("API_TOKEN")   # there is no sensible default for this one
```

Two rules worth keeping. The environment is not typed, so everything is a string and `ENV["PORT"].to_i` is how a
number gets out of it. And a variable set inside the process does not affect the parent shell, so `ENV["X"] = "1"` in
a script is a configuration lever for that process and its children only.

The library's own directory layout gets this treatment: several tools in the ecosystem read `ENV["PORT"]`, and a test
suite can point a class at a temporary directory by setting an environment variable in `setup`.

## ARGV and OptionParser

`ARGV` is an array of the arguments, and `OptionParser` turns the flag-shaped ones into options:

```ruby
require "optparse"

def cli(argv)
  options = { days: 14 }
  parser = OptionParser.new do |parser|
    parser.banner = "northside lend <id> [options]"
    parser.on("--member=NAME", "the member taking the book") { |name| options[:member] = name }
    parser.on("--days=N", Integer, "how long the loan runs") { |days| options[:days] = days }
    parser.on("-v", "--verbose") { options[:verbose] = true }
  end
  parser.parse!(argv)
  [ options, argv ]
end
```

```irb
>> cli(["--member=Ada", "--days=7", "dune"])
=> [{days: 7, member: "Ada"}, ["dune"]]
>> cli(["dune", "--member=Ada"])
=> [{days: 14, member: "Ada"}, ["dune"]]
>> cli(["--days=lots"])
=> [OptionParser::InvalidArgument, "invalid argument: --days=lots"]
```

`parse!` removes the options it recognised from the array and leaves the rest, which is why `"dune"` is still in
there. Order does not matter, the `Integer` in the declaration asks `Integer()` to convert the value, and an
unparseable value raises rather than becoming zero.

`--help` prints what was declared and is free:

```text
northside lend <id> [options]
        --member=NAME                the member taking the book
        --days=N                     how long the loan runs
    -v, --verbose
```

That banner is the usage text, so the program has one description of itself rather than two that drift apart.

## A command with subcommands

The project's tool has six commands, and the shape that works for that is a command word followed by its own options:

```ruby
def run(argv)
  command, *rest = argv
  options = parse(rest)

  case command
  when "list" then list(options)
  when "find" then find(rest.first)
  when "lend" then lend(rest.first, options)
  end
end
```

`command, *rest = argv` splits the array, and `parse(rest)` consumes flags after the command word. That is the shape
`git`, `docker` and `rails` all use, and it is one `case` statement.

## Every ending has a status

```ruby
def run(argv)
  # ...
  0
rescue OptionParser::ParseError => error
  @err.puts error.message
  64
rescue ArgumentError => error
  @err.puts error.message
  64
rescue MissingBook, NotAvailable => error
  @err.puts error.message
  1
end
```

A process that ends normally returns 0. Anything else is a failure the shell can act on, and the numbers have
conventions worth following:

| Status | Means |
| --- | --- |
| 0 | it worked |
| 1 | it did not work |
| 64 | the command line was wrong |
| 70 | an internal error |
| 130 | interrupted with Ctrl-C |

`exit 64` and `abort "message"` both stop the process; `abort` writes the message to standard error and uses status 1.
`warn "message"` writes to standard error and carries on, which is what the project does for a missing optional file.

The distinction between stdout and stderr matters once anything is piped:

```bash
northside list > books.txt
northside list 2> errors.txt
```

Data goes to standard output, messages go to standard error. A warning written to stdout corrupts the file the user
redirected.

## Reading standard input

```ruby
lines = $stdin.each_line.map(&:chomp)
name = $stdin.gets&.chomp
$stdin.tty?
```

`gets` returns a line including its newline, and nil at end of input, which is why `&.chomp` is the usual pairing.
`tty?` answers whether the input is a terminal or a pipe, which is how a tool decides whether to prompt or to read
whatever arrives.

## Check yourself

Extend the tool with a `--format=json` option that prints the list as JSON instead of one line per book, using the
same `OptionParser` declarations. Then run it three ways: with no flag, with `--format=json`, and with
`--format=xml`, and decide what status each should return.
