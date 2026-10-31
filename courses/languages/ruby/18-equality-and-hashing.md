---
title: Equality and hashing
summary: Three methods that look like one, why 1.0 is not a hash key for 1, and what dup does not copy.
chapter: Idioms
minutes: 14
status: draft
---

## Three questions that look like one

```irb
>> 1 == 1.0
=> true
>> 1.eql?(1.0)
=> false
>> 1.equal?(1)
=> true
>> "a".equal?("a")
=> false
```

- `==` asks whether two values are the same value. It is what you write, and it is the one that can be overridden.
- `eql?` asks a stricter question, and it is what hashes use. `1.eql?(1.0)` is false because an integer and a float
  are not interchangeable as keys.
- `equal?` asks whether two names point at the same object. It cannot be overridden, and it is rarely what you want.

The practical consequence of the middle one:

```irb
>> { 1 => "integer" }[1.0]
=> nil
>> { 1 => "integer" }[1]
=> "integer"
>> { 1.0 => "float" }.key?(1)
=> false
```

A hash looks a key up by `hash` and then confirms with `eql?`, so `1.0` is a different key from `1` even though `1 ==
1.0`. That is why a `BigDecimal` and a `Float` will not find each other's entries, and why mixing number types as
hash keys is worth avoiding.

## hash has to agree with eql?

```irb
>> 1.hash == 1.0.hash
=> false
>> "dune".hash == "dune".hash
=> true
```

Two objects that are `eql?` must return the same `hash`, or a hash lookup will put them in different buckets and
never find them. Strings get this right by default, and so do `Data` and `Struct` objects. A plain class does not:

```ruby
class Book
  def initialize(title)
    @title = title
  end
end

Book.new("Dune") == Book.new("Dune")   # false
```

Two objects with identical contents are not equal, because a plain class compares identity. `Data` and `Struct` are
worth using largely for the four methods they write for you: `==`, `eql?`, `hash` and `inspect`.

That is what makes the catalogue's round-trip test meaningful:

```ruby
test "a book round trips through a hash" do
  book = Northside::Book.new(id: "dune", title: "Dune", author: "Frank Herbert", genre: "science-fiction", copies: 3)

  assert_equal book, Northside::Book.from_h(book.to_h)
end
```

`assert_equal` calls `==`, so the test fails if the two objects differ in any field. The same test written against a
plain class would compare identity and always fail.

## Sets

```irb
>> require "set"
>> Set.new([1, 2]) == Set.new([2, 1])
=> true
>> (Set.new([1]) | Set.new([2])).to_a
=> [1, 2]
```

`Set` is in the standard library, uses `eql?` and `hash` for membership, and has no order. It is the right collection
when the question is whether something is in there:

```ruby
borrowed = Set.new(loans.map(&:book_id))
catalogue.select { |book| borrowed.include?(book.id) }
```

`Array#include?` walks the list; `Set#include?` is a lookup. Past a few dozen items in a loop, that difference is the
difference between a report that runs and one that does not.

## What the ampersand and case equality use

`Array#&` and `Array#|` use `hash` and `eql?` too, so they treat a `Data` object as one value:

```ruby
[ book_a ] & [ book_b ]       # one element when the two are equal
```

`case/when` uses a different method again, `===`:

```irb
>> case "dune"
>>   when String then "a string"
>>   when Integer then "a number"
>> end
=> "a string"
```

`String === "dune"` is true when the left side is a class and the right side is an instance. A range and a regular
expression define `===` as well, which is why `when 1..3` and `when /dune/` work. Three equality-ish methods, three
jobs.

## dup and clone

```irb
>> a = "dune"
>> b = a.dup
>> [a.equal?(b), a == b]
=> [false, true]
```

`dup` makes a new object with the same contents. It is a shallow copy: with a list of lists, the inner lists are
shared, and a change to one is visible through both names.

```ruby
rows = [ [1, 2], [3, 4] ]
copy = rows.dup
copy[0] << 3        # rows[0] is now [1, 2, 3] as well
```

For a deep copy the options are `Marshal.load(Marshal.dump(rows))`, which needs every object in the tree to be
marshallable, or building the structure fresh. Most of the time the answer is not to copy at all, which is what
immutable values are for.

`clone` is the close relative that also copies the frozen state and the singleton methods. For everything in this
course, `dup` is the one you want.

## Check yourself

Write a plain class that holds an id and a title and implements `==`, `eql?` and `hash` so that it can be used as a
hash key, then check it against two objects with the same fields and one with a different title. Then try
`Marshal.load(Marshal.dump([1, "two", { three: 3 }]))` and find one common object that refuses to be marshalled.
