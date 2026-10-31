---
title: Strings and symbols
summary: Two kinds of text, why a symbol is duration, how mutation surprises people, and where a byte order mark hides.
chapter: Getting started
minutes: 15
status: draft
---

## Two kinds of literal

```ruby
title = 'The Poetic Edda'
genre = "science-fiction"
message = "#{title} is #{genre}"
```

Single quotes are literal. Double quotes interpolate and understand escapes:

```ruby
puts "two\nlines"
puts 'two\nlines'
```

```text
two
lines
two\nlines
```

The rule people settle on is double quotes for anything with interpolation in it and no strong opinion for the
rest. Both produce a `String`, and there is no performance argument worth making between them.

A word list has its own syntax, and it produces strings:

```irb
>> words = %w[science-fiction non-fiction poetry]
=> ["science-fiction", "non-fiction", "poetry"]
>> words.map(&:upcase)
=> ["SCIENCE-FICTION", "NON-FICTION", "POETRY"]
```

## Heredocs

A block of text with its own indentation is a heredoc. The `~` versions strip the leading whitespace, which is what
makes them usable inside a method:

```ruby
def to_text(catalogue, loans)
  <<~REPORT
    Northside Library
    Books: #{catalogue.size}, on loan: #{loans.size}
  REPORT
end
```

`<<~REPORT` starts the text, `REPORT` on its own line ends it, and the common indentation is removed from every
line. `<<-REPORT` only allows the terminator to be indented, which leaves the text itself alone; `<<~` is the one
to reach for.

## Symbols

A symbol is a name with a colon in front of it. It looks like a string and behaves like a number: two symbols with
the same characters are the same object, which is why they are used for hash keys and option flags.

```irb
>> :ok.class
=> Symbol
>> :ok.frozen?
=> true
>> :"two words".to_s
=> "two words"
>> "dune".to_sym.class
=> Symbol
```

Compare that with strings, which are equal in value and different in identity:

```irb
>> "dune".equal?("dune")
=> false
>> :dune.equal?(:dune)
=> true
```

The trade-off is real. A symbol is created once and lives for the life of the process, so a symbol built from user
input is a leak; `"dune".to_sym` in a loop over request data is a bad idea. Names that come from your own code go in
a symbol, and text that comes from a file, a form or an API stays a string until you have decided it is safe.

That is why the hash in this course's report has both:

```ruby
{ "title" => "Dune" }        # keys from a JSON file
{ title: "Dune" }            # keys written in the code
```

`{ title: "Dune" }` is shorthand for `{ :title => "Dune" }`, and the two styles cannot be mixed in one literal.

## The methods you will use

```irb
>> format("%-18s %d", "poetry", 1)
=> "poetry             1"
>> "  Ada Lovelace  ".strip
=> "Ada Lovelace"
>> "northside".chars.first(2).join
=> "no"
>> "a,b,,".split(",")
=> ["a", "b"]
>> "a,b,,".split(",", -1)
=> ["a", "b", "", ""]
>> "Dune".downcase.include?("dun")
=> true
```

`format` pads a field to a width, which is how the report lines up its columns. `split` throws away trailing empty
fields unless the limit is negative, which is the difference between parsing CSV data with two empty columns and
losing them. Both are worth knowing before you write a report by hand.

The ones that change the receiver rather than return a new string are unsafe in the same way `<<` is:

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

`<<` appends to the string both names point at. `+` does not:

```ruby
greeting = greeting + "side"   # farewell still sees "north"
```

For a string that should not be changed at all, freeze it, either with the magic comment at the top of the file or
with a unary minus on one literal:

```irb
>> (-"ruby").frozen?
=> true
>> "ruby".dup.frozen?
=> false
```

`-"ruby"` returns a frozen string. `dup` returns an unfrozen copy. Both are faster than they look and both say what
you mean to the next reader.

## Where a byte order mark hides

A file written by a Windows tool often starts with three bytes that no editor shows, and the first line of a
Ruby error message about that file looks like this:

```text
loan.rb:39:in 'Hash#fetch': key not found: "book_id" (KeyError)
Did you mean?  "﻿book_id"
```

That "Did you mean?" is Ruby showing you a string that is visually identical to the one you asked for. The fix is
an encoding that strips the mark:

```ruby
CSV.read(path, headers: true, encoding: "bom|utf-8")
```

Ruby reads text as UTF-8 by default and does not strip a mark for you. Any file that another program wrote is worth
reading with `"bom|utf-8"`, and any file this program writes is worth writing without a mark.

## Check yourself

Write a method that takes a name and returns it with the first letter of each part capitalised, then check what it
does with `"ada  lovelace"` and `"ADA LOVELACE"`. Then read a file you wrote with a Windows editor, print
`File.read(path, encoding: "bom|utf-8").bytes.first(3)`, and compare it with the same file read as plain UTF-8.
