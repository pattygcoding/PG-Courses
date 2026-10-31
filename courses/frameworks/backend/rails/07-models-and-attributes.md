---
title: Models and attribute types
summary: A class per table, types that come from the schema, and the defaults and casts you can declare yourself.
chapter: Models and the database
minutes: 13
status: draft
---

## The class and the table

```ruby
class Book < ApplicationRecord
  has_many :loans, dependent: :destroy
end
```

`ApplicationRecord` inherits from `ActiveRecord::Base`, and it exists so that the application has one place to put
behaviour shared by every model:

```ruby
class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class
end
```

`primary_abstract_class` says the class has no table of its own. Without it, Rails would look for an
`application_records` table and raise on the first query.

The mapping is by name: `Book` reads and writes the `books` table, and the columns become methods:

```ruby
book = Book.find(1)
book.title          # a String, because the column is a string
book.copies         # an Integer
book.created_at     # an ActiveSupport::TimeWithZone
book.returned_on    # nil, because the column is null for this row
```

## Types come from the schema

Active Record reads `db/schema.rb` at boot and writes an attribute for each column with the right cast. That is why the
model has no field declarations: the database is the schema, and the model is the behaviour.

| Column type | Ruby type |
| --- | --- |
| `string`, `text` | `String` (frozen, in newer Rails) |
| `integer`, `bigint` | `Integer` |
| `decimal` | `BigDecimal` |
| `float` | `Float` |
| `boolean` | `true` or `false` |
| `date` | `Date` |
| `datetime` | `ActiveSupport::TimeWithZone` |
| `json` | `Hash` with string keys |

The casts are worth knowing because they explain the surprises. A `decimal` column arrives as a `BigDecimal`, so
`price * 2` is exact and `price.to_f` is where the precision goes. A `datetime` arrives in the application's time
zone, which is `UTC` by default and configured in `config/application.rb`.

## Declaring attributes by hand

A model needs an attribute the table does not have, and `attribute` is how it is declared:

```ruby
class Loan < ApplicationRecord
  # A loan with no day of its own was taken out today.
  attribute :borrowed_on, :date, default: -> { Date.current }
  attribute :days, :integer, default: 14
end
```

The default is a lambda, and that matters: a lambda runs per instance, while a plain value would be evaluated once at
class load time. `default: Date.current` would freeze today's date into every loan created afterwards, which is the
kind of bug that looks fine in a test run and fails a month later.

`attribute` also casts on assignment:

```ruby
loan = Loan.new(days: "7")
loan.days.class    # Integer
```

The cast is why a value from a form, which is always a string, arrives as the type the model declared. `attribute
:days, :integer` above is what makes `params` handling in the controller simpler.

## Custom types

The set of types includes the ones you would expect, and a custom one is a small class:

```ruby
class MoneyType < ActiveRecord::Type::Decimal
  def cast(value)
    return value if value.is_a?(Money)
    Money.new(super || 0)
  end

  def serialize(value)
    value.respond_to?(:amount) ? value.amount : super
  end
end

attribute :price, MoneyType.new
```

This is the level of metaprogramming that pays off in a larger application and is unnecessary in a small one. The
honest guidance: two or three `attribute` declarations with defaults are normal, and a custom type class is worth it
when the same conversion appears in four models.

## Reading and writing

```ruby
book = Book.new(title: "Dune", author: "Frank Herbert", genre: "science-fiction", copies: 3)
book.new_record?     # true
book.save            # INSERT
book.persisted?      # true
book.copies = 2
book.save            # UPDATE, and it only writes the columns that changed
book.update(copies: 1, genre: "poetry")   # assign and save
book.destroy         # DELETE
```

`update` is `assign_attributes` plus `save`, and it returns false when a validation fails rather than raising.
`update!` raises, which is what a script wants and what a controller usually does not.

The object keeps track of which attributes changed:

```ruby
book.title = "Dune Messiah"
book.changed?                # true
book.changed                # ["title"]
book.changes                # {"title" => ["Dune", "Dune Messiah"]}
book.title_was              # "Dune"
```

Those methods are how a callback can act on what changed rather than on what is there, and they are the reason an
`after_update` hook can send a notification only when the field it cares about moved.

## Finding records

```ruby
Book.all
Book.find(1)                  # raises RecordNotFound when there is no row 1
Book.find_by(title: "Dune")   # nil when there is none
Book.find_by!(title: "Dune")  # raises when there is none
Book.where(genre: "poetry")
Book.order(:title)
Book.count
Book.exists?(1)
Book.first
Book.first(3)
Book.pluck(:title)
Book.find_each { |book| puts book.title }   # batched, for a large table
```

The pair to keep straight is `find` and `find_by`: one takes an id and raises, the other takes conditions and returns
nil. A controller that wants a 404 uses `find`; a lookup that is allowed to find nothing uses `find_by`.

`pluck` is the one that saves time in a report: it reads the columns named and skips building objects, which for ten
thousand rows is the difference between a fast query and a slow one.

## Check yourself

Open a model in the console with `rails console`, and use `Book.column_names`, `Book.columns_hash["copies"].type` and
`Book.new.attributes` to see what Active Record made from the schema. Then set a value with the wrong type and check
what the cast did to it.
