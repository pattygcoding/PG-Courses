---
title: Turbo Frames
summary: A frame that swaps itself, the error when the response has no frame in it, and the link that has to opt out.
chapter: Hotwire
minutes: 15
status: draft
---

## A frame is a region that navigates itself

```erb
<%# The form and the list live inside one Turbo Frame, so filtering replaces the
    list rather than reloading the page. %>
<%= turbo_frame_tag "catalogue" do %>
  <%= form_with url: books_path, method: :get, class: "filters" do |form| %>
    ...
  <% end %>

  <%= render "books/list", books: @books %>
<% end %>
```

`turbo_frame_tag "catalogue"` renders a custom element with an id. That HTML came out of the running application:

```html
<turbo-frame id="catalogue">
  <form class="filters" action="/books" accept-charset="UTF-8" method="get">
    <p>
      <label for="query">Search the catalogue</label>
      <input autofocus="autofocus" type="search" name="query" id="query" />
    </p>
    <input type="submit" name="commit" value="Filter" data-disable-with="Filter" />
  </form>
  <!-- BEGIN app/views/books/_list.html.erb
--><p class="count">4 books</p>
  <ul class="books">
    <!-- BEGIN app/views/books/_book.html.erb
-->
```

The frame is invisible to the user and does nothing on its own; what matters is what happens to a navigation from
inside it. The `<!-- BEGIN ... -->` comments are Rails 8.1 in development naming the partial that rendered each region,
which is a cheap way to find out where a piece of HTML came from.

## What a frame navigation does

Submitting that form sends `GET /books?query=edda&genre=&commit=Filter`, and the request carries a `Turbo-Frame`
header. Turbo takes the response, looks for a `<turbo-frame id="catalogue">` inside it, and replaces the frame's
contents with what it finds. Everything outside the frame, the header, the navigation and the flash, is untouched.

The network panel confirmed both halves:

```text
[GET] http://127.0.0.1:3007/books?query=edda&genre=&commit=Filter => [200] OK
```

and the page afterwards showed one book in the list with "edda" still in the search box. The controller did not change:
`BooksController#index` renders the same template it always did, and Turbo pulled the frame out of the response.

That is the part to internalise. **A frame request expects a response containing that frame.** The framework is not
asked to render less; it is asked to find the frame and use it.

## The error when it cannot

A link inside the frame that should open a whole page is the first bug every frame runs into. Clicking a book title
loaded `/books/3` and the list vanished:

```text
The response (200) did not contain the expected <turbo-frame id="catalogue"> and will be ignored.
To perform a full page visit instead, set turbo-visit-control to reload.
```

The response was a complete book page, and it had no frame called `catalogue` in it, so Turbo discarded it. The fix is
one attribute on the link:

```erb
<li class="book">
  <%# The list lives inside the catalogue frame, so a link that should open a
      whole page has to opt out of it. Without _top the response for /books/1 is
      fetched into the frame and Turbo discards it for want of a matching frame. %>
  <%= link_to book.title, book, data: { turbo_frame: "_top" } %>
</li>
```

`data: { turbo_frame: "_top" }` means "navigate the whole page, not the frame". `_top` is the one reserved name; any
other value is the id of the frame to navigate instead.

| Attribute | Does |
| --- | --- |
| `data: { turbo_frame: "_top" }` | break out of the frame and do a full visit |
| `data: { turbo_frame: "other" }` | put the response into the frame called `other` |
| `turbo_frame_tag "x", src: path` | load that path into the frame when the page loads |
| `data: { turbo_frame: "_self" }` | stay in the frame, which is the default |

## Lazy frames

```erb
<%= turbo_frame_tag "waiting-list", src: waiting_list_book_path(@book) do %>
  <p>Loading…</p>
<% end %>
```

`src:` makes the frame fetch its own content after the page has rendered, which is how a slow part of a page is kept out
of the first response. The placeholder inside is what the user sees until it arrives, and it is worth writing something
honest there rather than nothing.

This is the tool for the expensive widget: a recommendation list, a count from another service, a chart. The page is
sent with a hole in it, and the hole fills itself in.

## Where a frame is the right tool

| Use the frame when | Because |
| --- | --- |
| a part of the page filters or pages independently | the rest of the page should not change |
| a form's result replaces a region | the user stays where they were |
| a slow region can load later | `src:` and a placeholder |

Reach for a Turbo Stream instead when the change spans more than one region, and for a full page when the change is
genuinely a different page. A frame that updates half a page usually means the two halves are one region that has been
drawn twice.

## Testing a frame

An integration test can send the frame header, and the code that says that is short:

```ruby
test "the catalogue answers a frame request" do
  get books_url(query: "edda"), headers: { "Turbo-Frame" => "catalogue" }

  assert_response :success
  assert_select "turbo-frame#catalogue" do
    assert_select "li.book", count: 1
  end
end
```

That test passes whether or not the header matters, which is the honest limitation: an integration test checks the
response, and only a real browser checks what Turbo does with it. The browser check for this page was a click and a
console window, and the error above is what it said before the fix.

## Check yourself

Wrap the waiting list of the book page in a frame of its own, then make the waiting-entry form submit into it with
`data: { turbo_frame: "waiting-list" }`. Check in the browser that the rest of the page does not move, and add a link
inside the frame that opens the catalogue and confirm it needs `_top`.
