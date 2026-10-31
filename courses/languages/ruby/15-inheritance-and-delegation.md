---
title: Inheritance and delegation
summary: One superclass, super in its three forms, and the reason a wrapper often beats a subclass.
chapter: Classes and modules
minutes: 13
status: draft
---

## A subclass

```ruby
class Book
  def initialize(title)
    @title = title
  end

  def to_s
    "Book: #{@title}"
  end
end

class Magazine < Book
  def initialize(title, issue)
    super(title)
    @issue = issue
  end

  def to_s
    "#{super} ##{@issue}"
  end
end
```

```text
Book: Wired
Book: Wired #42
true
false
```

The magazine prints as a book with an issue number on the end, because `super` in `to_s` called the parent's version
first. Changing the label would mean overriding `to_s` entirely rather than building on it.

Three forms of `super` and they are not interchangeable:

| Form | Sends |
| --- | --- |
| `super(title)` | exactly those arguments |
| `super` | the same arguments this method was called with |
| `super()` | no arguments |

Bare `super` is the version that surprises people. Inside `initialize(title, issue)`, a bare `super` would send both
arguments to `Book#initialize`, which takes one, and raise `ArgumentError`. The project's `Data`-based classes use it
on purpose:

```ruby
def initialize(book_id:, member:, days: 14, borrowed_on: Date.today)
  super
end
```

Here the keyword arguments are exactly what `Data##initialize` wants, so forwarding all of them is right.

## Is a, responds to

```ruby
magazine.is_a?(Magazine)   # true
magazine.is_a?(Book)       # true, this is the inheritance question
magazine.instance_of?(Book) # false
magazine.respond_to?(:to_s) # true
```

`is_a?` asks whether the object is anywhere in the ancestor chain and `instance_of?` asks about the class itself.
When you find yourself writing `is_a?`, `respond_to?` is usually the question you meant, because it asks whether the
object can do the job rather than what it is. That is duck typing, and the language has no interface keyword because
this check is the interface.

## An error hierarchy

The course's project inherits twice, and both times from `StandardError`:

```ruby
module Northside
  class MissingBook < StandardError
    attr_reader :id

    def initialize(id)
      @id = id
      super("No book with id #{id.inspect} is in the catalogue")
    end
  end

  class NotAvailable < StandardError
    attr_reader :book

    def initialize(book)
      @book = book
      super("#{book.title} has no copies left")
    end
  end
end
```

Two things are worth copying from that shape. Each error carries the value that caused it, so a caller can react
without parsing the message. And each builds its own message in `initialize` while calling `super` with a string, so
`error.message` is a sentence and `raise MissingBook, "dune"` still works.

A base error class for a library is the next step when there are more than a handful:

```ruby
module Northside
  class Error < StandardError; end
  class MissingBook < Error; end
  class NotAvailable < Error; end
end
```

Now `rescue Northside::Error` catches everything the library raises and nothing else. That is the difference between
a good error hierarchy and a pile of classes.

## A base class with a hole in it

```ruby
class Reader
  def each_row
    raise NotImplementedError, "#{self.class} has to implement each_row"
  end

  def titles
    rows = []
    each_row { |row| rows << row["title"] }
    rows
  end
end

class CSVReader < Reader
  def each_row(&block)
    CSV.foreach(@path, headers: true, &block)
  end
end
```

`Reader` defines the shape of the work and leaves one step for the subclass. `NotImplementedError` names the class
that forgot, which is much better than a `NoMethodError` three frames away.

The catch is that Ruby cannot enforce the contract. Any subclass that does not define `each_row` fails at runtime,
and the only defence is a test:

```ruby
test "every reader answers each_row" do
  [ CSVReader, JSONReader ].each do |klass|
    assert klass.method_defined?(:each_row), "#{klass} must implement each_row"
  end
end
```

## Delegation, which is usually the better answer

Inheritance means "is a kind of" and it is the strongest coupling in the language: a subclass sees every method of the
parent and breaks when the parent changes. When the relationship is "has a" or "wraps", delegation says what you mean:

```ruby
require "forwardable"

class Shelf
  extend Forwardable

  def_delegators :@books, :size, :map, :each

  def initialize(books = [])
    @books = books
  end
end
```

```irb
>> shelf = Shelf.new([1, 2, 3])
>> shelf.size
=> 3
>> shelf.map { |n| n * 2 }
=> [2, 4, 6]
```

`Forwardable` is in the standard library, `def_delegators` names the methods to forward, and the class exposes
exactly the three it chose rather than everything an array can do. Compare that with `< Array`, where `shelf.sort!`,
`shelf.delete` and `shelf.shuffle` all leak out and each one becomes a compatibility promise.

The rule I use: subclass when the parent is genuinely the same thing with more detail, and delegate when the parent
is a thing this object holds.

## Check yourself

Write `Audio < Item` and `Ebook < Item` where `Item` holds a title and a lend count, and make both override a
`format` method that `Item#to_s` calls. Then rewrite `Ebook` to hold an `Item` and delegate instead, and list what
changed for a caller.
