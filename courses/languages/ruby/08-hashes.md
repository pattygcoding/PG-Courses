---
title: Hashes
summary: Keys that are symbols or strings, fetch instead of brackets, and the four transformations that cover most work.
chapter: Core objects
minutes: 14
status: draft
---

## A dictionary with two syntaxes

```ruby
counts = { "dune" => 3, "edda" => 1 }   # string keys, usually from data
counts = { dune: 3, edda: 1 }           # symbol keys, usually from code
```

`dune: 3` is shorthand for `:dune => 3` and the two styles cannot be mixed in one literal. Which one to use follows
from where the keys come from: a hash parsed from JSON has string keys, and a hash written in your own code has
symbols.

Keys are hashed, so lookup is constant time whatever the size. That also means keys have to be stable: a key whose
`hash` changes after it is in the hash can no longer be found, which is why strings and numbers are the usual keys
and mutable objects are not.

## Reading, and the difference between nil and missing

```irb
>> counts.fetch("dune")
=> 3
>> counts.fetch("nope", 0)
=> 0
>> counts.fetch("nope") { |key| "no #{key}" }
=> "no nope"
>> counts["nope"]
=> nil
```

`counts["nope"]` and `counts.fetch("nope", 0)` both answer without raising, and they answer differently: `nil` means
the caller cannot tell whether the key was absent or present with a nil value. `fetch` with a default is what you
want when absence is expected, and bare `fetch` is what you want when it is a bug:

```ruby
def self.from_h(hash)
  new(
    id: hash.fetch("id"),
    title: hash.fetch("title"),
    author: hash.fetch("author"),
    genre: hash.fetch("genre"),
    copies: hash.fetch("copies", 1)
  )
end
```

That is this course's `Book.from_h`, which reads a hash from a JSON file. It uses `hash.fetch("id")` for the fields
the file must have, so a file missing one stops with `KeyError` naming the field rather than building an object full
of nils. The one field with a default is the one whose absence is a sensible default.

Nested reads have their own method:

```irb
>> { a: { b: { c: 1 } } }.dig(:a, :b, :c)
=> 1
>> { a: { b: 1 } }.dig(:a, :missing, :c)
=> nil
```

`dig` walks a path and returns nil as soon as a step is missing, which turns a chain of `&.` calls into one
expression.

## Four transformations

```irb
>> counts.merge("edda" => 5)
=> {"dune" => 3, "edda" => 5}
>> counts
=> {"dune" => 3, "edda" => 1}
>> counts.transform_values { |n| n * 2 }
=> {"dune" => 6, "edda" => 2}
>> counts.map { |title, n| [title, n * 2] }.to_h
=> {"dune" => 6, "edda" => 2}
>> counts.except("dune")
=> {"edda" => 1}
```

`merge` returns a new hash and `merge!` changes the receiver. `transform_values` changes values and keeps keys, and
`except` returns a copy without some keys. `select` and `reject` work on hashes too, comparing key and value in the
block.

Sorting a hash returns pairs, because a hash has no order to sort:

```irb
>> counts.sort_by { |title, n| [n, title] }
=> [["edda", 1], ["dune", 3]]
>> counts.max_by { |title, n| n }
=> ["dune", 3]
```

## Counting with a hash

The pattern worth memorising is a hash that starts empty and accumulates:

```irb
>> books = [{ id: "dune" }, { id: "edda" }]
>> books.to_h { |book| [book[:id], book] }
=> {"dune" => {id: "dune"}, "edda" => {id: "edda"}}
>> books.each_with_object(Hash.new(0)) { |book, counts| counts[book[:id]] += 1 }
=> {"dune" => 1, "edda" => 1}
```

`to_h` with a block turns any list into a hash keyed by whatever the block returns. `Hash.new(0)` gives a hash whose
missing values default to zero, which removes the `if counts[key]` dance from every counting loop. Left off, the same
expression raises on the first key:

```ruby
counts = {}
counts["dune"] += 1   # NoMethodError: undefined method '+' for nil
```

The default has a second form worth knowing, because `Hash.new([])` hands *the same array* to every missing key.

## Where a hash comes from and where it goes

This is how the course's catalogue indexes itself:

```ruby
def initialize(books = [])
  @books = books.to_h { |book| [book.id, book] }.freeze
end

def fetch(id)
  @books.fetch(id) { raise MissingBook, id }
end
```

A list in, a lookup table out, frozen so nothing else can change it. The `fetch` block is how a missing id becomes a
named error rather than a nil that travels three methods before it breaks something.

Grouping is the inverse:

```ruby
def by_genre
  @catalogue.group_by(&:genre).transform_values(&:size).sort_by { |genre, count| [ -count, genre ] }
end
```

That one line is the report's genre table: group by genre, count each group, sort by count descending and then by
name.

## Check yourself

Write a method that takes a list of books and returns the number of copies per genre, sorted with the largest first.
Then write the same result with `tally` instead of `group_by` and decide which one you would rather read in six
months.
