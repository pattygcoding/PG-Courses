---
title: Layouts and partials
summary: One shell per request, a partial per repeated element, and the lookup that surprised a render from another controller.
chapter: Controllers and views
minutes: 14
status: draft
---

## The layout

```erb
<!DOCTYPE html>
<html>
  <head>
    <title><%= content_for(:title) || "Northside Library" %></title>
    <%= csrf_meta_tags %>
    <%= csp_meta_tag %>

    <%= yield :head %>

    <%= stylesheet_link_tag :app, "data-turbo-track": "reload" %>
    <%= javascript_importmap_tags %>
  </head>

  <body>
    <header class="shell">
      <%= link_to "Northside Library", root_path, class: "brand" %>

      <nav>
        <%= link_to "Catalogue", root_path %>
        <%= link_to "Desk", loans_path %>
      </nav>

      <span class="session">
        <% if authenticated? %>
          <%= Current.user.email_address %>
          <%= button_to "Sign out", session_path, method: :delete %>
        <% else %>
          <%= link_to "Sign in", new_session_path %>
        <% end %>
      </span>
    </header>

    <main class="shell">
      <div id="flash">
        <%= render "shared/flash" %>
      </div>

      <%= yield %>
    </main>
  </body>
</html>
```

`yield` is where the action's template goes. Everything around it is written once: the head, the navigation, the
signed-in state and the flash. A second layout (`app/views/layouts/mailer.html.erb` is one) is chosen per controller:

```ruby
class BooksController < ApplicationController
  layout "catalogue"
end
```

`content_for :title` in a template and `content_for(:title)` in the layout is how a page adds to a slot the layout
defines. The book page sets `<% content_for :title, @book.title %>` and the browser title changes without the layout
knowing that books exist.

`yield :head` is the same idea for the whole block rather than one value, and it is where a page's own `<link>` or
`<meta>` tags go.

## Partials

| File | Rendered by |
| --- | --- |
| `books/_book.html.erb` | `render book`, or `render books` for a collection |
| `books/_list.html.erb` | `render "books/list", books: @books` |
| `books/_waiting_list.html.erb` | `render "books/waiting_list"` |
| `shared/_flash.html.erb` | `render "shared/flash"` |
| `shared/_errors.html.erb` | `render "shared/errors", records: [ @loan, @loan.member ]` |

A partial is a template without a layout, named with a leading underscore, and the convention for its local variable
comes from the file name: a partial called `_book.html.erb` expects a local called `book`.

```erb
<%= render "books/list", books: @books %>
```

Explicit locals are the readable form. A partial that reads `@books` itself works and hides a dependency, which is why
the shared partials in this application take what they need as locals:

```erb
<%# One place for the errors of every record a form touches %>
<div class="errors" role="alert">
  <h3>That could not be recorded</h3>
  <ul>
    <% records.flat_map { |record| record.errors.full_messages }.each do |message| %>
      <li><%= message %></li>
    <% end %>
  </ul>
</div>
```

## The lookup that surprised a render from another controller

Rendering `books/show` from `LoansController` looked fine until the page was requested:

```text
ActionView::Template::Error: Missing partial loans/_waiting_list, application/_waiting_list with
{locale: [:en], formats: [:html], ...}
```

Inside `app/views/books/show.html.erb`, `<%= render "waiting_list" %>` resolves against the *controller's* view path.
When `BooksController` renders it, that is `books/_waiting_list.html.erb`. When `LoansController` renders the same
template, it looks for `loans/_waiting_list.html.erb`, which does not exist.

The fix is the explicit path:

```erb
<%# An explicit path, because this page is also rendered from LoansController,
    where a bare "waiting_list" would be looked up under app/views/loans. %>
<%= render "books/waiting_list" %>
```

The rule that follows from it: a partial rendered from more than one controller gets its directory in the path. The
error message names both paths it tried, which is what makes this one quick to fix once you have seen it.

## Collection rendering

```erb
<%= render books %>
```

One line, one partial, one iteration, and the log line that confirms it:

```text
Rendered collection of books/_book.html.erb [4 times] (Duration: 4.8ms | GC: 0.0ms)
```

The long form says the same thing more clearly when the partial takes extra locals:

```erb
<%= render partial: "books/book", collection: books, locals: { show_copies: true } %>
```

`render books` with a scope is worth knowing about, because it is the one line that lets a Turbo Stream replace a list
without touching a template:

```erb
<%= turbo_stream.replace "waiting-list", partial: "books/waiting_list" %>
```

## Cache-friendly partials

A partial is also the unit of caching:

```erb
<% cache book do %>
  <%= render book %>
<% end %>
```

`cache book` builds a key from the model's name, its id and its `updated_at`, so touching the record invalidates the
fragment. That is the caching chapter's subject, and the reason partials are worth getting right early: a page made of
small partials can be cached in pieces, and a page that is one long template cannot.

## Check yourself

Move the "Out on loan" table from the book page into a partial called `books/_loans`, render it from the book page, and
check whether it can be rendered from the desk page as well. Then write the explicit path its render would need from
each controller.
