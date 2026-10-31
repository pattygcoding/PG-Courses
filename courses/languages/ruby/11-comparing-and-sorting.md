---
title: Comparing and sorting
summary: One method unlocks the comparison operators, and a tie is the case that bites.
chapter: Core objects
minutes: 13
status: draft
---

## One method, six operators

Implement `<=>` and include `Comparable`, and the ordering operators arrive with it:

```ruby
module Northside
  Loan = Data.define(:book_id, :member, :days, :borrowed_on) do
    include Comparable

    def due_on
      borrowed_on + days
    end

    def <=>(other)
      due_on <=> other.due_on
    end
  end
end
```

`due_on <=> other.due_on` is the whole comparison. It returns `-1`, `0` or `1`, which is what `Date#<=>` already
returns, and `Comparable` turns that into `<`, `<=`, `==`, `>=`, `>` and `between?`.

The test that proves it is short:

```ruby
test "loans sort by due date" do
  short = Northside::Loan.new(book_id: "dune", member: "Ada", days: 7, borrowed_on: Date.new(2026, 10, 31))
  long = Northside::Loan.new(book_id: "edda", member: "Grace", days: 21, borrowed_on: Date.new(2026, 10, 31))

  assert_equal [ short, long ], [ long, short ].sort
  assert_operator short, :<, long
end
```

Two loans in, sorted order out, and the comparison operator working directly. `Comparable` is worth implementing even
when you only need `sort`, because the next reader will reach for `<` before they read the class.

## Sorting a list of things that do not compare

`sort` on objects without a `<=>` raises:

```text
(irb):3:in 'Array#sort': comparison of Book with Book failed (ArgumentError)
```

The same list with a number and a string in it says which two values it could not order:

```text
(irb):1:in 'Array#sort': comparison of String with 1 failed (ArgumentError)
```

```ruby
books.sort_by { |book| book.title }
books.sort { |a, b| a.title <=> b.title }
```

`sort_by` evaluates the key once per element and sorts the keys. `sort` calls the block for every comparison, so with
`n` elements it runs on the order of `n log n` times. For a key that is cheap, the difference does not matter; for a
key that touches another object or parses a date, `sort_by` is the one to use.

Both keep the receiver and return a new array. `sort!` and `sort_by!` change it in place.

## Ties

Ruby's `sort` is not documented as stable, so two elements with equal keys may come out in either order. When the
order has to be reproducible, make the key decide:

```irb
>> pairs = [["b", 1], ["a", 1], ["c", 2]]
>> pairs.sort_by { |letter, count| count }
=> [["b", 1], ["a", 1], ["c", 2]]
>> pairs.sort_by { |letter, count| [count, letter] }
=> [["a", 1], ["b", 1], ["c", 2]]
```

The first version happened to keep the original order here, and there is no promise that it will next time. The
second version says what it means: ascending by count, and alphabetical when the counts match. That trick, an array
as the key, is how the report in this course sorts its genre table:

```ruby
def by_genre
  @catalogue.group_by(&:genre).transform_values(&:size).sort_by { |genre, count| [ -count, genre ] }
end
```

Negating the count sorts descending without writing a comparison. `[ -count, genre ]` sorts by count descending and
then by genre ascending.

## The rest of the family

```ruby
numbers.min
numbers.max
numbers.min_by { |n| n.abs }
numbers.max_by { |n| n.abs }
numbers.sum
numbers.tally
numbers.clamp(1, 5)
numbers.sort_by { |n| -n }.first(3)
```

`min_by` and `max_by` take a key like `sort_by` does. `clamp` fits a value into a range, which is the readable
version of two `if` statements. `sort_by { ... }.first(3)` is a full sort to get three elements, so for a long list
`min_by`/`max_by` or `each_with_object` beats it.

## Where a value is not comparable

`<=>` may return `nil`, which means "these cannot be ordered". That is what `Object#<=>` does, and it is what makes
`[1, "two"].sort` fail rather than produce something arbitrary. If you implement `<=>` for your own type, returning
`nil` for a value you cannot compare is the honest answer, and `sort` will raise rather than guess.

Equality is a separate subject with its own method, `==`, and a hash needs `eql?` and `hash` as well. The idioms
chapter takes that apart, and the two are easy to confuse: `Comparable` gives you `==` from `<=>`, and a `==` you
define yourself overrides it.

## Check yourself

Add a `Catalogue#by_due_date` that returns the outstanding loans sorted by due date and then by member name. Then
explain why `assert_equal [short, long], [long, short].sort` passes with the `Comparable` implementation above and
fails without it.
