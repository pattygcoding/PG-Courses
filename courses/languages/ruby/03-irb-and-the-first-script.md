---
title: irb and the first script
summary: A session where you ask an object what it can do, and a file you run, check and warn about.
chapter: Getting started
minutes: 14
status: draft
---

## Start where Ruby is easiest to explore

`irb` is the interactive shell, and it is where most Ruby gets written. Start it with no arguments, or with
`--simple-prompt` for a prompt that copies well:

```irb
>> books = [1, 2, 3]
=> [1, 2, 3]
>> books.sum
=> 6
>> books.map { |n| n * 2 }
=> [2, 4, 6]
>> scores = { "dune" => 3, "edda" => 1 }
=> {"dune" => 3, "edda" => 1}
>> scores.max_by { |_title, copies| copies }
=> ["dune", 3]
>> "ruby".upcase
=> "RUBY"
>> :ok.class
=> Symbol
>> nil.to_a
=> []
```

Two things about that transcript are worth noticing. The result of every expression is printed with `inspect`
rather than `to_s`, which is why the string shows its quotes and the hash shows its braces. And `nil.to_a` returns
an empty array rather than raising, which is a small example of a larger habit: Ruby objects tend to have a useful
answer for a nonsensical question.

The other reason to sit in `irb` is that it can tell you what an object responds to:

```irb
>> books = []
=> []
>> books.respond_to?(:compact)
=> true
>> books.methods.grep(/sum|sort|tally/).sort
=> [:sort, :sort!, :sort_by, :sort_by!, :sum, :tally]
```

That list is the real documentation for the object in front of you, and it is one keystroke away whenever you are
unsure.

## The first file

A script is a text file with Ruby in it:

```ruby
# friendly.rb
name = "Ada Lovelace"
loans = 3

puts "#{name} has #{loans} books out"
```

```bash
ruby friendly.rb
```

```text
Ada Lovelace has 3 books out
```

`puts` writes a line to standard output and calls `to_s` on what it is given. `print` writes without the newline,
and `p` writes the `inspect` form, which is the one that shows you what a value really is:

```irb
>> puts "northside"
northside
=> nil
>> p "northside"
"northside"
=> "northside"
```

Notice the `=> nil` under `puts`: the method returns nothing useful, which is why `irb` shows no value for it in a
script.

## Checking a file without running it

```bash
ruby -c friendly.rb
```

```text
Syntax OK
```

`-c` parses the file without executing it, which is the fastest way to find a missing `end` in a file that takes
thirty seconds to boot.

`-w` runs the file with warnings on:

```ruby
# warnings.rb
def report(rows)
  leftover = 42
  rows.map { |row| row * 2 }
end

def label
  "first"
end

def label
  "second"
end

puts report([1, 2]).inspect
puts label
```

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

Both warnings describe the same class of mistake: code that says something different from what you meant. An
unused variable is usually a typo, and a redefined method means the first one is gone. Neither stops the program,
and the program's output is right there under the warnings.

The habit for a project is to have the test task run with warnings on, so a warning shows up in the output of the
command you already run rather than in a review. The Rakefile page sets that up.

## The exit status

Every program leaves a number behind, and a script that reports a failure leaves a non-zero one:

```ruby
# check.rb
if ARGV.empty?
  warn "give me a number"
  exit 64
end

puts Integer(ARGV.first) * 2
```

```bash
ruby check.rb
echo $?
```

```text
give me a number
64
```

Run with an argument, the same file answers differently:

```bash
ruby check.rb 21
```

```text
42
```

`warn` writes to standard error rather than standard output, which matters when the output is being piped
somewhere: the message goes to the terminal and the data goes to the pipe. `Integer("nope")` raises, and the last
page of the command line tool uses that as a way to turn bad input into a message and a status.

## Argument zero

There is one more thing to know before writing scripts that read files: `ARGV` holds the arguments, and `$0` holds
the name the script was run as. Neither is needed in the program above, and both come back in the chapter on files
and data.

## Check yourself

Open `irb --simple-prompt` and find three methods on an `Array` you have never used, using
`[].methods.sort` and `[].method(:sort_by).arity`. Then write a file that prints the number of arguments it was
given and exits with status 1 when there are none, run it twice, and check the status with `echo $?` or `$LASTEXITCODE`
in PowerShell.
