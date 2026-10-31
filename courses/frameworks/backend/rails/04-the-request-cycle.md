---
title: The request cycle
summary: From a URL to a rendered page, and the log lines that show each step.
chapter: Getting started
minutes: 14
status: draft
---

## Five steps

```text
GET /books/3
  routes         matches to books#show with id 3
  controller     BooksController#show runs
  model          Book.find("3") reads the database
  view           app/views/books/show.html.erb renders
  response       HTML with a status code
```

Every request in every Rails application walks that path. A JSON API stops after the model and renders a hash. A Turbo
Stream replaces the view step with a fragment. A redirect replaces the view step with a 302. The shape holds.

## The log tells you all of it

```text
Started GET "/books/3" for 127.0.0.1 at 2026-10-31 10:09:15 -0400
Processing by BooksController#show as HTML
  Parameters: {"id" => "3"}
  Book Load (0.2ms)  SELECT "books".* FROM "books" WHERE "books"."id" = ? LIMIT ?
  ↳ app/controllers/books_controller.rb:12:in 'show'
  Loan Load (0.3ms)  SELECT "loans".* FROM "loans" WHERE "loans"."book_id" = ?
Rendered books/_waiting_list.html.erb (Duration: 2.5ms)
Rendered books/show.html.erb within layouts/application (Duration: 5.2ms)
Rendered layout layouts/application.html.erb (Duration: 6.9ms)
Completed 200 OK in 13ms (Views: 6.9ms | ActiveRecord: 0.4ms (6 queries, 0 cached))
```

Five sections, in order:

- The request line: method, path, and the format Rails decided on.
- `Processing by`: controller, action, and the requested format.
- `Parameters`: everything in the query string and the form body.
- SQL lines, each printed under the line of code that ran it, which is how an N+1 is spotted by eye.
- `Rendered ...` for every template, the layout last, then the status and the time split between views, Active Record
  and the number of queries.

A `TURBO_STREAM` format in the second line means the request came from a Turbo Frame or a Turbo Stream submission:

```text
Processing by BooksController#index as TURBO_STREAM
Rendered collection of books/_book.html.erb [4 times] (Duration: 4.8ms | GC: 0.0ms)
Rendered books/_list.html.erb (Duration: 7.6ms)
Rendered books/index.html.erb within layouts/application (Duration: 8.6ms)
Completed 200 OK in 17ms (Views: 11.8ms | ActiveRecord: 0.6ms (11 queries, 1 cached) | GC: 0.0ms)
```

That `Rendered collection ... [4 times]` is the partial collection the views chapter writes, and the `TURBO_STREAM`
format is what the Hotwire chapter is about.

## Routes

```ruby
Rails.application.routes.draw do
  resource :session
  resources :passwords, param: :token

  # The catalogue is public; the desk is not.
  resources :books, only: %i[index show] do
    resources :waiting_entries, only: :create
  end

  resources :loans, only: %i[index create]

  get "up" => "rails/health#show", as: :rails_health_check

  root "books#index"
end
```

```bash
bundle exec rails routes
```

```text
new_session  GET    /session/new(.:format)                        sessions#new
session      GET    /session(.:format)                            sessions#show
             DELETE /session(.:format)                            sessions#destroy
             POST   /session(.:format)                            sessions#create
book_waiting_entries POST /books/:book_id/waiting_entries(.:format) waiting_entries#create
books        GET    /books(.:format)                              books#index
book         GET    /books/:id(.:format)                          books#show
loans        GET    /loans(.:format)                              loans#index
             POST   /loans(.:format)                              loans#create
root         GET    /                                              books#index
```

`resources :books` writes seven routes and a helper for each; `only: %i[index show]` writes two. `resource` without the
`s` is a singular resource, with no id in the path because there is one session per browser.

The first column is the helper name, which is how a view builds a URL:

```erb
<%= link_to "Catalogue", books_path %>
<%= link_to book.title, book_path(book) %>
<%= link_to book.title, book %>
```

The third form is the same call: pass the record and Rails derives the helper and the id from it. Renaming a route
then updates every call site, which is the reason not to write the path as a string.


## The pieces of a request

| Object | Holds |
| --- | --- |
| `request` | method, path, headers, format, remote IP |
| `params` | query string, form body and path segments, merged |
| `session` | data kept between requests, signed into a cookie |
| `cookies` | the same, without the session's protection |
| `response` | status and headers, set by the action |

`params` is the one that matters immediately. All three sources arrive in one hash-like object, which is convenient and
is exactly why strong parameters exist: if everything a client sends lands in one place, everything a client sends has
to be filtered before it is used.

## Where the response format comes from

```text
/books                             -> HTML
/books.json                        -> JSON
/books?query=dune                  -> HTML, with query in params
Accept: text/vnd.turbo-stream.html -> a Turbo Stream
```

Rails takes the format from the extension first and the `Accept` header second. The controller decides what to do with
it:

```ruby
respond_to do |format|
  format.turbo_stream
  format.html { redirect_to book, notice: "Added to the waiting list." }
end
```

That is a real action from this application. One URL answers a Turbo-enabled browser with a fragment and everything
else with a redirect, and neither caller had to know about the other.

## Development reloads your code

The `Reloader` middleware means a change to a model or a controller is picked up on the next request. Three kinds of
change need a restart: an initializer, a gem, and anything in `config/`. Those run at boot, and boot has happened.

Reloading is also why an instance variable cannot hold state between requests in development, and why a class variable
is a trap: reloading removes the class and the variable with it. State that has to outlive a request goes in the
session, the database, or a cache.

## Status codes you will use

| Code | Means | In Rails |
| --- | --- | --- |
| 200 | here is the page | `render` |
| 302 | look elsewhere, with a GET | `redirect_to` |
| 303 | look elsewhere, after a POST | `redirect_to` on a non-GET |
| 304 | nothing changed, use your copy | `stale?` and ETags |
| 404 | no such record | `ActiveRecord::RecordNotFound` |
| 422 | the data was wrong | `render` with `status: :unprocessable_entity` |
| 500 | the code broke | an unhandled exception |

The 422 is the one to remember from this page, because the forms chapter uses it. A form that re-renders with its
errors answers 422 rather than 200, so a test or a tool can tell the difference between "here is the page" and "here
is the page again, with what you did wrong on it".

## Check yourself

Open a page with the log visible and name each of the five steps as you find it in that request. Then add
`resources :members, only: %i[index show]` to `config/routes.rb`, run `rails routes`, and predict the helper names
before writing any controller.
