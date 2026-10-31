---
title: Forms
summary: form_with, a model-backed form, the CSRF token that appears by itself, and the two levels of validation.
chapter: Controllers and views
minutes: 15
status: draft
---

## A form without a model

```erb
<%= form_with url: books_path, method: :get, class: "filters" do |form| %>
  <p>
    <%= form.label :query, "Search the catalogue" %>
    <%= form.search_field :query, value: params[:query] %>
  </p>

  <%= form.submit "Filter" %>
<% end %>
```

`form_with url:` takes a path and a method, which is what a search or a filter wants: nothing is being created, the
values go in the query string, and the result is a URL someone can send to a colleague.

## A form bound to a record

```erb
<%= form_with model: @loan, url: loans_path do |form| %>
  <%= form.hidden_field :book_id, value: @book.id %>
  ...
<% end %>
```

`form_with model:` does three things at once. It builds the action from the model's class and id, chooses POST for a new
record and PATCH for a persisted one, and names the fields `loan[attribute]` so the controller finds them under one key.
That last part is why the params line has the same shape as the model:

```ruby
params.expect(loan: [ :book_id, :days, :member_name, :member_email ])
```

An array of two records means a nested route:

```erb
<%= form_with model: [ @book, @waiting_entry ] do |form| %>
  <p>
    <%= form.label :member_name, "Your name" %>
    <%= form.text_field :member_name, required: true %>
  </p>

  <%= form.submit "Join the waiting list" %>
<% end %>
```

| Model | Action | Method |
| --- | --- | --- |
| `form_with model: @book` (new) | `/books` | POST |
| `form_with model: @book` (saved) | `/books/3` | PATCH |
| `form_with model: [@book, @entry]` | `/books/3/waiting_entries` | POST |
| `form_with url: books_path, method: :get` | `/books` | GET |

## The fields

| Builder method | Renders |
| --- | --- |
| `form.text_field :title` | `<input type="text">` |
| `form.email_field :email` | `<input type="email">` |
| `form.number_field :days` | `<input type="number">` |
| `form.search_field :query` | `<input type="search">` |
| `form.textarea :notes` | `<textarea>` |
| `form.check_box :available` | a checkbox plus a hidden field |
| `form.select :genre, options` | a `<select>` |
| `form.date_field :borrowed_on` | a date picker |

`form.label :title, "Title"` renders a label whose `for` matches the input's id, so clicking the label focuses the
field. That pairing is why the builder is worth using: the id includes the model name, and reproducing it by hand is
where accessibility bugs come from.

The select on the catalogue page shows the explicit form:

```erb
<%= form.select :genre,
      options_for_select([ [ "All genres", "" ] ] + @genres.map { |genre| [ genre.humanize, genre ] }, params[:genre]) %>
```

`options_for_select` takes `[label, value]` pairs and the currently selected value, which is what makes the filter stick
after the form submits.

## The token that appears by itself

A `form_with` produces a hidden field nobody wrote:

```html
<input type="hidden" name="authenticity_token" value="gOK2CE2_stVgsselp9Q2PGz5TYX_n_gg..." autocomplete="off">
```

That is Rails' cross-site request forgery protection. Every non-GET request carries a token, the session cookie holds
the other half, and a form on another site cannot read the page to get one. `csrf_meta_tags` in the layout is the same
token for JavaScript, which is why a `fetch` in a Stimulus controller has to send it.

Two consequences. A hand-written `<form>` needs
`<%= hidden_field_tag :authenticity_token, form_authenticity_token %>` or it will be rejected. And an API that has no
browser in front of it turns the check off explicitly:

```ruby
class ApiController < ActionController::API
  skip_forgery_protection
end
```

## Two levels of validation

```erb
<%= form.email_field :member_email, required: true %>
```

The browser refuses to submit an empty field or one that is not an email address. That check is free and it is not
enough: a client that is not a browser does not run it, and the browser cannot know that an address is already taken.

The server-side validations run after that, and their errors are what the page shows:

```ruby
if @loan.save
  redirect_to @book, notice: "..."
else
  render "books/show", status: :unprocessable_entity
end
```

An integration test posts an invalid email address directly, so it exercises the server path and never the browser's.
Both layers are worth having, and the discovery worth making early is that `required: true` and
`validates :email, presence: true` are different checks in different places.

## Links that post

```erb
<%= button_to "Sign out", session_path, method: :delete %>
```

A `link_to` with `method: :delete` is a lie: the browser sends a GET and the JavaScript that was supposed to fix it is
no longer part of the framework. `button_to` renders a form with one button, which is honest and works without
JavaScript:

```html
<form method="post" action="/session">
  <input type="hidden" name="_method" value="delete">
  <button>Sign out</button>
</form>
```

The `_method` field is why `Rack::MethodOverride` is in the middleware stack: a form can only GET and POST, so a DELETE
is a POST with a field that says otherwise.

## Check yourself

Write the form for creating a member, with a name and an email field, and render the shared errors partial above it.
Then post it with an invalid email address and check that the page comes back with the errors on it rather than a
redirect.
