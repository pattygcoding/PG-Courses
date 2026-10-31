---
title: A first REST controller
summary: Mapping a request to a method, where the layers sit, and the status codes a service returns.
chapter: HTTP with Spring MVC
minutes: 14
status: draft
---

## A controller is a bean with routes

```java
@RestController
@RequestMapping("/api/rows")
public class RowController {
    private final RowService service;

    public RowController(RowService service) {
        this.service = service;
    }

    @GetMapping("/{key}")
    public RowResponse get(@PathVariable String key) {
        return service.find(key)
                .map(RowResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RowResponse create(@RequestBody CreateRowRequest request) {
        return RowResponse.from(service.create(request));
    }
}
```

`@RestController` marks the class as a component and makes every method write its return value to the
response body. The class level `@RequestMapping` prefixes every route in it, so the paths stay in one place
and the method annotations are short.

## The three layers

| Layer | Holds |
| --- | --- |
| Controller | HTTP: paths, status codes, request and response shapes |
| Service | the rules, and the transaction boundary |
| Repository | the store |

The controller above translates a request into a call and a result into a response, and nothing else. It has
no `if` about the business, no SQL and no transaction. Keeping it that thin is what lets the service be tested
without HTTP and the controller be tested without a database.

```java
public record CreateRowRequest(String key, long value) { }

public record RowResponse(String key, long value) {
    static RowResponse from(Row row) {
        return new RowResponse(row.key(), row.value());
    }
}
```

The request and response are their own records rather than the entity or the domain type. That is the boundary
the JSON lesson expands on.

## Status codes

```java
@GetMapping
public List<RowResponse> list() {
    return service.all().stream().map(RowResponse::from).toList();
}

@DeleteMapping("/{key}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void delete(@PathVariable String key) {
    service.delete(key);
}
```

A `GET` that returns a body returns 200 by default, a `POST` that creates returns 201 with
`@ResponseStatus(HttpStatus.CREATED)`, and a `DELETE` with nothing to say returns 204. The default for a
successful call is 200, so only the exceptions need the annotation.

`ResponseStatusException` carries a status and a reason and is the shortest way to fail from a controller:

```java
.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no row: " + key));
```

It is convenient and it puts an HTTP concern in the controller, which is the right place. A service that
throws it instead has learned about HTTP, which is the coupling the layers are there to prevent. The error
handling page covers the alternative.

## ResponseEntity when the status is part of the value

```java
@PostMapping
public ResponseEntity<RowResponse> create(@RequestBody CreateRowRequest request) {
    RowResponse created = RowResponse.from(service.create(request));

    return ResponseEntity.created(URI.create("/api/rows/" + created.key())).body(created);
}
```

`ResponseEntity` wraps a body with a status and headers, which is what a 201 with a `Location` header needs.
Where the status is always the same, `@ResponseStatus` on the method is shorter and reads better.

## Check it with curl

```bash
curl -i -X POST localhost:8080/api/rows \
  -H 'Content-Type: application/json' \
  -d '{"key":"report.csv","value":128}'
```

```text
HTTP/1.1 201 Created
Location: /api/rows/report.csv
Content-Type: application/json

{"key":"report.csv","value":128}
```

The `-i` flag prints the response headers, which is how you check a status code and a `Location` without a
client. The header is worth reading on every request while a service is new, because content type and status
are where the surprises are.

## Check yourself

Write a controller with three routes: one that returns a body, one that creates and returns 201, and one that
deletes and returns 204. Call all three with `curl -i` and check the status and the content type on each.
