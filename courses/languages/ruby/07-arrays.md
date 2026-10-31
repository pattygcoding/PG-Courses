---
title: Arrays
summary: The method list you actually use, what changes a list in place, and a block that gets thrown away.
chapter: Core objects
minutes: 15
status: draft
---

## A list with a large vocabulary

```ruby
books = [ "Dune", "The Poetic Edda" ]
books = Array.new(3, "Dune")
```

The first is a literal. The second builds three references to the same string, which is a different thing from three
copies, and one more reason the page on equality exists.

Reading and writing:

```irb
>> queue = []
=> []
>> queue.push(1)
=> [1]
>> queue << 2
=> [1, 2]
>> queue.pop
=> 2
>> queue.first(1)
=> [1]
```

`<<` and `push` add to the end, `pop` takes from the end, `shift` and `unshift` work on the front, and `first` and
`last` read either end. `queue.first(1)` returns an array and `queue.first` returns the element, which is worth
remembering when the value gets passed on.

## The methods that replace loops

```irb
>> numbers = [3, 1, 4, 1, 5]
>> numbers.map { |n| n * 2 }
=> [6, 2, 8, 2, 10]
>> numbers.select(&:odd?)
=> [3, 1, 1, 5]
>> numbers.reject(&:odd?)
=> [4]
>> numbers.find { |n| n > 3 }
=> 4
>> numbers.sum
=> 14
>> numbers.tally
=> {3 => 1, 1 => 2, 4 => 1, 5 => 1}
```

`map` transforms every element, `select` keeps the ones the block answers true for, `reject` keeps the ones it
answers false for, and `find` stops at the first match. `sum` and `tally` are the two that save the most code: a
count of everything in a list is one call.

Grouping and slicing:

```irb
>> numbers.group_by(&:odd?)
=> {true => [3, 1, 1, 5], false => [4]}
>> numbers.partition(&:even?)
=> [[4], [3, 1, 1, 5]]
>> numbers.each_slice(2).to_a
=> [[3, 1], [4, 1], [5]]
>> numbers.zip(%w[a b c d e])
=> [[3, "a"], [1, "b"], [4, "c"], [1, "d"], [5, "e"]]
```

`group_by` and `partition` answer the same question with different shapes: a hash keyed by the block's answer, or a
two-element array of false and true. `each_slice` walks a list in fixed-size chunks, and `zip` pairs it with another
list.

Set operations, which work on values rather than positions:

```irb
>> [1, 2] + [3]
=> [1, 2, 3]
>> [1, 2, 3] - [2]
=> [1, 3]
>> [1, 2, 3] & [2, 3, 4]
=> [2, 3]
>> [1, 2, 3] | [3, 4]
=> [1, 2, 3, 4]
```

## Aliasing, which is where bugs live

```irb
>> a = [1, 2]
=> [1, 2]
>> b = a
=> [1, 2]
>> a << 3
=> [1, 2, 3]
>> b
=> [1, 2, 3]
```

`b` is not a copy of `a`; both names point at one array. `<<` changes that array. The method that returns a new array
is the one without the `!`, and the ones that change it in place end in `!`:

```ruby
sorted = numbers.sort        # numbers is unchanged
numbers.sort!                # numbers is now sorted
```

## Sorting

```irb
>> numbers.sort
=> [1, 1, 3, 4, 5]
>> numbers.sort { |a, b| b <=> a }
=> [5, 4, 3, 1, 1]
>> numbers.max_by { |n| -n }
=> 1
```

A block passed to `sort` has to return `-1`, `0` or `1`, which is what `<=>` gives you. Writing that by hand is
rare; `sort_by` takes the key instead:

```ruby
books.sort_by { |book| [ book.genre, book.title ] }
```

`sort_by` computes the key once per element and sorts on the results, so a key that is expensive to work out is
computed once rather than once per comparison. An array as a key sorts by the first value and then the second, which
is how you sort by genre and then by title without writing a comparison.

## A block that gets thrown away

This is a real bug from this course's project, kept because it is easy to make:

```ruby
def most_borrowed
  @loans.tally { |loan| loan.book_id }.max_by { |_id, count| count }&.first
end
```

The test expected `"dune"` and got a loan:

```text
Expected: "dune"
  Actual: #<data Northside::Loan book_id="dune", member="Ada", days=14, borrowed_on=#<Date: 2026-10-31 ...>>
```

`tally` takes no block. A block passed to a method that does not yield is silently ignored, so `tally` counted the
loans themselves, every loan was distinct, every count was 1, and `max_by` returned the first loan it saw. The fix
is to map first:

```ruby
@loans.map(&:book_id).tally.max_by { |_id, count| count }&.first
```

Ruby will not warn about a block it does not use. When a method returns something the right shape and the wrong
content, that is one of the first things to check.

## Check yourself

Take a list of titles and produce a hash of letter to count, one entry per distinct first letter. Then explain why
`[1, 2] & [1, 2]` and `[1, 2] | [1, 2]` both return the same list, and write the expression that returns only the
elements in the first list and not the second.
