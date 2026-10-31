---
title: Conventions
summary: The naming rules Rails derives everything from, and what to do when a word does not pluralise.
chapter: Getting started
minutes: 13
status: draft
---

## One name, six places

A model called `Book` implies all of this:

| Thing | Rails derives | From |
| --- | --- | --- |
| table | `books` | `Book` pluralised and underscored |
| model file | `app/models/book.rb` | the constant name |
| controller | `BooksController` in `app/controllers/books_controller.rb` | `books` |
| views | `app/views/books/` | the controller's name without `Controller` |
| route helper | `books_path`, `book_path(id)` | the resource |
| primary key | `id`, and foreign keys `book_id` | the table name, singular |

`book_id` is how Active Record finds the owner of a loan with no configuration at all:

```ruby
class Loan < ApplicationRecord
  belongs_to :book
end
```

`belongs_to :book` reads the association name, looks for a `book_id` column, and loads a `Book`. The lesson on
associations takes that apart properly; the point here is that the name did the work.

## Pluralisation

```ruby
Book       -> books
Member     -> members
WaitingEntry -> waiting_entries     # camel case becomes snake case, then plural
Copy       -> copies
Person     -> people                # irregular, Rails knows the common ones
```

The inflector is `ActiveSupport::Inflector`, and it knows the irregulars and the uncountables in English. When it
guesses wrong, `config/initializers/inflections.rb` is where you tell it:

```ruby
ActiveSupport::Inflector.inflections(:en) do |inflect|
  inflect.irregular "person", "people"
  inflect.uncountable "media"
  inflect.acronym "ISBN"
end
```

The acronym line is what turns `isbn_validator.rb` into `ISBNValidator` rather than `IsbnValidator`, and it is why a
project with a `URL`, `API` or `ID` in a class name has that initializer filled in.

A name Rails cannot pluralise sensibly is worth reconsidering. `Research` is uncountable, `Data` is plural and
singular, and a model called `News` produces `News` and `news_path`, which reads like a bug report.

## Where the model name ends and the table name begins

```ruby
class Book < ApplicationRecord
  self.table_name = "library_books"
end
```

That line exists for two cases: a legacy database whose tables were named before the application, and a model whose
class name is not what the table should be called. Renaming the table is almost always the wrong fix; the line above is
one line and it is easy to find.

The same for the primary key:

```ruby
class Book < ApplicationRecord
  self.primary_key = "isbn"
end
```

An old table with a natural key works, and the cost is that `find` and the route helpers take a string rather than an
integer.

## REST, the other convention

Rails maps HTTP verbs and paths onto seven actions, and a resource that follows it needs no documentation:

| Verb | Path | Action | Does |
| --- | --- | --- | --- |
| GET | `/books` | `index` | list |
| GET | `/books/new` | `new` | the form for a new one |
| POST | `/books` | `create` | write it |
| GET | `/books/:id` | `show` | one |
| GET | `/books/:id/edit` | `edit` | the form to change it |
| PATCH/PUT | `/books/:id` | `update` | change it |
| DELETE | `/books/:id` | `destroy` | remove it |

A controller with those seven actions and no others is a resource, and a URL that does not fit is worth a second look
before it becomes an action with a name like `process_loan`. In this application, `loans#create` is the borrowing
action and `loans#index` is the desk: two of the seven, doing what their names say.

The `only:` and `except:` options in `config/routes.rb` are how you take a subset:

```ruby
resources :books, only: %i[index show] do
  resources :waiting_entries, only: :create
end
```

Nested resources say that a waiting entry has no meaning outside a book, and the route carries the parent's id:
`/books/:book_id/waiting_entries`. Shallow nesting (`shallow: true`) drops the prefix for the member routes, which is
worth it when there are three levels; two levels are fine as they are.

## Naming things so the conventions help

| Instead of | Use | Because |
| --- | --- | --- |
| `BookManager`, `BookHelper` | `Book`, `BookSearch` | the class does something, or it is a service object with a name |
| `Library::BooksController` | `BooksController` under `module Library` | the namespace is a directory: `app/controllers/library/books_controller.rb` |
| `data`, `info`, `record` | `book`, `loan`, `member` | the variable name is documentation |
| `get_books` | `books` for a relation, `published_books` for a scope | a scope reads like a filter |

The last one is a Rails habit worth copying. A scope is written as a class method with a name that reads like a noun
phrase, so `Book.available.by_genre("poetry")` reads like a sentence and `Book.get_available_books_by_genre("poetry")`
reads like a function from another language.

## Check yourself

Write out the six things Rails derives from a model called `LibraryCard`, then check them with `rails routes` and by
naming the file you would create for it. Then decide whether `LibraryCard` is the name you want, and what you would
call the table instead if not.
