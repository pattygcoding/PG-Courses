---
title: Data and Struct
summary: Immutable value objects with keyword arguments, and the bug that shows why the day a loan started has to be stored.
chapter: Classes and modules
minutes: 15
status: draft
---

## A value object in one line

```irb
>> Book = Data.define(:id, :title, :copies)
=> Book
>> book = Book.new(id: "dune", title: "Dune", copies: 3)
=> #<data Book id="dune", title="Dune", copies=3>
>> book.id
=> "dune"
>> book.frozen?
=> true
>> book.copies = 5
(irb):6:in '<main>': undefined method 'copies=' for an instance of Book (NoMethodError)
```

`Data.define` writes the class for you. You get readers for each member, keyword arguments in `initialize`, a
`to_h`, an `inspect` that names the class and every field, value equality, and a frozen object.

The frozen part is the point. A `Book` cannot change, so a method that takes one can rely on it:

```ruby
def report(book)
  puts book.title       # the same title for the whole method
  book.lend!            # NoMethodError, and the alternative is worse
end
```

Compare that with a class holding `@copies` and an `attr_accessor`, where the same method has to be read to the end
to know whether the book changed.

## A change makes a new one

```irb
>> book.with(copies: 2)
=> #<data Book id="dune", title="Dune", copies=2>
>> book
=> #<data Book id="dune", title="Dune", copies=3>
```

`with` returns a copy with a field replaced and leaves the original alone. That is how a value object changes:
a new value comes back and the caller decides what to do with it.

```ruby
def lending(id)
  book = fetch(id)
  raise NotAvailable, book unless book.available?

  updated = book.with(copies: book.copies - 1)
  Catalogue.new(map { |entry| entry.id == id ? updated : entry })
end
```

The updated book goes into a new catalogue and the old one still holds the book with its original copy count. The
test that proves it is two assertions:

```ruby
test "lending returns a new catalogue" do
  lent = catalogue.lending("dune")

  assert_equal 3, catalogue.fetch("dune").copies
  assert_equal 2, lent.fetch("dune").copies
end
```

## Equality comes with it

```irb
>> book == Book.new(id: "dune", title: "Dune", copies: 3)
=> true
>> book.to_h
=> {id: "dune", title: "Dune", copies: 3}
>> book.deconstruct_keys(nil)
=> {id: "dune", title: "Dune", copies: 3}
```

Two books with the same fields are equal, and their `hash` values match, so a `Data` works as a hash key. That is
different from a plain class, where `==` on two objects with identical contents is false because they are different
objects. `Book` in this project relies on it: the catalogue test round-trips a book through a hash and asserts
equality.

`deconstruct_keys` and `deconstruct` are the pattern-matching hooks, and `Data` defines both, which is why a `Data`
object can be matched in a `case` with no extra code.

## The bug this shape found

A `Loan` in this project was a `Data` with a book, a member, a day count and a borrowed-on date, and the first version
of it left the date out:

```ruby
Loan = Data.define(:book_id, :member, :days) do
  def due_on(today = Date.today)
    today + days
  end

  def overdue?(today = Date.today)
    due_on(today) < today
  end
end
```

A test said a loan borrowed on the first of the month and due seven days later was not overdue at the end of it:

```text
LoanTest#test_an_overdue_loan [test/loan_test.rb:29]:
Expected false to be truthy.
```

The method was wrong, and so was the model. A loan that does not know when it started cannot answer whether it is
overdue; `due_on(today)` computed a due date from whatever day it was asked about. The fix was a field:

```ruby
Loan = Data.define(:book_id, :member, :days, :borrowed_on) do
  include Comparable

  def initialize(book_id:, member:, days: 14, borrowed_on: Date.today)
    super
  end

  def due_on
    borrowed_on + days
  end

  def overdue?(today = Date.today)
    due_on < today
  end
end
```

Adding a field to a `Data` is a one-line change in the definition and a one-line change wherever it is constructed,
which is a large part of why the shape is worth using. A class with `attr_accessor` for each field would have leaked
the same bug into whatever code had already started treating a loan as something with a due date.

The real `Loan` also overrides `to_h` and adds `from_h`:

```ruby
def to_h
  { "book_id" => book_id, "member" => member, "days" => days, "borrowed_on" => borrowed_on.iso8601 }
end
```

A `Data` will write that hash for you, with symbol keys and a `Date` left as a `Date`. The loan rows go into a CSV
file, which has string keys and text, so the class says so itself. `from_h` is the other half, and it does the work
the file format forces on it:

```ruby
def self.from_h(hash)
  new(
    book_id: hash.fetch("book_id"),
    member: hash.fetch("member"),
    days: Integer(hash.fetch("days", 14)),
    borrowed_on: parse_date(hash["borrowed_on"])
  )
end
```

`Integer(...)` turns the string a CSV file gives you into a number, and `parse_date` turns an ISO date string into a
`Date`. Both are the boundary being explicit about what it accepts, which is the subject of the files chapter.

## Struct is the older, mutable version

```irb
>> Point = Struct.new(:x, :y)
=> Point
>> point = Point.new(1, 2)
=> #<struct Point x=1, y=2>
>> point.x = 3
=> 3
>> point
=> #<struct Point x=3, y=2>
>> point.frozen?
=> false
>> point.to_a
=> [3, 2]
>> point.to_h
=> {x: 3, y: 2}
>> Point.new(1, 2) == Point.new(1, 2)
=> true
```

`Struct` gives value equality and an `inspect`, and leaves the fields writable. It also takes positional arguments,
while `Data` takes keywords by default and positional arguments if you ask, which is why `Book.new("dune", "Dune", 3)`
also works:

```irb
>> Book.new("dune", "Dune", 3)
=> #<data Book id="dune", title="Dune", copies=3>
```

The choice is about mutability rather than age. Reach for `Data` when the value should not change, and `Struct` when
you want a small record with settable fields and do not want to write the class. A `Data` with a dozen members is a
sign that the thing has parts and wants splitting.

## Check yourself

Write a `Loan`-style `Data` for a book request with a requester and a requested date, add a `waiting_days(today)`
method, and check that two requests with the same fields are equal and usable as hash keys. Then convert it to a
`Struct` and list every line of the project that would have to change.
