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
