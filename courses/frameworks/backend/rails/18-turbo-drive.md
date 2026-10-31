---
title: Turbo Drive
summary: Every link and form becomes an AJAX request, and the browser's history still works.
chapter: Hotwire
minutes: 13
status: draft
---

## What is switched on already

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import "controllers"
```

Two lines, and the application is a single-page-feeling app. Turbo Drive intercepts every link click and form
submission, sends the request with `fetch`, and swaps the `<body>` of the response in. The `<head>` is merged rather
than replaced, which is why a change to a stylesheet is picked up without a hard reload:

```erb
<%= stylesheet_link_tag :app, "data-turbo-track": "reload" %>
```

`data-turbo-track="reload"` is Turbo's cue: if the asset it points at changes, reload the whole page rather than a
fragment of it. The same attribute on the importmap tags is why an edited JavaScript file takes effect on the next
page load instead of the next day.

## What it does with a request

```text
click a link
  Turbo sends GET /books/3 with a Turbo header
  the server renders the same HTML it always did
  Turbo replaces the body and merges the head
  history.pushState records the new URL
```

Nothing on the server changed. That is the part worth understanding before learning Frames and Streams: Turbo Drive
needs no cooperation from the application, and the rest of Hotwire is for cases where a whole page is too much.

Two consequences come with it. The page is not reloaded, so JavaScript in the old page does not run again and anything
registered in a `DOMContentLoaded` handler has to be registered differently. And a response that took the server 200ms
still takes 200ms; the difference is that the browser is not blank while it happens.

## The attributes that switch it off

```erb
<%= link_to "Download", report_path(format: :csv), data: { turbo: false } %>
<%= link_to "Chart", chart_path, target: "_blank" %>
```

`data-turbo="false"` on a link or a form makes it an ordinary navigation. Links with a `target` other than `_self`, and
links that download a file, are handled already.

On the other side, a response can tell Turbo to reload:

```ruby
redirect_to @book, status: :see_other
```

A redirect following a non-GET is answered by Turbo with a `fetch` and a visit, and the 303 is what says "use a GET for
the next request". Rails sets that automatically with `redirect_to` after a POST, which is why the flash works the same
way whether Turbo is in front or not.

## Why the flash survives a redirect

The flash lives in the session for one request. Turbo's redirect is a second request, so the message is still there,
and the body Turbo swaps in contains it. Nothing about the pattern changed because the client became a JavaScript
application: the same Post/Redirect/Get shape works, which is the design goal of the whole framework.

## What the request looks like in the log

```text
Processing by BooksController#show as HTML
```

A Turbo Drive navigation is an ordinary request, and the log line says `HTML` because that is what it asked for. Frames
and Streams ask for something different, and the log says so:

```text
Processing by BooksController#index as TURBO_STREAM
```

That difference is the subject of the next two pages.

## Where it can surprise you

| Symptom | Cause |
| --- | --- |
| a script does not run after a navigation | the page did not reload; use Stimulus or a `turbo:load` listener |
| a `console.log` in a script tag only prints once | same |
| a file download opens as a blank page | the response was HTML or the link needed `turbo: false` |
| form state is lost on a back click | Turbo caches the page; a `turbo:before-cache` handler can clear it |
| the URL changed but the page did not | a response without a body, or a redirect Turbo followed twice |

The first two are the ones that come up first. A Rails 8 application has no `<script>` tags in its templates for exactly
this reason: behaviour belongs in a Stimulus controller, which is a page about three pages from here.

## Check yourself

Open the network tab and click a link in the application. Confirm that the request carries a `Turbo-Frame` or
`Accept` header you did not write, and that the response is the same HTML the server would have sent for a normal
visit. Then add `data: { turbo: false }` to one link and compare the two requests.
