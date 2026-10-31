---
title: HTTP and the network
summary: Net::HTTP in the standard library, the three failures to expect, and when a client gem is worth it.
chapter: Files and data
minutes: 14
status: draft
---

## A request and a response

```ruby
require "net/http"
require "json"
require "uri"

uri = URI("http://127.0.0.1:3000/books?query=dune")

http = Net::HTTP.new(uri.host, uri.port)
http.open_timeout = 2
http.read_timeout = 2

response = http.get(uri)
response.code          # "200"
response.message       # "OK"
response["content-type"]
JSON.parse(response.body)
```

Run against a small server written for this page, the output is:

```text
status: 200 OK
content type: application/json
parsed: {"request" => "GET /books?query=dune HTTP/1.1", "body" => ""}
```

Four objects are in play, and it is worth keeping them apart: `URI` is the address, `Net::HTTP` is the connection
(host, port, timeouts), the request is what you send, and the response is what comes back. The short form builds all
of them for one call:

```ruby
body = Net::HTTP.get(URI("http://127.0.0.1:3000/loans"))
```

That is fine for a script and wrong for anything that makes more than a couple of requests, because a new connection
per request costs more than the request does.

## A POST with a JSON body

```ruby
post = Net::HTTP::Post.new("/loans", "Content-Type" => "application/json")
post.body = JSON.generate({ loan: { book_id: "dune", days: 7 } })

posted = http.request(post)
```

```text
post status: 200
post parsed: {"request" => "POST /loans HTTP/1.1", "body" => "{\"loan\":{\"book_id\":\"dune\",\"days\":7}}"}
```

The server side saw the same thing from the other end:

```text
server saw: POST /loans HTTP/1.1 (7 headers, 36 body bytes)
```

`Content-Type` is part of the request, not a decoration: a server that expects JSON will reject a body without it, and
`Content-Length` is set from `body` for you. `Net::HTTP::Get`, `Post`, `Put`, `Patch` and `Delete` are the classes,
and `http.request(request)` is how an arbitrary one is sent.

## The three failures

```irb
>> Net::HTTP.get(URI("http://127.0.0.1:1/books"))
[Errno::ECONNREFUSED, "Failed to open TCP connection to 127.0.0.1:1 (No connection "]
>> Net::HTTP.get(URI("http://northside.invalid/books"))
=> Socket::ResolutionError
>> (a slow connection with open_timeout 1)
=> Net::OpenTimeout
```

- `Errno::ECONNREFUSED` means nothing is listening on that address. In a script, this usually means the service is
  not running yet.
- `Socket::ResolutionError` means the name did not resolve, which is a typo or a DNS problem.
- `Net::OpenTimeout` and `Net::ReadTimeout` mean the connection or the response took too long. Both descend from
  `Timeout::Error`.

All three are `StandardError` subclasses, so a `rescue` with no class catches them and a `rescue StandardError => e`
with a `warn` line tells you which one happened. Setting both timeouts is not optional: without them, a request to an
address that accepts the connection and then says nothing hangs forever, and a script that runs in a schedule hangs
with it.

A response with a 4xx or 5xx status is not an exception. `response.code` is a string, and it is the caller's job to
decide:

```ruby
case response
when Net::HTTPSuccess then JSON.parse(response.body)
when Net::HTTPNotFound then nil
else raise "unexpected #{response.code} from #{uri}"
end
```

`Net::HTTPSuccess`, `Net::HTTPNotFound` and the rest are classes with `===` defined on the status code, which is why
they work in a `case`.

## Retrying in a way that helps

```ruby
def get_with_retry(uri, attempts: 3)
  http = Net::HTTP.new(uri.host, uri.port)
  http.read_timeout = 5

  attempts.times do |attempt|
    response = http.get(uri)
    return response if response.is_a?(Net::HTTPSuccess)

    sleep(2**attempt)
  end

  raise "gave up after #{attempts} attempts"
end
```

Two things make a retry worth having: it only retries what can succeed on a second try (a 500 or a timeout, rather
than a 404), and it waits longer each time so a struggling service is not hammered. A retry loop with no ceiling is
how a small outage becomes a large one.

## When to add a gem

`Net::HTTP` covers a plain request to a plain endpoint. Reach for a client library when you need any of:

| Need | Why the standard library is not enough |
| --- | --- |
| connection pooling and keep-alive | `Net::HTTP` gives you one connection to manage yourself |
| automatic retries with backoff | you would be writing the loop above in every caller |
| redirects and cookies | both are rule sets rather than one-liners |
| a typed API client | a gem with a method per endpoint documents the service |
| streaming a large upload or download | `Net::HTTP` needs a block and care with partial reads |

The two names that cover most of that are `Faraday`, which is a wrapper over an adapter you choose, and `HTTParty`,
which is smaller and reads well for a script. Both are one line in a Gemfile, and both are a dependency to justify in
a gem you publish.

## Check yourself

Write a script that fetches a JSON endpoint, prints one field from each record, and exits with status 1 with a message
on standard error when the response is not 2xx. Then set the timeout to a second and run it against a port nothing is
listening on, and confirm the error you get is the one above.
