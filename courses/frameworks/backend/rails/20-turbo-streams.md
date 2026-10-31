---
title: Turbo Streams
summary: A response that carries instructions, and a waiting list that updates without a reload.
chapter: Hotwire
minutes: 14
status: draft
---

## A response that is not a page

```erb
<%# A Turbo Stream response: two pieces of the page are replaced and the page
    itself is not reloaded. %>
<%= turbo_stream.replace "waiting-list", partial: "books/waiting_list" %>

<%= turbo_stream.update "flash", partial: "shared/flash" %>
```

`app/views/waiting_entries/create.turbo_stream.erb` is a template like any other, and what it renders is a list of
instructions rather than a page:

```html
<turbo-stream action="replace" target="waiting-list">
  <template>...the new list...</template>
</turbo-stream>
<turbo-stream action="update" target="flash">
  <template>...the new flash...</template>
</turbo-stream>
```

Turbo reads those, runs each one against the live page and discards the response. The waiting count changes and a
notice appears above the heading, and the page behind them never moved.

| Action | Does |
| --- | --- |
| `append`, `prepend` | adds inside the target, at the end or the start |
| `replace` | swaps the target element for the new one |
| `update` | swaps the target's contents, keeping the element |
| `remove` | deletes the target |
| `before`, `after` | adds a sibling |

`replace` and `update` are the two that matter, and the difference is which element carries the id. `replace` sends a
new element with the same id; `update` keeps the wrapper and changes what is inside it, which is what the flash needs.

## The controller that answers both ways

```ruby
def create
  book = Book.find(params[:book_id])
  entry = book.waiting_entries.new(waiting_entry_params)

  if entry.save
    @book = book
    # A fresh entry for the form, so the response renders a create form rather
    # than a form for the record that was just written.
    @waiting_entry = book.waiting_entries.new
    flash.now[:notice] = "#{entry.member_name} is on the waiting list."

    respond_to do |format|
      format.turbo_stream
      format.html { redirect_to book, notice: flash[:notice] }
    end
  else
    redirect_to book, alert: entry.errors.full_messages.to_sentence
  end
end
```

Four things are worth reading twice.

`respond_to` with two formats means one endpoint for two clients. A Turbo-enabled browser sends
`Accept: text/vnd.turbo-stream.html` and gets the stream; anything else gets the redirect. The HTML branch is what a
browser with JavaScript disabled falls back to, and neither caller knows about the other.

`@waiting_entry = book.waiting_entries.new` matters because the partial renders a form. Leaving the saved record in
place would render a form that PATCHes the entry it has already created, and there is no `update` action for it.

`flash.now` puts the message in this response, and the stream carries it into the flash element. `flash[:notice]` before
a `render` would put it in the next request and show it a page later.

The partial reads the book from an instance variable, and the stream template passes it on:

```erb
<%= turbo_stream.replace "waiting-list", partial: "books/waiting_list" %>
```

The inline block form is for a fragment of a line or two:

```erb
<%= turbo_stream.append "waiting-list" do %>
  <li><%= @entry.member_name %></li>
<% end %>
```

## What the browser did

The waiting list before and after the form was submitted:

```text
1 borrower waiting for this book.
  Alan Turing, since 31 Oct 14:08

2 borrowers waiting for this book.
  Grace Hopper, since 31 Oct 14:09
  Alan Turing, since 31 Oct 14:08
```

And the notice, in the flash element above the heading:

```text
Grace Hopper is on the waiting list.
```

No page load, and no JavaScript written for any of it.

## Testing a stream response

An integration test has to ask for the stream, which is the only way to reach that branch:

```ruby
test "joining the waiting list answers with a Turbo Stream" do
  assert_difference "WaitingEntry.count", 1 do
    post book_waiting_entries_url(books(:dune)),
      params: { waiting_entry: { member_name: "Grace Hopper" } },
      headers: { "Accept" => "text/vnd.turbo-stream.html" }
  end

  assert_response :success
  assert_equal "text/vnd.turbo-stream.html", response.media_type
  assert_match(/<turbo-stream action="replace" target="waiting-list">/, response.body)
  assert_match(/1 borrower waiting for this book/, response.body)
end
```

`response.media_type` proves the branch was taken and the two `assert_match` calls check the instructions rather than
the page. The same test without the header asserts the redirect, and the pair documents the action better than a
comment.

## When a stream is better than a frame

| Situation | Use |
| --- | --- |
| one region navigates itself | a frame |
| a write changes two regions | a stream |
| a write changes something outside the region it came from | a stream |
| a background job changes a page others are looking at | `broadcasts_to` and `turbo_stream_from` |

The last row reaches beyond one request. `broadcasts_to` on a model with `turbo_stream_from` in a template is how a
change one user makes appears in another user's page, carried over Action Cable. The instructions are the same; the
transport is a websocket instead of an HTTP response.

## Check yourself

Make the "Record a loan" form answer with a stream that replaces the outstanding-loans table and the flash, then write
both integration tests: one with the Turbo accept header and one without.
