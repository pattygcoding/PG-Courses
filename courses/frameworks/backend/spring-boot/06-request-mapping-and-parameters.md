---
title: Request mapping and parameters
summary: Reading a path, a query string, a header and a body, and how Spring decides which method answers.
chapter: HTTP with Spring MVC
minutes: 14
status: draft
---

## The method annotations

```java
@GetMapping("/{key}")           // read, safe and idempotent
@PostMapping                    // create
@PutMapping("/{key}")           // replace
@PatchMapping("/{key}")         // partial update
@DeleteMapping("/{key}")        // remove, idempotent
```

Each one is `@RequestMapping` with the method fixed. The mapping says what the endpoint means, and a GET that
changes state is the mistake that breaks every cache and retry in the path between the client and the service.

## Where the values come from

```java
@GetMapping("/{key}")
public RowResponse get(
        @PathVariable String key,
        @RequestParam(defaultValue = "false") boolean expand,
        @RequestParam(required = false) String tenant,
        @RequestHeader(HttpHeaders.USER_AGENT) String agent,
        @CookieValue(name = "session", required = false) String session) {
    // ...
}
```

| Source | Annotation |
| --- | --- |
| a placeholder in the path | `@PathVariable` |
| the query string | `@RequestParam` |
| a header | `@RequestHeader` |
| a cookie | `@CookieValue` |
| the request body | `@RequestBody` |

`@PathVariable` is required unless it is declared `Optional`, and `@RequestParam` is required unless it has
`required = false` or a `defaultValue`. The `defaultValue` form is clearer than an `Optional` parameter for
a flag, because the method body has no case to handle.

A repeated parameter binds to a collection:

```java
@GetMapping
public List<RowResponse> search(@RequestParam List<String> tag) { }
```

```bash
curl 'localhost:8080/api/rows?tag=large&tag=recent'
```

## Paging

```java
@GetMapping
public Page<RowResponse> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "key") String sort) {
    return service.page(page, Math.min(size, 100), sort).map(RowResponse::from);
}
```

A collection endpoint with no bound is a query that returns a million rows the first time someone calls it.
A page size with a maximum is the guard, and the `Math.min` is where a client asking for a million gets a
hundred.

Spring Data can bind `Pageable` and `Page` directly, which reads well and passes the raw `sort` string into
the query, so a field name that does not exist becomes an error at run time rather than a compile failure.
For a public endpoint I map the parameters to a fixed set of sortable fields instead.

## Content types

```java
@PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE,
             produces = MediaType.APPLICATION_JSON_VALUE)
public RowResponse create(@RequestBody CreateRowRequest request) { }
```

`consumes` restricts the `Content-Type` the endpoint accepts and produces a 415 when a caller sends something
else. `produces` restricts what the client asked for with `Accept`, and a mismatch is a 406. Both are optional
and worth setting on an API that has more than one representation.

```bash
curl -i localhost:8080/api/rows -H 'Content-Type: text/plain' -d 'x'
```

```text
HTTP/1.1 415 Unsupported Media Type
```

## How a path is matched

```java
@GetMapping("/active")            // exact, wins over a template
@GetMapping("/{key}")             // one segment
@GetMapping("/{key}/tags")        // two segments
```

The most specific pattern wins, so `/active` is chosen over `/{key}` whatever order the methods appear in.
Two patterns that are equally specific produce a start-up failure, which is better than an arbitrary choice.

Two differences from older Spring versions are worth knowing. A trailing slash is not matched by default in
Boot 3, so `/api/rows/` is a 404 for a mapping of `/api/rows`. And the pattern parser no longer accepts a
regular expression inside a placeholder, so a constrained segment becomes a validation rule in the method
rather than in the path.

```text
Ambiguous mapping. Cannot map 'rowController' method
com.example.tool.RowController#get(String) to {GET [/api/rows/{key}]}
```

That message appears at start-up and names both candidates, which turns a routing mistake into a failure
before a request arrives.

## Limit what a client can ask for

```java
@GetMapping
public List<RowResponse> list(@RequestParam(defaultValue = "20") int limit) {
    if (limit < 1) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "limit must be positive");
    }
    return service.recent(Math.min(limit, 100)).stream().map(RowResponse::from).toList();
}
```

Every parameter a client controls is a bound to enforce: a page size, a limit, a sort field, a duration. A
missing bound is a way to let one request consume all the memory, which the validation page turns into a
declarative check.

## Check yourself

Write one endpoint that takes a path variable, on optional query parameter and a required one, and call it
with and without the optional parameter. Then set `consumes` and send the wrong content type, and read the
status code.
