---
title: Routing in depth
summary: resources, nesting, singular resources, and the helper names that come out of them.
chapter: Controllers and views
minutes: 14
status: draft
---

## The file

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

Routes match in the order they are written, and the first match wins. That is why the two routes the authentication
generator inserted sit above everything the application had already written: a later route can never shadow an earlier
one.

## What resources writes

```ruby
resources :books
```

| Verb | Path | Action | Helper |
| --- | --- | --- | --- |
| GET | `/books` | `index` | `books_path` |
| GET | `/books/new` | `new` | `new_book_path` |
| POST | `/books` | `create` | `books_path` |
| GET | `/books/:id` | `show` | `book_path(id)` |
| GET | `/books/:id/edit` | `edit` | `edit_book_path(id)` |
| PATCH, PUT | `/books/:id` | `update` | `book_path(id)` |
| DELETE | `/books/:id` | `destroy` | `book_path(id)` |

```bash
bundle exec rails routes -g books
```

```text
books     GET    /books(.:format)           books#index
          POST   /books(.:format)           books#create
new_book  GET    /books/new(.:format)       books#new
edit_book GET    /books/:id/edit(.:format)  books#edit
book      GET    /books/:id(.:format)       books#show
          PATCH  /books/:id(.:format)       books#update
          DELETE /books/:id(.:format)       books#destroy
```

`-g` filters by name, which is how you find the helper you half-remember. The `(.:format)` suffix is what makes
`/books.json` work: the format is optional, and the controller can respond to it.

`only:` and `except:` trim the list, and this application uses `only:` everywhere. Two actions instead of seven, and a
route that does not exist answers 404 rather than reaching an action nobody wrote.

## Singular resources

```ruby
resource :session
```

```text
new_session GET    /session/new(.:format)  sessions#new
session     GET    /session(.:format)      sessions#show
            PATCH  /session(.:format)      sessions#update
            DELETE /session(.:format)      sessions#destroy
            POST   /session(.:format)      sessions#create
```

No id in the path, because there is one session per browser and the cookie says which. The helper is `session_path`,
and the controller is still `SessionsController`, because the class name comes from what was generated rather than
from the route. A singular resource with `only: %i[new create destroy]` is the shape of a sign-in flow.

## Nesting, and when to stop

```ruby
resources :books do
  resources :waiting_entries, only: :create
end
```

```text
book_waiting_entries POST /books/:book_id/waiting_entries(.:format) waiting_entries#create
```

The parent's id is in the path, and the controller reads both:

```ruby
def create
  book = Book.find(params[:book_id])
  entry = book.waiting_entries.new(waiting_entry_params)
end
```

`params[:book_id]` is the parent and `params[:id]` would be the child. The route says a waiting entry has no meaning
outside a book, and it says the same thing to anyone reading a log line.

Three levels of nesting produces helpers like `library_shelf_book_path`, and that is where `shallow: true` earns its
place: it keeps the parent in the collection routes and drops it from the member routes.

## Member and collection routes

```ruby
resources :books, only: :show do
  member do
    post :reserve
  end

  collection do
    get :search
  end
end
```

```text
reserve_book POST /books/:id/reserve(.:format) books#reserve
search_books GET  /books/search(.:format)      books#search
```

`member` has the id, `collection` does not. Both are for an action that is about a resource without being one of the
seven, and both are worth a second look: a resource with four custom actions usually wants to be two resources.

## Constraints, defaults and redirects

```ruby
constraints(id: /\d+/) do
  resources :books, only: :show
end

resources :books, defaults: { format: :json }

get "/catalogue", to: redirect("/books", status: 301)
```

A constraint stops a route matching anything else, so `/books/dune` answers 404 rather than asking the database for a
record it cannot have. `defaults:` sets something for every request the route matches, which is how an API resource is
written once. A `redirect` in the routes file is how an old URL keeps working after a rename, and it costs nothing
beyond the match.

## Namespaces

```ruby
namespace :admin do
  resources :books
end
```

```text
admin_books GET /admin/books(.:format) admin/books#index
```

`namespace` changes both the path and the controller: `Admin::BooksController` in
`app/controllers/admin/books_controller.rb`. `scope` changes only the path and `module:` only the controller, which are
the two options for when the URL and the code should not be nested the same way.

## Check yourself

Add routes for `members` with `index` and `show`, plus a nested `loans` collection, then run `rails routes` and write
out the helper for each route it produced. Then decide which of them would be better as a scope on `loans`.
