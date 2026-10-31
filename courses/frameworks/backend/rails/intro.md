---
title: Ruby on Rails
level: Intermediate
summary: Build a working library application from a single command, then follow it through routes, models, Turbo, tests and the container that ships it.
labels:
  - Framework
  - Backend
  - Ruby
minutes: 20
status: draft
---

## What this course is

Rails is a web framework that decides most of the questions for you. A folder called `app/models/book.rb` holds a
class called `Book` that reads and writes a table called `books`. A route declared as `resources :books` gives you
seven actions with names Rails already knows. A template called `books/show.html.erb` renders the `show` action, and
nothing had to be registered for any of it to work.

The value is not the scaffolding. It is that a Rails application has one obvious place for each thing, so a reader
who knows Rails can open a project they have never seen and find the code. This course is about the parts that the
conventions connect: the request cycle, Active Record and migrations, controllers and ERB, Hotwire for the
interactive parts, and the test suite that holds it together.

Rails 8 also ships a whole stack that older versions left to gems: Solid Queue for jobs, Solid Cache, Solid Cable,
Propshaft for assets, Thruster in front of Puma, Kamal for deployment, and a generator for authentication. Those are
not extras here. They are what `rails new` writes, and the course treats them as the default for the reason they
are the default.

The language underneath is the subject of the Ruby course. This course assumes the language and spends its time on
the framework: routes, Active Record, views, Turbo, authentication, tests and deployment.

## Who it is for

You can write Ruby or read it comfortably, and you want to build something a browser can use, or maintain a Rails
application somebody else built.

You do not need to have used a web framework before. What a request is, what a route does and how a form submits are
all covered, though the pace assumes you have used a database and written an HTML page at some point.

## What you will build

A library application with a public catalogue and a desk for librarians. The catalogue lists the books, searches
them inside a Turbo Frame, and shows a page per book with the copies on the shelf and a waiting list that updates
without a page reload. The desk records loans, refuses a loan of a book with nothing on the shelf, and lists what is
overdue.

Around that: the models and migrations behind it, validations that report what is wrong, the built-in
authentication generator for sign in, a test suite of 59 tests written as model, controller and integration tests,
and the Docker file and Kamal configuration that `rails new` generated for the purpose of shipping it.

Every command output and every error message quoted in this course came from a real run of that application on
Rails 8.1.4 and Ruby 3.4.7, including the mistakes, which are in the places where a mistake teaches more than a
finished version would.

## Prerequisites

Ruby 3.2 or later, a database, and a terminal. Rails 8.1 needs Ruby 3.2 and the course was written against Ruby
3.4.7 with SQLite, which needs no separate server.

The first lesson installs Rails and explains the two ways to do it. You need to be able to run a command and read
its output, and you should have read the Ruby course or written enough Ruby that a block, a symbol and a module are
not new words.

## How the pages are ordered

The first chapter is the application itself: what `rails new` writes, what each folder is for, and the path a
request takes through it. The second and third are the two halves that hold the most code, Active Record with its
migrations and queries, and the controller and view layer with routing, ERB, partials and forms.

The fourth chapter is Hotwire, because Turbo is how a Rails 8 application is interactive and it changes how a view
is written. The fifth is the rest of the stack that ships with Rails: jobs, mail, files, caching and cable. The
sixth is authentication, authorisation and the security defaults, and the seventh is testing.

The last chapter is operations: the console, logs, the Docker file, Kamal, and the `bin/ci` script that `rails new`
writes. The application is finished by then, and the last pages are about running it rather than writing it.

Read them in order the first time, following the contents list on this page. Each lesson ends with something to run
or work out, and the later lessons assume the application from the earlier ones exists.
