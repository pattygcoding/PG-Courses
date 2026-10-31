---
title: Objects and methods
summary: A method call is a message, every value has a class, and parentheses are optional until they are not.
chapter: Getting started
minutes: 14
status: draft
---

## Everything has a class

```irb
>> 3.class
=> Integer
>> nil.class
=> NilClass
>> self.class
=> Object
>> 1.2.class
=> Float
>> (1..5).class
=> Range
>> :ok.class
=> Symbol
```

There are no special cases to learn. A number is an instance of a class, `nil` is an instance of `NilClass`, and
`self` at the top level is the main object, which is an `Object`. Even a class is an object:

```irb
>> Integer.class
=> Class
>> Integer.superclass
=> Numeric
```

That is the reason `Integer("42")` is a method call rather than a cast, and the reason a class can be passed to a
method as a value.

## A call is a message

```irb
>> Object.new.methods.size
=> 56
>> 3.send(:+, 4)
=> 7
>> "ruby".respond_to?(:each_char)
=> true
```

`3.send(:+, 4)` and `3 + 4` are the same call. The dot form is syntax sugar for sending a message, and the reason
it matters is that anything the receiver answers to can be sent by name, including from a variable:

```ruby
method = :upcase
"ruby".send(method)
```

`respond_to?` asks first, which is how a program checks whether it is talking to something that can answer, rather
than rescuing a `NoMethodError`.

## Parentheses

```ruby
puts "northside"
puts("northside")
book.title
book.title()
```

All four are valid. The convention in Ruby is to leave the parentheses off when the call is a command, and to keep
them when the result is being chained or the arguments are more than one expression long:

```ruby
puts book.title
books.map { |book| book.title }.sort.first(2)
format("%-18s %d", genre, count)
```

## Names carry meaning

| Ending | Meaning | Example |
| --- | --- | --- |
| `?` | answers a question | `book.available?` |
| `!` | changes something, or raises | `book.lend!` |
| `=` | assignment | `book.copies = 3` |
| `to_s` | a string for a person | `"Dune by Frank Herbert"` |
| `to_h` | a hash of the fields | `{ "title" => "Dune" }` |
| `inspect` | a string for a developer | `#<Book title="Dune">` |

The `!` mark is a warning rather than a promise. `book.lend!` decrements the copies and raises when there are none
left; `Array#sort!` sorts in place. Both change the receiver or fail, and neither is enforced by the language, so it
is on you to keep the convention.

## What an object prints as

`to_s` is for people reading output, `inspect` is for people reading a session. `p` and `irb` use `inspect`:

```irb
>> p "northside"
"northside"
=> "northside"
>> puts "northside"
northside
=> nil
```

The difference becomes obvious the moment a value is not a string. This is a real error message from a test run in
this course that compared a loan id with a loan:

```text
Expected: "dune"
  Actual: #<data Northside::Loan book_id="dune", member="Ada", days=14, borrowed_on=#<Date: 2026-10-31 ...>>
```

`inspect` named the class, every field and their values, which was enough to see that the wrong object had been
returned. Write `to_s` for the output a user reads and leave `inspect` to the default, which is what `Data` and
`Struct` give you for free.

## Frozen things

```irb
>> "ruby".frozen?
=> false
>> (-"ruby").frozen?
=> true
>> [1, 2, 3].frozen?
=> false
>> nil.frozen?
=> true
```

A frozen object raises when something tries to change it. Strings, arrays and hashes are not frozen by default, and
the magic comment at the top of a file freezes every string literal in it:

```ruby
# frozen_string_literal: true
```

Every file in this course's project starts with that line. The point is not speed; it is that a string literal in a
constant cannot be changed by accident from somewhere else.

```irb
>> greeting = "north"
=> "north"
>> farewell = greeting
=> "north"
>> greeting << "side"
=> "northside"
>> farewell
=> "northside"
```

Two names, one object, and `<<` changed the object both of them point at. That is the next page's subject, along
with `-` and how it freezes.

## Check yourself

In `irb`, run `Object.new.methods.sort` and pick out three methods you do not recognise, then look up
`Object.new.send(:frozen?)` and explain why it returns what it does. Then write a file with two methods, one ending
in `?` and one ending in `!`, and make the second one raise rather than return nil when it cannot do its job.
