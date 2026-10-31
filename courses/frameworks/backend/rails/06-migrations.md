---
title: Migrations
summary: One file per schema change, a schema.rb you never edit, and a column added weeks into the project.
chapter: Models and the database
minutes: 15
status: draft
---

## A migration is a file that changes the schema

```bash
bundle exec rails generate model Book title:string author:string genre:string copies:integer
```

```text
invoke  active_record
      create    db/migrate/20261031135653_create_books.rb
      create    app/models/book.rb
      invoke    test_unit
      create      test/models/book_test.rb
      create      test/fixtures/books.yml
```

Five files from one command: the migration, the model, a test and a fixture. The migration is the one that matters
here:

```ruby
class CreateBooks < ActiveRecord::Migration[8.1]
  def change
    create_table :books do |t|
      t.string :title
      t.string :author
      t.string :genre
      t.integer :copies

      t.timestamps
    end
  end
end
```

The class name comes from the file name, the timestamp prefix sets the order, and `[8.1]` records which Rails
version's migration API wrote it. That part is what keeps an old migration working after an upgrade, because Rails
runs it through the compatibility layer for the version that wrote it.

`t.timestamps` adds `created_at` and `updated_at`, which Active Record fills in on every save. A table without them
loses the answer to "when did this change".

```bash
bundle exec rails db:migrate
```

```text
== 20261031135653 CreateBooks: migrating ======================================
-- create_table(:books)
   -> 0.0033s
== 20261031135653 CreateBooks: migrated (0.0033s) =============================
== 20261031135656 CreateMembers: migrating ====================================
== 20261031135659 CreateLoans: migrating ======================================
```

Rails records which migrations have run in a `schema_migrations` table, so a second `db:migrate` does nothing. The
commands worth knowing:

| Command | Does |
| --- | --- |
| `db:migrate` | runs everything pending |
| `db:rollback` | undoes the last one, or `STEP=3` for three |
| `db:migrate:status` | lists each one as up or down |
| `db:prepare` | creates the database if needed, then migrates |
| `db:reset` | drops, creates, migrates and seeds |
| `db:seed` | runs `db/seeds.rb` |
| `db:test:prepare` | loads the schema into the test database |

`db:prepare` is the one for a fresh checkout and for CI, because it is safe to run when the database already exists.
`db:reset` throws the data away.

## Changing a column weeks later

The schema is not a design document. A loan in this application needed its own due date, and adding it was one
command:

```bash
bundle exec rails generate migration AddDueOnToLoans due_on:date
```

```ruby
class AddDueOnToLoans < ActiveRecord::Migration[8.1]
  def change
    add_column :loans, :due_on, :date
  end
end
```

```text
== 20261031135740 AddDueOnToLoans: migrating ==================================
-- add_column(:loans, :due_on, :date)
   -> 0.0031s
```

The generator works the change out from the name: `AddXToY` with a type, `RemoveXFromY`, `CreateX`, `RenameX`. For
anything else the body is yours to write:

```ruby
def change
  add_reference :loans, :returned_by, foreign_key: { to_table: :members }
  add_index :books, %i[genre title]
  change_column_null :books, :genre, false
end
```


## The column types

| Rails type | Use for |
| --- | --- |
| `string` | short text, 255 characters by convention |
| `text` | long text |
| `integer` | whole numbers; ids are `bigint` |
| `decimal` | money, written as `precision: 8, scale: 2` |
| `boolean` | flags |
| `date` | days, such as a due date |
| `datetime` | moments, such as `created_at` |
| `references` | a foreign key, with an index, `null: false`, `foreign_key: true` |
| `json` | structured data, queryable on Postgres |

Three options turn columns into rules the database enforces, and they are worth typing every time:

```ruby
t.references :book, null: false, foreign_key: true
t.string :isbn, index: { unique: true }
t.integer :copies, null: false, default: 0
```

Without `null: false`, a `book_id` can be nil and nothing stops a loan for a book that does not exist. Without
`foreign_key: true`, the database does not know the column points at another table. Without the unique index, two rows
can claim the same ISBN. A model's validations are the readable version of these rules and the database's constraints
are the enforced one, and a table wants both.

## change, up and down

```ruby
def change
  add_column :books, :shelf, :string
end
```

`change` is reversible, because Rails knows how to undo `add_column`, `create_table` and `add_index`. When it does not
know, the migration says so with two methods:

```ruby
def up
  execute "UPDATE books SET copies = 0 WHERE copies IS NULL"
  change_column_null :books, :copies, false
end

def down
  change_column_null :books, :copies, true
end
```

`execute` with raw SQL is the escape hatch, and it is also where a migration stops being reversible in any meaningful
sense. A migration that moves data is worth naming so that a reviewer notices.

## schema.rb

```ruby
ActiveRecord::Schema[8.1].define(version: 2026_10_31_135740) do
  create_table "books", force: :cascade do |t|
    t.string "title"
    t.string "author"
    t.string "genre"
    t.integer "copies"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "loans", force: :cascade do |t|
    t.integer "book_id", null: false
    t.integer "member_id", null: false
    t.date "borrowed_on"
    t.date "due_on"
    t.index ["book_id"], name: "index_loans_on_book_id"
  end
end
```

`db/schema.rb` is written from the development database every time migrations run, it is checked into the repository,
and it is never edited by hand: the way to change it is a migration. The test database is loaded from this file rather
than by replaying every migration, which is why a stale schema turns into a failing suite rather than a failing deploy.

The version at the top is the migration the schema represents, and that is what the test database is compared against:

```text
Migrations are pending. To resolve this issue, run:

        bin/rails db:migrate

You have 2 pending migrations:

db/migrate/20261031135809_create_users.rb
db/migrate/20261031135811_create_sessions.rb
```

That happened in this application: two migrations from the authentication generator were written after the test
database had been prepared. The fix is the command in the message, then `db:test:prepare` to load the new schema where
the tests look for it.

## Check yourself

Add a `shelf` column to `books`, then a second migration that makes it `null: false` with a default. Roll both back one
at a time, checking `db:migrate:status` in between, then confirm both changes appear in `db/schema.rb`.
