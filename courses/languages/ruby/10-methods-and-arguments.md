---
title: Methods and arguments
summary: Positional, keyword, splat and double splat, in the one order the parser accepts.
chapter: Core objects
minutes: 14
status: draft
---

## The four kinds of parameter

```ruby
def basket(items, *rest, size: 2, **options)
  [ items, size, rest, options ]
end
```

```irb
>> basket([1])
=> [[1], 2, [], {}]
>> basket([1], size: 3)
=> [[1], 3, [], {}]
>> basket([1], 'extra', 9, note: 'hi')
=> [[1], 2, ["extra", 9], {note: "hi"}]
>> basket([1], size: 3, note: 'hi')
=> [[1], 3, [], {note: "hi"}]
```

Read the signature in four parts:

- `items` is required and positional.
- `*rest` collects any further positional arguments into an array.
- `size: 2` is a keyword argument with a default.
- `**options` collects any remaining keyword arguments into a hash.

The order matters, and the parser enforces it. Putting `size:` before `*rest` is refused:

```text
(irb):1: syntax errors found (SyntaxError)
> 1 | def basket(items, size: 2, *rest, **options)
    |                            ^ unexpected parameter order
```

The rule is that positional parameters come first, then the splat, then keywords, then the double splat. A signature
that needs to be read twice is worth splitting into two methods, and the double splat is worth avoiding unless the
method is genuinely forwarding options it does not understand.

## Keyword arguments as documentation

The course's project uses keywords wherever a call has more than two arguments:

```ruby
Northside::Loan.new(book_id: "dune", member: "Ada Lovelace", days: 7)
Northside::Report.new(catalogue: catalogue, loans: loans, waiting: {})
```

Two positional strings in a row are easy to get the wrong way round and hard to read at the call site. `Book.new` in
this project also shows how a keyword can have a default:

```ruby
def initialize(id:, title:, author:, genre:, copies: 1)
  super
end
```

`id:` with no default is required, and a call without it raises `ArgumentError: missing keyword: :id` before the body
runs, which is the cheapest possible failure.

## More than one value back

```irb
>> def two_values
?>   return 1, 2
?> end
=> :two_values
>> a, b = two_values
=> [1, 2]
>> first, *others = [1, 2, 3]
=> [1, 2, 3]
>> others
=> [2, 3]
>> head, *middle, tail = [1, 2, 3, 4]
=> [1, 2, 3, 4]
>> [head, middle, tail]
=> [1, [2, 3], 4]
```

`return 1, 2` builds an array and the left side of the assignment unpacks it. This is how a method returns a value and
a status without inventing a class:

```ruby
def fetch_with_remaining(id)
  book = fetch(id)
  [ book, book.copies - 1 ]
end
```

Above three values, a small `Data` object is easier to keep straight than a positional list, and the next chapter is
about those.

## Defaults are evaluated per call

```ruby
def due_today?(loan, today = Date.today)
  loan.due_on == today
end
```

`Date.today` is called on each invocation, so the default is today's date rather than the date the file was loaded.
The same rule applies to a default that builds an array or a hash, and it is the reason `Hash.new([])` is a trap and
`Hash.new { |hash, key| hash[key] = [] }` is not.

## Forwarding

```ruby
def forward(...)
  basket(...)
end
```

`...` forwards every argument it was given, positional and keyword, without naming them. It exists for the case where
a method adds something around a call and must not care what the call takes.

## Where a method lives

```ruby
def report(rows)      # a private method on Object when written at the top level
  rows.sum
end

module Northside
  def self.version    # a method on the module itself
    VERSION
  end
end
```

A bare `def` at the top level defines a private method on `Object`, so every object in the program has it. That is
fine for a script and a bad idea for a library: put methods on a class or a module, which is what the project does.

`private` marks the methods below it as unavailable with an explicit receiver, which is how a class keeps its
internals interior, and the endless form shows up where a method is one expression:

```ruby
class Catalogue
  def fetch(id) = @books.fetch(id)

  private

  def normalize(text) = text.downcase.strip
end
```

```irb
>> c.normalize('Dune')
(irb):8:in '<main>': private method 'normalize' called for an instance of Catalogue (NoMethodError)
>> Catalogue.private_method_defined?(:normalize)
=> true
```

That is the point: a private method is a promise about what callers may rely on, and `private_method_defined?` is how
the test suite checks that the promise is still there.

## Check yourself

Write a method that takes one required argument, one optional keyword, and any number of extra positional arguments,
and returns a hash of what it received. Call it four ways and check each result. Then make one of its methods private
and confirm the error you get from outside.
