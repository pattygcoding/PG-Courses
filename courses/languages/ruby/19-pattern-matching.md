---
title: Pattern matching
summary: case/in destructures a value as it matches it, and refuses to guess when nothing fits.
chapter: Idioms
minutes: 14
status: draft
---

## Two kinds of case

```irb
>> case "dune"
>>   when String then "a string"
>>   when Integer then "a number"
>> end
=> "a string"
```

`when` calls `===` on each value and takes the first that answers true. A class, a range and a regular expression all
define `===`, which is why `when 1..3` and `when /dune/` work, and why `when String` means "is an instance of".

`in` does something else. It matches a *shape* and binds names as it goes:

```irb
>> case [1, 2]
>>   in [Integer => first, *rest]
>>     [first, rest]
>>   end
=> [1, [2]]
```

The pattern said "an array whose first element is an integer, and then anything else". `Integer => first` bound the
first element to `first`, `*rest` bound the remainder, and the body used both.

## Hash patterns and nesting

```irb
>> response = { body: { books: [{ id: "dune" }] } }
>> case response
>>   in { body: { books: [{ id: }] } }
>>     id
>>   end
=> "dune"
```

The pattern describes the path to the value and binds the leaf. Extra keys in the hash are ignored, so a pattern
matches a response that has more fields than the pattern names.

That makes a `case/in` a good fit for parsing something you did not design:

```ruby
case JSON.parse(text, symbolize_names: true)
in { books: Array => books }
  books.map { |book| Book.from_h(book) }
in { error: String => message }
  raise ArgumentError, message
else
  raise ArgumentError, "unexpected catalogue shape"
end
```

## Alternatives and guards

```irb
>> case 1
>>   in Integer | Float then "a number"
>>   end
=> "a number"
```

Alternatives are separated by `|`. A guard is an `if` at the end of the pattern:

```irb
def describe(book)
  case book
  in { title:, copies: 0 }
    "#{title} is out"
  in { title:, copies: Integer => copies } if copies > 2
    "#{title} has plenty (#{copies})"
  in { title: }
    "#{title} has some"
  else
    "not a book"
  end
end
```

```irb
>> describe({ title: "Dune", copies: 0 })
=> "Dune is out"
>> describe({ title: "Dune", copies: 3 })
=> "Dune has plenty (3)"
>> describe({ title: "Dune", copies: 1 })
=> "Dune has some"
>> describe({ genre: "poetry" })
=> "not a book"
```

Order matters, exactly as it does with `when`: the first pattern that matches wins. `{ title:, copies: 0 }` is
deliberately first so that the empty shelf is decided before the count is compared.

## When nothing matches

```irb
>> case 1
>>   in String then "no"
>>   end
=> NoMatchingPatternError
```

There is no implicit fall-through to nil. A `case/in` with no matching pattern and no `else` raises
`NoMatchingPatternError`, which is the right answer at a boundary and the reason `case/in` is safer than a chain of
`if`s for parsing.

## Matching your own objects

`in` works with any object that implements `deconstruct` (for array patterns) or `deconstruct_keys` (for hash
patterns). `Data` defines both, so a `Data` object matches on its members:

```irb
>> Point = Data.define(:x, :y)
>> case Point.new(1, 2)
>>   in Point(x: 1, y:)
>>     y
>>   end
=> 2
```

The class name in front of the pattern checks the type, and the keys are the member names. For a `Struct` the same
thing works. For a plain class, write the method:

```ruby
class Loan
  def deconstruct_keys(_keys)
    { book_id: book_id, member: member, due_on: due_on }
  end
end
```

Now `in { member:, due_on: }` works on a loan, and the method is also the place to decide which internal state is part
of the object's public shape.

## Where it earns its place

The project's command line dispatcher is a plain `case` on a string:

```ruby
case command
when "list" then list(options)
when "find" then find(rest.first)
when "show" then show(rest.first)
when "lend" then lend(rest.first, options)
when "report" then report(options)
end
```

That is the right tool for a string with six known values, and a pattern version would be longer. Pattern matching
pays off when the value is structured and part of it is unknown: a JSON response, a configuration file, a nested
argument list. In those places it replaces a run of `is_a?` checks and hash reads, and it names every field it
depends on in one place.

## Check yourself

Write a method that takes a parsed JSON value and returns a summary for each of these shapes: an object with a
`books` array, an object with an `error` string, an array of ids, and anything else. Then add a fifth shape and see
how much of the method changes.
