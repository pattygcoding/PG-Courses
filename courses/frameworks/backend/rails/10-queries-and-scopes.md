---
title: Queries and scopes
summary: where, order, a named scope that reads like a filter, and the range that means "before today".
chapter: Models and the database
minutes: 14
status: draft
---

## A relation is a query waiting to run

```ruby
books = Book.where(genre: "poetry")
books.class        # Book::ActiveRecord_Relation
books.to_sql       # SELECT "books".* FROM "books" WHERE "books"."genre" = ?
books.to_a         # runs the query and returns an Array
```

Nothing hits the database until something needs the rows. That is why a chain of conditions is one query rather than
one query per call:

```ruby
Book.where(genre: "science-fiction").where("copies > 0").order(:title).limit(5)
```

```sql
SELECT "books".* FROM "books" WHERE "books"."genre" = ? AND (copies > 0) ORDER BY "books"."title" ASC LIMIT ?
```

Three methods, one query, and the object in the middle of the chain is a relation that remembers what to do.

| Method | Adds |
| --- | --- |
| `where` | a condition; a hash, a string with placeholders, or a range |
| `order` | an ordering, `:title` or `title: :desc` |
| `limit` / `offset` | how many rows, and where to start |
| `select` | which columns |
| `distinct` | one row per combination |
| `group` | `GROUP BY`, for aggregates |
| `includes` / `preload` / `eager_load` | loading associations up front |
| `joins` | an inner join, for filtering |

## Conditions

```ruby
Book.where(genre: "poetry")
Book.where(copies: 0)
Book.where(copies: 1..3)
Book.where.not(genre: "poetry")
Book.where(genre: [ "poetry", "non-fiction" ])
Book.where("copies > ?", 2)
Book.where("title LIKE ?", "%edda%")
```

The hash form escapes its values for you, and the string form does not: `Book.where("title = '#{params[:title]}'")` is
an injection waiting to happen, and `Book.where("title = ?", params[:title])` is the same query done safely. The rule
has no exceptions: a value from outside the program goes in as a placeholder or not at all.

A `LIKE` pattern has two characters that mean something, so a search box has to escape them:

```ruby
scope :search, ->(text) {
  next all if text.blank?

  where("title LIKE :text OR author LIKE :text", text: "%#{sanitize_sql_like(text)}%")
}
```

`sanitize_sql_like` is the method that turns a `%` typed by a user into a literal per cent sign. Without it, a search
for `%` matches everything, which is the wildcard query bug the test suite for this application pins:

```ruby
test "search treats a wildcard as a character" do
  assert_empty Book.search("%")
end
```

## Scopes

```ruby
class Book < ApplicationRecord
  scope :search, ->(text) { ... }
  scope :by_genre, ->(genre) { genre.present? ? where(genre: genre) : all }
  scope :available, -> { where("copies > 0") }
end
```

A scope is a class method with a name that reads like a filter, and that is its whole value:

```ruby
Book.search("dune").by_genre("science-fiction").available.order(:title)
```

| Method | Returns |
| --- | --- |
| `scope :name, -> { ... }` | a relation, and it can be chained |
| `def self.name; ...; end` | the same thing, with more room for logic |
| `default_scope` | applies to every query, and is worth avoiding |

`default_scope` is the one to leave alone. It hides rows from every query in the application, including the ones that
count and the ones that delete, and the bugs it produces are the kind nobody finds by reading a controller.

A scope that returns `nil` or an array breaks the chain, which is why the `by_genre` above returns `all` when it has
nothing to filter by. The `next all if text.blank?` in `search` is the same trick in a lambda that has more than one
line.

## Ranges, including the beginless one

```ruby
Loan.where(due_on: Date.new(2026, 10, 1)..Date.new(2026, 10, 31))
Loan.where(due_on: ...Date.current)
Loan.where(created_at: 7.days.ago..)
```

A range in a `where` becomes a `BETWEEN`, and two dots vs three decides whether the end is included. The beginless
range means "anything before today", which is exactly the overdue query:

```ruby
scope :overdue, -> { current.where(due_on: ...Date.current) }
```

The generated SQL is the plain comparison it looks like:

```sql
SELECT "loans".* FROM "loans" WHERE "loans"."returned_on" IS NULL AND "loans"."due_on" < ?
```

## Aggregates and cheap queries

```ruby
Book.count
Book.where(genre: "poetry").count
Book.sum(:copies)
Book.maximum(:copies)
Book.group(:genre).count           # a hash of genre to count
Book.distinct.pluck(:genre)        # one column, no objects
Book.pluck(:title, :copies)         # an array of arrays
Book.exists?(1)                    # a boolean, LIMIT 1
Book.find_each(batch_size: 100) { |book| ... }   # batched, for a large table
```

`count` on a relation is a `SELECT COUNT(*)` and `size` is the same unless the relation is already loaded. `pluck`
reads columns and skips building objects, which matters at a few thousand rows. `find_each` walks a large table in
batches rather than loading it all, and it is the method for a migration or a report over everything.

The project uses two of these where they read best:

```ruby
@genres = Book.distinct.order(:genre).pluck(:genre)
```

```ruby
def by_genre
  @catalogue.group_by(&:genre).transform_values(&:size).sort_by { |genre, count| [ -count, genre ] }
end
```

The first is a query, the second is Ruby over objects already in memory, and the choice between them is a choice about
where the work happens rather than about style.

## Check yourself

Write the queries for these questions against this application's tables: the books with nothing on the shelf, the
overdue loans for one member, the number of copies of each genre, and the five titles most often on loan. Then check
each one's SQL with `.to_sql` and decide which of them should be a scope.
