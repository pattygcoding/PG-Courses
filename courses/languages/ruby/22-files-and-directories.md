---
title: Files and directories
summary: Read, write, walk a path and put the handle back, and the error a missing file gives you.
chapter: Files and data
minutes: 14
status: draft
---

## Reading and writing in one call

```ruby
File.read(path)
File.write(path, "one\n")
```

`File.write` returns the number of bytes it wrote, which is a cheap check that something happened. For anything
larger than a report, or anything that has to be read line by line, the block form is the one to use:

```ruby
File.open(path, "r") do |file|
  file.each_line { |line| puts line.chomp }
end
```

The block closes the handle when it returns, even if the body raises. Without it, the file stays open until the
garbage collector gets to it, and on Windows a file that is still open cannot be renamed or deleted, so the leak is
visible rather than theoretical.

The modes worth knowing:

| Mode | Means |
| --- | --- |
| `"r"` | read, and the file must exist |
| `"w"` | write, truncating what is there |
| `"a"` | append |
| `"r+"` | read and write from the start |
| `"rb"` | read as binary, no encoding conversion |

Appending a line is a two-argument call:

```ruby
File.write(path, "two\n", mode: "a")
```

## Paths

```irb
>> File.join("data", "books.json")
=> "data/books.json"
>> Pathname.new("data/books.json").basename.to_s
=> "books.json"
```

`File.join` builds a path with the right separator for the platform, `File.basename` and `File.dirname` split one, and
`File.expand_path` turns a relative path into an absolute one. `Pathname` from the standard library wraps the same
functions in an object, and it is worth using when a path is passed around rather than used immediately.

Two names make a script independent of where it is run from:

```ruby
__dir__                                  # the directory holding this file
File.expand_path("../data", __dir__)     # a path relative to the file, not the shell
```

The command line tool in this project uses both, because a script run from another directory would otherwise look for
its data folder in the wrong place:

```ruby
directory = ENV.fetch("NORTHSIDE_DATA", File.expand_path("../data", __dir__))
```

`ENV.fetch` here has a default, so the environment variable overrides the location and nothing else changes.

## A missing file is an error with a name

```irb
>> File.read("no-such-file.txt")
(irb):26:in 'IO.read': No such file or directory @ rb_sysopen - no-such-file.txt (Errno::ENOENT)
```

`Errno::ENOENT` is the class, and the message names the path. Two honest reactions:

```ruby
# The file is required.
Catalogue.from_json(File.read(path, encoding: "bom|utf-8"))

# The file is optional.
loans = File.exist?(path) ? read_loans(path) : []
```

The project does the first for the catalogue and the second for the loans, and the test suite pins both behaviours:

```ruby
test "a missing catalogue is a loud failure" do
  assert_raises(Errno::ENOENT) { @store.read_catalogue }
end

test "no loans file is not an error" do
  assert_empty @store.read_loans
end
```

## Walking a directory

```ruby
Dir.glob(File.join(directory, "*.json"))
Dir.children(directory)
Dir.children(directory).each { |name| puts File.join(directory, name) }
```

`Dir.glob` takes a pattern with `*`, `**` and `?`. `Dir.children` returns names without the path, which is the safer
default because a name is less likely to be misused than a half-built path.

`Dir.mktmpdir` is what the test suite uses instead of a fixtures directory:

```ruby
def setup
  @directory = Dir.mktmpdir("northside")
  @store = Northside::Store.new(@directory)
end

def teardown
  FileUtils.remove_entry(@directory)
end
```

Each test gets a private directory, the file system is exercised for real, and the teardown removes it whatever the
test did. That is a better trade than mocking the file system for a class whose whole job is file work.

## Capturing output instead of printing it

```irb
>> io = StringIO.new
>> io.puts "captured"
=> nil
>> io.string
=> "captured\n"
```

`StringIO` is an IO object backed by a string. The CLI takes its streams as arguments, which is what makes the tests
possible:

```ruby
def initialize(store:, out: $stdout, err: $stderr)
  @store = store
  @out = out
  @err = err
end
```

```ruby
def test_it_lists_the_catalogue
  run_cli("list")

  assert_equal 0, @status
  assert_match(/Dune by Frank Herbert/, @out.string)
end
```

A class that prints to `$stdout` directly cannot be tested without capturing the global stream. A class that takes a
stream can be handed a `StringIO`, and the test reads the result. That is the whole trick, and it is worth the one
extra keyword.

## Writing a file safely

```ruby
def write_atomically(path, text)
  temp = "#{path}.tmp"
  File.write(temp, text)
  File.rename(temp, path)
end
```

A rename within the same directory is atomic on every platform this course runs on, so a reader either sees the old
file or the new one. Writing directly to `path` leaves the half-written version visible if the process dies in the
middle, which is the failure that ruins a data file. The cost is one extra file in the directory while the write is
in progress.

## Check yourself

Write a method that reads a text file and returns a hash of line number to line length, using `each_line` rather than
`read`. Then write the same information to a new file in the form `3: 12`, and check the result with
`File.readlines(path, chomp: true)`.
