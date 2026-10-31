---
title: Error responses and problem details
summary: One error shape for the whole API, mapped from the exceptions the service already throws.
chapter: HTTP with Spring MVC
minutes: 14
status: draft
---

## The default is not an API contract

An unmapped failure in a Boot application produces this:

```json
{
  "timestamp": "2024-12-05T09:14:02.113Z",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/api/rows"
}
```

That shape comes from the framework's error controller, and the two problems with it are that a 404 for a
missing row looks nothing like a 404 from a validation failure, and that the shape is Boot's rather than
yours. An API wants one error format for every failure, with the fields a client can act on.

## Problem details is the standard

RFC 9457 defines a media type and five fields:

| Field | Meaning |
| --- | --- |
| `type` | a URI identifying the kind of problem |
| `title` | a short human readable summary |
| `status` | the HTTP status code, repeated |
| `detail` | what went wrong in this instance |
| `instance` | the URI of the request |

Anything else goes in extension members, which is where a per-field error map belongs.

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

That setting turns on the format for the failures the framework produces. The next step is to map your own
exceptions into it.

## One advice class

```java
@RestControllerAdvice
public class ApiErrorHandler {

    @ExceptionHandler(RowNotFoundException.class)
    public ProblemDetail onNotFound(RowNotFoundException failure, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, "no row with key " + failure.key());
        problem.setTitle("Row not found");
        problem.setProperty("key", failure.key());
        problem.setInstance(URI.create(request.getRequestURI()));

        return problem;
    }

    @ExceptionHandler(ConflictException.class)
    public ProblemDetail onConflict(ConflictException failure) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, failure.getMessage());
    }
}
```

A method per exception type, and the status is decided in one file that a reviewer can read rather than
scattered across controllers. The `@RestControllerAdvice` applies to every controller, so an endpoint added
later gets the same treatment with no code.

## Validation failures need a field map

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ProblemDetail onInvalidBody(MethodArgumentNotValidException failure) {
    Map<String, String> errors = new LinkedHashMap<>();

    for (FieldError error : failure.getBindingResult().getFieldErrors()) {
        errors.putIfAbsent(error.getField(), error.getDefaultMessage());
    }

    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "one or more fields are invalid");
    problem.setTitle("Validation failed");
    problem.setProperty("errors", errors);

    return problem;
}
```

`getFieldErrors` covers the body, and a constraint on a path variable arrives as a `ConstraintViolationException`
with a `PropertyPath` instead, so the handler catches both and builds the same map. Two methods, one shape.

```java
@ExceptionHandler(ConstraintViolationException.class)
public ProblemDetail onInvalidParameter(ConstraintViolationException failure) {
    Map<String, String> errors = new LinkedHashMap<>();

    for (ConstraintViolation<?> violation : failure.getConstraintViolations()) {
        errors.put(violation.getPropertyPath().toString(), violation.getMessage());
    }

    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.BAD_REQUEST, "one or more parameters are invalid");
    problem.setProperty("errors", errors);

    return problem;
}
```

## Extend the framework handler instead of replacing it

```java
@RestControllerAdvice
public class ApiErrorHandler extends ResponseEntityExceptionHandler {

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException failure,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "one or more fields are invalid");
        problem.setProperty("errors", fieldErrors(failure));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }
}
```

Extending `ResponseEntityExceptionHandler` keeps the framework's handling of the failures it already knows,
such as a malformed JSON body or an unsupported method, and lets you override only the ones you care about.
Declaring a plain `@ExceptionHandler` for `Exception` instead swallows every failure including the ones the
framework was handling well.

## Do not leak the inside

```java
@ExceptionHandler(Exception.class)
public ProblemDetail onUnexpected(Exception failure) {
    String reference = UUID.randomUUID().toString();
    log.error("unhandled failure, reference {}", reference, failure);

    ProblemDetail problem = ProblemDetail.forStatusAndDetail(
            HttpStatus.INTERNAL_SERVER_ERROR, "the request could not be completed");
    problem.setProperty("reference", reference);

    return problem;
}
```

The client gets a reference and a sentence, and the log has the stack trace with the same reference. Sending
the exception message or a stack trace to a caller tells an attacker about the internals, and it changes
whenever a dependency is upgraded, which breaks whatever was parsing it.

## Log at the right level

A 400 is a client mistake and belongs at INFO or not at all, a 404 on a lookup is normal traffic, and a 500 is
an error worth waking someone for. Logging every 4xx at ERROR is how an alert stops meaning anything.

```java
log.warn("rejected request: {}", failure.getMessage());              // 4xx
log.error("unhandled failure, reference {}", reference, failure);    // 5xx
```

## Check yourself

Map two of your own exception types to statuses in one advice class, add the field map for validation, and
cause each failure with `curl -i`. Then check that the 500 handler returns a reference and that the stack
trace appears in the log with the same value.
