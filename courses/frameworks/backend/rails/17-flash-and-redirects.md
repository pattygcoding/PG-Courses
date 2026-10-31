---
title: Flash and redirects
summary: A message that survives one request, the difference between a redirect and a re-render, and a flash that updates itself.
chapter: Controllers and views
minutes: 13
status: draft
---

## The flash

```ruby
redirect_to @book, notice: "Lent #{@book.title} to #{@loan.member.name}, due #{@loan.due_on}."
```

`notice:` and `alert:` are the two keys Rails gives names to, and they live in the session for exactly one request. The
redirect is a response that says "GET /books/4", the flash rides along, and the next request reads it and clears it.

The layout renders it from one partial:

```erb
<%# A flash message that clears itself: the value is read and removed in one step. %>
<% if (message = flash[:notice]) %>
  <p class="notice" role="status"><%= message %></p>
<% end %>

<% if (message = flash[:alert]) %>
  <p class="alert" role="alert"><%= message %></p>
<% end %>
```

`role="status"` and `role="alert"` are how a screen reader is told about the message, and they cost nothing. Any key
works, not only the two named ones:

```ruby
flash[:info] = "The catalogue is read only this afternoon."
```

## flash.now, for a page that is not a redirect

```ruby
if entry.save
  flash.now[:notice] = "#{entry.member_name} is on the waiting list."
  respond_to do |format|
    format.turbo_stream
    format.html { redirect_to book, notice: flash[:notice] }
  end
else
  redirect_to book, alert: entry.errors.full_messages.to_sentence
end
```

`flash.now` puts the message in this response rather than the next one, which is what a re-render needs. `flash[:x]`
before a `render` would show the message on the *following* page instead, which is the classic symptom: a form
re-renders with no errors visible and the message shows up after the next click.

The Turbo Stream branch is worth reading twice. The same action answers a Turbo-enabled browser with a fragment and
everything else with a redirect, and the `flash.now` covers both:

```erb
<%= turbo_stream.replace "waiting-list", partial: "books/waiting_list" %>
<%= turbo_stream.update "flash", partial: "shared/flash" %>
```

The browser showed the result of that: the waiting count went from one to two, the list gained a name, and the notice
appeared above the heading, all without a page load.

## Redirect or re-render

The rule that covers almost every case:

| Situation | Response |
| --- | --- |
| The write succeeded | redirect, so a refresh does not repeat it |
| The write failed validation | render the form again, so nothing typed is lost |
| The user is not signed in | redirect to the sign-in page |
| The record does not exist | 404, from `find` raising |

```ruby
if @loan.save
  redirect_to @book, notice: "..."
else
  render "books/show", status: :unprocessable_entity
end
```

The redirect after a successful POST is the Post/Redirect/Get pattern, and the reason is the refresh button: without
it, a refresh resends the POST, and on a form that records a loan that means two loans.

The `status: :unprocessable_entity` on the failure path is what tells the browser, the test suite and Turbo that this
200-shaped response is a rejection. Turbo shows the page; a browser still shows it; but a client can tell the
difference, and so can a test:

```ruby
assert_response :unprocessable_entity
```

## Where the message goes

Three places a message can end up, and they are not interchangeable:

| Place | Lives for | Use for |
| --- | --- | --- |
| `flash[:notice]` | until the next request | the result of a write |
| `flash.now[:notice]` | this response | the result of a re-render |
| the record's errors | the response that renders them | what was wrong with the input |

The third is the one to prefer for form errors. A flash says "there was a problem somewhere"; `@loan.errors` says which
field and why, and it is what the shared errors partial renders.

## Long messages

```ruby
alert: entry.errors.full_messages.to_sentence
```

`to_sentence` joins a list into readable prose with "and" before the last item. It is the right method for a message
built from a list, and it is Active Support, so it is available everywhere in a Rails application:

```ruby
[ "Name can't be blank", "Email is not an email address" ].to_sentence
# "Name can't be blank and Email is not an email address"
```

For more than about three errors, a sentence is the wrong shape and the errors belong in a list on the page.

## Keeping a message across two redirects

```ruby
flash.keep(:notice)
```

`keep` moves a message into the next request again, which is what a chain of redirects needs: sign in, then go to the
page you asked for, and still show what the first page was going to say. It is rare, and when a flow needs it twice,
the message is being asked to do a job that belongs in the URL.

## Check yourself

Add a `return` action to the desk that marks a loan returned and redirects to the book with a notice naming the member.
Then write the test for it, including the case where the loan has already been returned, and decide whether that case
is a flash message or a validation error.
