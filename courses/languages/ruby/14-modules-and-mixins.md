---
title: Modules and mixins
summary: Namespaces, Enumerable for free, and the difference between include and extend.
chapter: Classes and modules
minutes: 14
status: draft
---

## A module is a namespace

```ruby
module Northside
  VERSION = "0.1.0"

  class Catalogue
  end
end
```

`Northside::Catalogue` and `Northside::VERSION` are the names. The module holds constants and classes and does not get
instantiated, which is what makes it the right tool for keeping a library's names out of everyone else's way. A gem
that defines a top-level `Book` will collide with the next gem that does the same thing.

The nesting also gives relative lookup inside the module:

```ruby
module Northside
  class Catalogue
    def books
      Book.all      # Northside::Book, because the search starts at Northside
    end
  end
end
```

That relative lookup is convenient and it has a trap: if `Northside::Book` does not exist, Ruby looks for a top-level
`Book` instead of failing, and the error turns up somewhere unexpected. Chapter four of a library is where the
`::Book` form starts to be worth typing.

## A module as a mixin

```ruby
class Catalogue
  include Enumerable

  def each(&block)
    @books.each_value(&block)
  end
end
```

That is the whole implementation of `Enumerable` for this class. `Enumerable` is a module that defines `map`,
`select`, `find`, `sort_by`, `group_by`, `reduce`, `tally` and about fifty more methods in terms of one method
called `each`.

```ruby
catalogue.map(&:title)
catalogue.select(&:available?)
catalogue.group_by(&:genre)
catalogue.min_by { |book| book.title }
```

Twenty lines of `Enumerable` compliance bought fifty methods, and they behave exactly like they do on an array. That
is the trade: implement `each` honestly, and do not worry about the rest.

Two more methods are worth adding by hand because `Enumerable` cannot know them:

```ruby
def size
  @books.size
end
alias_method :length, :size
```

Without `size`, `Enumerable#count` walks the whole collection. With it, `catalogue.size` is a hash lookup, and
`alias_method :length, :size` gives the second name that Ruby users expect.

## include, extend, prepend

```ruby
module Loanable
  def lend
    "lent"
  end
end

class Book
  include Loanable          # instances get lend
end

class Shelf
  extend Loanable           # the class itself gets lend
end

Book.new.lend               # "lent"
Shelf.lend                  # "lent"
```

- `include` puts the module in the lookup chain after the class, so instance methods win over it.
- `extend` puts it in the singleton class, which makes the methods class methods.
- `prepend` puts it in front of the class, so the module's method runs first and can call `super` to reach the
  class's own version. It is how a wrapper is added without editing the class, and how `prepend` is used in Rails to
  inject behaviour into generated controllers.

`extend self` inside a module is the idiom for a module whose methods should be callable both as `Northside.report`
and as an instance method when mixed in.

## Where modules are better than inheritance

A class can have one superclass and any number of mixins. That settles most design questions: anything that is a
*kind of* the parent goes in the parent, and anything that is *able to do something* goes in a module.

`Comparable`, `Enumerable`, `Kernel` and `JSON` are all modules, and none of them wants to be a superclass. The
project's `Catalogue` is a `Catalogue` and it is `Enumerable`; those are two different statements and both are true.

## Namespacing modules that are not classes

A module that only holds methods is a place to put functions:

```ruby
module Northside
  module Text
    def self.slug(title)
      title.downcase.tr(" ", "-")
    end
  end
end

Northside::Text.slug("The Poetic Edda")
```

`self.slug` makes it callable on the module. This is the same shape as `Northside::Store` and `Northside::CLI` in the
project, which are classes because they hold state, and it is the shape to use when there is no state to hold.

## Check yourself

Make `Report` include `Enumerable` by defining `each` over its loans, then count how many of the `Enumerable` methods
you can call on it without writing anything else. Then write a module with one method and mix it into two classes,
using `include` in one and `extend` in the other, and check where the method is available in each case.
