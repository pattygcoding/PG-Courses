---
title: Caching
summary: Fragments keyed by a record, a database-backed cache store, and the three ways a cache goes stale.
chapter: The rest of the stack
minutes: 13
status: draft
---

## What is already cached

```text
config/environments/development.rb   config.cache_store = :memory_store
config/environments/test.rb          config.cache_store = :null_store
config/environments/production.rb    config.cache_store = :solid_cache_store
```

Those three lines came out of the running application, and they are a good default: development caches in the process
so a restart clears it, test caches nothing so a test cannot pass on a stale value, and production uses the database
through Solid Cache.

Two pieces of caching are on before any of that, from the middleware stack:

| Middleware | Does |
| --- | --- |
| `Rack::ETag` | adds an ETag so the browser can ask whether anything changed |
| `Rack::ConditionalGet` | answers 304 when the ETag or `Last-Modified` still matches |

That is why a refresh is cheap: the browser asks, the application answers 304, and no body travels.

## Fragment caching

```erb
<% cache book do %>
  <%= render book %>
<% end %>
```

`cache book` builds a key from the model's name, its id and its `updated_at`, which is the part that matters: touching
the record changes the key, so the old fragment is never read again. Nothing is expired by hand and nothing has to know
which pages a book appears on.

A collection is one line:

```erb
<% cache books do %>
  <%= render books %>
<% end %>
```

That caches the list under a key built from the newest `updated_at` in it, and it is the version to use when building
the list is more expensive than rendering the rows.

## Nesting, and why it is worth it

```erb
<% cache @book do %>
  <h1><%= @book.title %></h1>

  <% cache [ @book, "loans" ] do %>
    <%= render @outstanding %>
  <% end %>
<% end %>
```

The inner fragment is keyed by the book and a string, so a change to the loans does not invalidate the heading and vice
versa. The pattern is called Russian doll caching, and the reason for the extra line is that a fragment which changes
often should not sit inside one that does not.

The rule that makes it work: a fragment may only show things that change when its key changes. A count of something
else, or the current user's name, does not belong inside one. That is what `cache_if` is for:

```erb
<% cache_if book.available?, book do %>
```

## Caching something that is not a view

```ruby
Rails.cache.fetch("catalogue/genres", expires_in: 1.hour) do
  Book.distinct.pluck(:genre).sort
end
```

`fetch` reads the key and, on a miss, runs the block and writes the result. `expires_in` is the safety net for a value
whose invalidation nobody remembered, and the honest advice is to keep it: a cache with no expiry is a correctness bug
waiting for a change that does not go through the code that would clear it.

`Rails.cache` is the same store the views use. What does not belong in it is anything a request must see immediately: a
flash message, or a record the user wrote in the same request and is about to read.

## The three ways a cache goes stale

| Cause | Fix |
| --- | --- |
| the key omits something the fragment shows | include it: `cache [ book, current_user ]` |
| a value is written outside the path that invalidates it | an expiry, and the path is the bug |
| two environments share a namespace | `namespace: Rails.env`, which is the default |

The first is the one that bites. A fragment showing the waiting count and keyed only by the book keeps showing the old
count until the book itself is touched, and the fix is either to add the entry to the key or to move that part out of
the cached region.

The default `config/cache.yml` is worth reading for the other two:

```yaml
default: &default
  store_options:
    max_size: <%= 256.megabytes %>
    namespace: <%= Rails.env %>

production:
  database: cache
  <<: *default
```

A database-backed cache has a size ceiling and a namespace per environment, which is what stops a development cache
being read in production and the cache table growing without a limit.

## Turning it on in development

```bash
bin/rails dev:cache
```

That toggles caching in development by writing a file under `tmp/`, which `config/environments/development.rb` checks.
It exists because the honest way to develop a cache is with it off, and the honest way to test one is with it on for a
while. The log prints `Cache read` and `Cache write` lines with a duration and the key, which is the same kind of
evidence the query log gives.

## What not to cache

| Thing | Why not |
| --- | --- |
| the flash | it lives for one request by design |
| a value written in the same request | they read it immediately |
| a small query | the cache lookup costs something too |
| a key with a secret in it | cache keys end up in logs |

That last row is worth saying out loud, because a key built from a session token is a common mistake. Cache keys appear
in logs, in dashboards and in exception reports, and a key is not a place for a secret.

## Check yourself

Add fragment caching to the catalogue list, keyed so that a change to any book invalidates it, and check the log for a
cache read on the second request. Then move the waiting count out of the cached fragment and say which of the two
versions you kept.
