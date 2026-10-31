---
title: Classes and objects
summary: Instance variables, attr_reader, class methods, and what new actually does.
chapter: Classes and modules
minutes: 14
status: draft
---

## The smallest useful class

```ruby
class Counter
  attr_reader :count
  attr_writer :step

  def initialize(start = 0)
    @count = start
    @step = 1
  end

  def bump
    @count += @step
  end

  def to_s
    "Counter(#{@count})"
  end
end
```

```irb
>> c = Counter.new(2)
=> #<Counter:0x0000014e57c4e3b0 @count=2, @step=1>
>> c.count
=> 2
>> c.bump
=> 3
>> c
=> #<Counter:0x0000014e57c4e3b0 @count=3, @step=1>
>> puts c
Counter(3)
```

Four things are doing the work:

- `initialize` is called by `new` after the object has been allocated. It is always private, so `c.initialize` is a
  `NoMethodError` by design.
- An `@` name is an instance variable, and it exists only once something assigns it. Reading an unassigned one gives
  nil with no warning, which is the source of a whole genre of bugs.
- `attr_reader :count` defines a method called `count` that returns `@count`. `attr_writer :step` defines `step=`.
  `attr_accessor` defines both. None of them is a field declaration; all three are shorthand for method definitions.
- `to_s` is what `puts` and string interpolation use. Without it you get the default
  `#<Counter:0x0000014e57c4e3b0 @count=3, @step=1>`, which is the earlier line's output.

The `inspect` form shows the instance variables, which is why it is more useful than `to_s` while you are working:

```irb
>> c.instance_variables
=> [:@count, :@step]
>> Counter.instance_methods(false)
=> [:bump, :to_s, :count, :step=]
>> Counter.new.frozen?
=> false
>> Counter.ancestors.first(3)
=> [Counter, Object, PP::ObjectMixin]
```

`instance_methods(false)` lists the methods this class defines and not the ones it inherits, which is the fastest way
to see what a reader of the file would find. `ancestors` is the method lookup chain: the object's class, then
`Object`, then `Kernel` and `BasicObject` further down.

## Class methods and constants

```ruby
module Northside
  VERSION = "0.1.0"

  class Book
    GENRES = %w[science-fiction non-fiction poetry].freeze

    def self.from_h(hash)
      new(id: hash.fetch("id"), title: hash.fetch("title"))
    end
  end
end
```

`def self.from_h` defines a method on the class object rather than on its instances, so it is called as
`Book.from_h(...)`. That name is the convention for "build me one of these from something else", and `new` is the
convention for "build me one of these from its fields".

A constant is a name that starts with a capital and can be reassigned without a warning in Ruby, which is a shame.
`.freeze` on a list constant is the habit that stops `Book::GENRES << "graphic-novel"` from working from anywhere in
the program.

The two belong together:

```ruby
def self.parse(text)
  new(**JSON.parse(text, symbolize_names: true))
end
```

## What `new` does

```ruby
counter = Counter.new(2)
counter = Counter.allocate
counter.send(:initialize, 2)
```

Those two produce objects that behave the same way. `new` allocates, calls `initialize`, and returns the object;
overriding `new` is rare and almost always a sign that a factory method with a name of its own would read better.

`Class#new` on a subclass runs the subclass's `initialize`, and `super` from there runs the parent's. That chain is
the next page but one.

## Keeping internals interior

```ruby
class Report
  def initialize(catalogue:, loans: [], waiting: {})
    @catalogue = catalogue
    @loans = loans
    @waiting = waiting
  end

  def out_on_loan = @loans.size

  private

  def by_genre
    @catalogue.group_by(&:genre).transform_values(&:size)
  end
end
```

`attr_reader` and friends exist so that the outside world sees a method, not a variable. That means a reader can be
replaced later by a computed value without breaking a caller. Two versions of the same file, both called as
`report.loan_count`:

```ruby
def loan_count
  @loans.size
end
```

```ruby
def loan_count
  @cache.fetch(:loan_count) { @loans.size }
end
```

Both are `report.loan_count` from outside. That freedom is the reason to write `attr_reader` rather than reaching into
`@loans` from another object, which Ruby will let you do with `instance_variable_get` and which is a decision you
should have to justify in a review.

## Check yourself

Write a `Shelf` class that takes a list of titles, has a `count` reader, and a `add(title)` method that refuses a
duplicate. Then check `Shelf.instance_methods(false)` and confirm the list shows exactly the methods you defined and
no more.
