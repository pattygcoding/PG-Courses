---
title: Associations
summary: belongs_to, has_many, a join table, and the query counts a real page costs.
chapter: Models and the database
minutes: 15
status: draft
---

## Both sides of a relationship

```ruby
class Book < ApplicationRecord
  has_many :loans, dependent: :destroy
  has_many :waiting_entries, dependent: :destroy
  has_many :members, through: :loans
end

class Loan < ApplicationRecord
  belongs_to :book
  belongs_to :member
end

class Member < ApplicationRecord
  has_many :loans, dependent: :destroy
  has_many :books, through: :loans
end
```

`belongs_to :book` means the `loans` table has a `book_id` column. `has_many :loans` is the other direction, and it is
a query rather than a column. Both sides are declared, because Rails does not require them to be symmetric and a
reader does.

`has_many :members, through: :loans` is how a book answers "who has it": the join table is `loans`, so the association
walks it. `Member` has the same thing the other way round.

`dependent:` decides what happens when the owner is deleted:

| Option | Effect |
| --- | --- |
| `:destroy` | runs callbacks on each child, then deletes them |
| `:delete_all` | one `DELETE` statement, no callbacks |
| `:nullify` | sets the foreign key to null |
| `:restrict_with_error` | refuses to delete the parent |
| nothing | leaves children pointing at a row that is gone |

This application uses `:destroy`, which suits a project whose data is seeded. A real catalogue wants
`:restrict_with_error` on `Book`, because a book with loans against it should not be able to vanish.

## Building and using associations

```ruby
book = Book.find(1)

book.loans                  # every loan for this book, as a relation
book.loans.outstanding      # a scope chained onto the association
book.loans.build(member: member, days: 7)
book.loans.create!(member: member, days: 7)
book.loans.count            # COUNT(*) in SQL

loan.book                   # loaded on first use
loan.member.name            # loaded on first use
```

`build` makes a child with the foreign key already set, which is why the controller never assigns `book_id` by hand:

```ruby
@loan = @book.loans.build(member: member_for(loan_params), days: loan_params[:days])
```

That line says the loan belongs to this book, and saving it writes the `book_id`. Letting a form choose which book it
writes against is the mass assignment problem in a different coat.

## The query count on a real page

The log shows every query with the line of code that ran it, and the total at the end of the request is the number to
watch. For the desk page of this application, with `includes` in place, the real list is:

```text
SELECT "sessions".* FROM "sessions" WHERE "sessions"."id" = ? LIMIT ?
SELECT "loans".* FROM "loans" WHERE "loans"."returned_on" IS NULL ORDER BY "loans"."due_on" ASC
SELECT "books".* FROM "books" WHERE "books"."id" = ?
SELECT "members".* FROM "members" WHERE "members"."id" IN (?, ?)
SELECT "loans".* FROM "loans" WHERE "loans"."returned_on" IS NULL AND "loans"."due_on" < ?
SELECT "members".* FROM "members" WHERE "members"."id" = ?
SELECT "users".* FROM "users" WHERE "users"."id" = ? LIMIT ?
```

Seven queries: the session, one list of loans for each table on the page, a books and a members load for the
associations those loans touch, and the signed in user.

Without `includes`, each `loan.book.title` and `loan.member.name` in the view is a query of its own. That is an N+1:
one query for the list plus one per row for every association the view reads.

| Method | Does |
| --- | --- |
| `includes` | one query per association, chosen by Rails |
| `preload` | the same, always as a separate query |
| `eager_load` | a `LEFT JOIN` in one query, needed when the association is filtered on |
| `joins` | a join for filtering, with the associated objects not loaded |

`joins` is for the query and `includes` is for the objects. A view calling `loan.member.name` needs `includes`; a
controller filtering by a member's name needs `joins` or `eager_load`.


## Two queries a view adds by asking

The first version of the desk action left the relations unloaded:

```ruby
@outstanding = Loan.outstanding.includes(:book, :member)
@overdue = Loan.overdue.includes(:book, :member)
```

The view then asked three questions of each relation: how many there are, whether there are any, and what they are.

```text
SELECT COUNT(*) FROM "loans" WHERE "loans"."returned_on" IS NULL
SELECT COUNT(*) FROM "loans" WHERE "loans"."returned_on" IS NULL AND "loans"."due_on" < ?
SELECT 1 AS one FROM "loans" WHERE "loans"."returned_on" IS NULL AND "loans"."due_on" < ? LIMIT ?
```

`pluralize(@outstanding.size, "loan")` counts the rows in SQL and `@overdue.any?` asks whether any exist, both before
the loop asks for the records themselves. The page cost eleven queries, four of them questions nobody needed to ask.

```ruby
def index
  # Loaded once, because the view asks how many there are, whether there are
  # any, and then reads them. On a relation those three questions are three
  # queries: COUNT, EXISTS and the SELECT. As arrays they are free.
  @outstanding = Loan.outstanding.includes(:book, :member).to_a
  @overdue = Loan.overdue.includes(:book, :member).to_a
end
```

Eleven queries became seven, measured on the same page and the same data. The lesson is not "always call `to_a`"; it
is that a relation is lazy, and a view that interrogates one gets a query per question.

## Counting queries in a test

Rails 8 has an assertion for this:

```ruby
test "the desk reads the loans with a query of their own" do
  sign_in_as users(:librarian)

  assert_queries_count { get loans_url }
end
```

`assert_queries_count(3) { ... }` asserts an exact number, and `assert_queries_count { ... }` asserts at least one. For
a page whose count moves with the data, a ceiling says what you mean:

```ruby
test "the desk loads its loans without a query per loan" do
  sign_in_as users(:librarian)

  Loan.create!(book: books(:edda), member: members(:grace), days: 7)
  Loan.create!(book: books(:edda), member: members(:ada), days: 7)

  count = count_queries { get loans_url }

  assert_operator count, :<=, 10, "the desk page ran #{count} queries for #{Loan.count} loans"
end
```

`count_queries` is six lines built on the same notifications an APM gem subscribes to:

```ruby
private
  def count_queries(&block)
    count = 0
    counter = ->(_name, _start, _finish, _id, payload) { count += 1 unless payload[:cached] }
    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &block)
    count
  end
```

`payload[:cached]` is skipped, because a cache hit is not work the database did. The value of a test like this is that
an N+1 costs nothing visible on four rows of seed data and everything on four thousand rows of production data, and
the query count is the only thing that notices.

## Optional associations, and one that is not a class

```ruby
class Loan < ApplicationRecord
  belongs_to :returned_by, class_name: "Member", optional: true
end
```

`belongs_to` is required by default, so `optional: true` is needed here. The class name is inferred from the
association's name, which is why it is written out when the name does not match one.

## Check yourself

Add a `Member#waiting_entries` association through `books`, then load the book page so that its waiting list and its
loans take a fixed number of queries. Write a test with a ceiling, and check the count with `includes` commented out.
