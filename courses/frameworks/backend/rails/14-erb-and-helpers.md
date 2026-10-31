---
title: ERB and helpers
summary: Three kinds of tag, automatic escaping, and the helpers that keep a template to one line per element.
chapter: Controllers and views
minutes: 14
status: draft
---

## Three kinds of tag

```erb
<%= book.title %>      <%# prints the value, escaped %>
<% if book.available? %>   <%# runs the code, prints nothing %>
<%# a comment that does not reach the browser %>
```

`<%= %>` runs the code and writes the result into the page. `<% %>` runs it and writes nothing, which is how blocks are
written. `<%# %>` is a comment, and unlike an HTML comment it does not travel to the client.

The output of `<%= %>` is escaped by default: a title containing `<script>` renders as text. That is the default
because templates get written by people who are thinking about layout rather than about injection.

```erb
<%= book.title %>              <%# escaped %>
<%= raw book.title %>          <%# not escaped: only for HTML you produced %>
<%= sanitize book.title, tags: [ "em" ] %>   <%# escaped except for a named allow list %>
<%= simple_format(book.notes) %>              <%# keeps paragraphs, escapes the rest %>
```

`raw` is the one to be careful with. A value that came from a user and went through `raw` is a cross-site scripting
hole, and it is easy to add while debugging and forget about.

## Everything the controller set is in scope

```erb
<h1><%= @book.title %></h1>
<p><%= @book.author %> - <%= @book.genre_label %></p>
<p><%= pluralize(@book.copies, "copy") %> on the shelf</p>
```

Instance variables from the action are available, no `@` prefixes are stripped, and a typo gives a
`NoMethodError on nil` at render time rather than at compile time. That is one of the reasons `render` errors are worth
reading carefully: the template is Ruby, and it fails like Ruby.

## The helpers worth knowing by heart

| Helper | Writes |
| --- | --- |
| `link_to("Books", books_path)` | an `<a>` |
| `button_to("Sign out", session_path, method: :delete)` | a form with one button, for a non-GET |
| `form_with model: @loan` | a form bound to a record |
| `pluralize(3, "copy")` | `3 copies` |
| `dom_id(loan)` | `loan_1`, an id for the DOM |
| `content_for :title, "Dune"` | a block the layout can read |
| `render "books/list", books: @books` | a partial |
| `number_to_currency(12.5)` | `$12.50` |
| `time_ago_in_words(loan.due_on)` | `in 3 days` |
| `truncate(text, length: 40)` | `The Left Hand of Dark…` |
| `t(".title")` | a translation, from `config/locales` |

Two of those are used in this application's book page:

```erb
<% content_for :title, @book.title %>
```

```erb
<td><%= loan.due_on.to_fs(:long) %></td>
```

`content_for` puts value into a named slot the layout reads with `yield :head` or `content_for(:title)`, which is how
one page changes the browser title without the layout knowing anything about the page. `to_fs(:long)` is
`to_formatted_s` shortened, and it renders a `Date` as `October 31, 2026`. The format itself lives in
`config/locales/en.yml`, so an application can change it in one place.

## A partial and its collection

```erb
<p class="count"><%= pluralize(books.size, "book") %></p>

<% if books.any? %>
  <ul class="books">
    <%# A collection render: each item goes through app/views/books/_book.html.erb. %>
    <%= render books %>
  </ul>
<% else %>
  <p class="empty">No book matches that search.</p>
<% end %>
```

```erb
<li class="book">
  <%= link_to book.title, book, data: { turbo_frame: "_top" } %>
  <span class="author">by <%= book.author %></span>
  <span class="genre"><%= book.genre_label %></span>
  <span class="copies"><%= pluralize(book.copies, "copy") %> on the shelf</span>
</li>
```

`render books` renders the collection through the partial named after the model, passing each book to it as `book`. One
line for the loop, and the log confirms the shape:

```text
Rendered collection of books/_book.html.erb [4 times] (Duration: 4.8ms | GC: 0.0ms)
```

The `data: { turbo_frame: "_top" }` on that link is the subject of the Turbo Frames page: the list lives inside a
frame, and a link that should open a whole page has to say so.

## A form in a template

```erb
<%= form_with url: books_path, method: :get, class: "filters" do |form| %>
  <p>
    <%= form.label :query, "Search the catalogue" %>
    <%= form.search_field :query, value: params[:query] %>
  </p>

  <p>
    <%= form.label :genre, "Genre" %>
    <%= form.select :genre,
          options_for_select([ [ "All genres", "" ] ] + @genres.map { |genre| [ genre.humanize, genre ] }, params[:genre]) %>
  </p>

  <%= form.submit "Filter" %>
<% end %>
```

A search form has no model, so it is built from a URL and a method. `form_with url:` with `method: :get` puts the fields
in the query string, which is what makes a filtered catalogue a URL someone can bookmark. The form page comes back to
the builder methods in more detail.

## Where the HTML comes from

```text
app/views/layouts/application.html.erb   the page shell, once per request
app/views/books/index.html.erb           the action's template
app/views/books/_book.html.erb           a partial, once per book
```

A template is looked up by controller and action: `BooksController#index` renders `app/views/books/index.html.erb`
without anything saying so. `render "books/list"` is the explicit form, and it is required whenever the partial is not
next to the template that renders it.

## Check yourself

Rewrite the book row in `_book.html.erb` so that the waiting count appears as a separate span only when it is above
zero, using a helper rather than an `if` in the template. Then find one helper in the Rails documentation that would
remove a line from the catalogue page.
