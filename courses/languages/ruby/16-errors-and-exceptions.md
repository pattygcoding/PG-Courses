---
title: Errors and exceptions
summary: raise, rescue, ensure and retry, and why a library should not rescue what it cannot handle.
chapter: Classes and modules
minutes: 15
status: draft
---

## Raising

```ruby
def check(value)
  raise ArgumentError, "not a number" unless value.is_a?(Numeric)

  value * 2
end
```

```irb
>> check(2)
=> 4
>> check("two")
(irb):22:in 'Object#check': not a number (ArgumentError)
```

The message comes first in that error report and the class is in brackets at the end. `raise ArgumentError, "..."` is
the two-argument form; `raise "not a number"` raises a `RuntimeError`, and `raise MyError` with no message uses the
class name. A bare `raise` inside a `rescue` re-raises whatever it caught, which is how a method adds context without
swallowing the error:

```ruby
rescue JSON::ParserError => error
  raise MissingBook, "catalogue file is not JSON: #{error.message}"
```

## Rescuing

```ruby
begin
  catalogue = store.read_catalogue
rescue Errno::ENOENT
  warn "no catalogue file at #{path}"
  catalogue = Catalogue.new
end
```

A `begin`/`rescue`/`end` block catches what it names. The class in the `rescue` decides what is caught, including
subclasses, which is the reason the previous page built an error hierarchy.

`rescue` clauses are tried in order, so the specific one goes first:

```ruby
begin
  load_catalogue
rescue Northside::MissingBook
  "that book is not in the catalogue"
rescue Northside::Error => error
  "something else in the library: #{error.message}"
end
```

Inside a method body, `begin` and `end` can be left out:

```ruby
def read_catalogue
  Catalogue.from_json(File.read(path, encoding: "bom|utf-8"))
rescue Errno::ENOENT
  Catalogue.new
end
```

The project's `Store#read_loans` uses that form for the same reason: a missing loans file is an empty day, not a
failure.

## What not to rescue

```irb
>> begin
>>   raise LoadError, "cannot load such file -- nope"
>> rescue StandardError
>>   "rescued"
>> rescue ScriptError => error
>>   "not rescued as StandardError: #{error.class}"
>> end
=> "not rescued as StandardError: LoadError"
```

`LoadError` is not a `StandardError`; it is a `ScriptError`, alongside `SyntaxError` and `NotImplementedError`. That
split is deliberate. A bare `rescue` catches `StandardError` and its subclasses, so the errors that mean the program
itself is broken are not caught by accident.

Rescuing `Exception` catches all of them, including `SystemExit` and `Interrupt`, which means Ctrl-C stops working
and the process cannot exit. There is no good reason to do it in application code.

The rest of the discipline is about scope. A `rescue` that cannot do anything useful with the error should not be
there, because it hides the report a developer needs. Where a boundary has to keep going, the honest version says so:

```ruby
rescue StandardError => error
  warn "skipping #{row.inspect}: #{error.message}"
  next
end
```

That one prints what it skipped, so a run with data loss is visible rather than silent.

## ensure, else and retry

```ruby
def with_file(path)
  file = File.open(path)
  yield file
ensure
  file&.close
end
```

`ensure` runs whatever happened, including when an exception was raised, and it is how a resource gets closed. `&.`
covers the case where `File.open` raised and `file` is nil.

`else` runs only when no exception was raised, and `retry` runs the `begin` block again:

```irb
>> begin
>>   attempts += 1
>>   raise "flaky" if attempts < 3
>>   "worked on attempt #{attempts}"
>> rescue RuntimeError => error
>>   puts "failed: #{error.message}"
>>   retry
>> end
failed: flaky
failed: flaky
=> "worked on attempt 3"
```

`retry` with no limit is an infinite loop waiting for a bad day. A retry loop needs a counter, a backoff, or both, and
anything that talks to the network needs a deadline more than it needs a retry.

## Errors are the return value nobody sees

```ruby
def run(argv)
  # ...
  0
rescue OptionParser::ParseError => error
  @err.puts error.message
  64
rescue MissingBook, NotAvailable => error
  @err.puts error.message
  1
end
```

That is the command line tool in this project. Every failure path writes a sentence to standard error and returns a
number, so the shell can tell the difference between a successful run, a usage mistake (64, the convention for a
command line error) and a task that could not be done (1).

On Windows, some things are not implemented at all, and Ruby says so with an error you can rescue:

```irb
>> begin
>>   Process.fork
>> rescue NotImplementedError => error
>>   "fork refused: #{error.message}"
>> end
=> "fork refused: fork() function is unimplemented on this machine"
```

`NotImplementedError` is both a real error class and the thing a base class raises to say "a subclass has to
implement this". Both uses are in this chapter for that reason.

## Check yourself

Write a method that reads a JSON file and raises a `MissingBook` when the id is absent, then call it three ways: with
a good file, with a file missing the id, and with a file that is not JSON. Handle each error where it makes sense,
and decide which of the three callers should be the one to rescue.
