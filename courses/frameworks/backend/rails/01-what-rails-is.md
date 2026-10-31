---
title: What Rails is
summary: A folder layout, a set of naming rules, and the request cycle that ties them together.
chapter: Getting started
minutes: 14
status: draft
---

## The idea

Rails is a web framework that decides most questions for you. You name a file and the framework knows what it is for:

| File | Rails sees |
| --- | --- |
| `app/models/book.rb` | a class `Book` that reads and writes the `books` table |
| `app/controllers/books_controller.rb` | the actions for URLs under `/books` |
| `app/views/books/index.html.erb` | what the `index` action renders |
| `test/models/book_test.rb` | the tests for `Book` |
| `config/routes.rb` | which URL goes to which action |

None of that is registered anywhere. The file name, the class name and the table name are derived from each other by
convention, and the value of the convention is that a reader who knows it can open a project they have never seen and
find the code.

The other half is a request cycle that is the same for every page:

```text
browser -> routes -> controller action -> model and database -> view -> HTML
```

Every lesson in this course adds to one of those five steps or explains something Rails does around them: caching,
background jobs, authentication, assets, tests and deployment.

## The Ruby underneath

Rails is a set of gems, and each one owns a piece:

| Gem | Owns |
| --- | --- |
| Active Record | models, migrations, queries, validations |
| Action Pack | routing, controllers, requests and responses |
| Action View | templates, helpers, forms |
| Active Job, Action Mailer, Action Cable | background work, mail, websockets |
| Active Support | the extensions to Ruby that everything else leans on |
| Railties | the application object, generators and configuration |
| Rails | all of the above, versioned together |

Active Support is the one to know about early, because it adds methods to Ruby classes: `3.days.ago`, `"dune".titleize`,
`Date.current`, `Array#sum` on objects that answer `+`. Those methods exist in Rails and not in plain Ruby, which is the
line between the two courses in this catalogue. The Ruby course covers the language; this one assumes it and uses the
extensions freely.

## What Rails 8 ships with

Rails 8 is a whole stack rather than a framework plus a reading list:

| Need | What is in the box now |
| --- | --- |
| assets | Propshaft, served as they are with no build step |
| JavaScript | importmaps plus Turbo and Stimulus, no Node required |
| background jobs | Solid Queue, backed by the database |
| caching | Solid Cache, backed by the database |
| websockets | Solid Cable, backed by the database |
| authentication | a generator that writes the models, controllers and views |
| deployment | Kamal, with a Docker file and a deploy configuration |
| security scanning | Brakeman and bundler-audit, wired into a CI script |

Older Rails courses spend chapters installing Sidekiq, Redis, Devise and Sprockets. The chapters here cover what
`rails new` wrote, which is why the first thing to read is the generated application rather than a tutorial's version
of it.

## What this course builds

A library system with a public catalogue and a desk for librarians, and every chapter adds to it: models with
validations, a catalogue that filters inside a Turbo Frame, a waiting list that updates without a page reload, loans
that refuse to be recorded twice over, sign in through the generated authentication, jobs, mail, tests and the
container that ships it.

The first chapter is the application `rails new` writes. The output of every command in the pages that follow came from
running it on Rails 8.1.4 and Ruby 3.4.7, including the error messages, which are in the places where an error teaches
more than a clean run.

## Check yourself

Create an empty directory, run `rails new demo`, and list the top-level files. For each of `app`, `bin`, `config`, `db`
and `test`, write one sentence saying what belongs in it before reading the next page.
