---
title: Validating request bodies
summary: Declarative constraints on a request, the failure shape they produce, and the checks that belong in the domain instead.
chapter: HTTP with Spring MVC
minutes: 13
status: draft
---

## Annotate the request and ask for validation

```java
public record CreateRowRequest(
        @NotBlank @Size(max = 128) String key,
        @PositiveOrZero long value,
        @NotNull @PastOrPresent Instant at) {
}

@PostMapping
public RowResponse create(@Valid @RequestBody CreateRowRequest request) {
    return RowResponse.from(service.create(request));
}
```

`jakarta.validation` annotations declare the rule, and `@Valid` on the parameter makes the framework check it
before the method runs. A request that fails never reaches the body, so the method can assume the values are
sane.

The starter is `spring-boot-starter-validation`. Without it the annotations are present and nothing reads
them, which is the failure mode worth recognising: a request that is accepted with an empty key and no error
message anywhere.

## The constraints worth knowing

| Annotation | Applies to |
| --- | --- |
| `@NotNull`, `@Null` | any type |
| `@NotBlank`, `@NotEmpty`, `@Size` | text and collections |
| `@Min`, `@Max`, `@Positive`, `@PositiveOrZero` | numbers |
| `@DecimalMin`, `@Digits` | `BigDecimal` |
| `@Email`, `@Pattern` | text |
| `@Past`, `@PastOrPresent`, `@Future` | date and time types |
| `@Valid` | a nested object, to validate it in turn |

`@NotBlank` rejects null, empty and whitespace only, and `@NotEmpty` rejects null and empty but accepts a space
as a value. Choosing the one that matches the rule is worth a second's thought, since `"   "` as a key is a
bug that shows up in a report later.

## Nested and repeated values

```java
public record CreateRowsRequest(
        @NotEmpty @Size(max = 1000) List<@Valid CreateRowRequest> rows) {
}
```

`@Valid` on the element type validates every entry, and the failure names the index, which is what makes a
bulk endpoint usable. The `@Size` bound on the list is the guard against a body with a million rows.

## What a failure looks like

```text
POST /api/rows
{"key":"","value":-1}
```

```text
HTTP/1.1 400 Bad Request
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid request content.",
  "instance": "/api/rows",
  "errors": {
    "key": "must not be blank",
    "value": "must be greater than or equal to 0"
  }
}
```

The `errors` map is not in the default response; it is what the error handling page adds so a client can put
each message beside the right field. Without it the client gets one message for the whole body, which is not
enough for a form.

## Enable problem details

```yaml
spring:
  mvc:
    problemdetails:
      enabled: true
```

That setting makes the framework answer a validation failure with a `ProblemDetail` body and the
`application/problem+json` content type, which is the format the error page builds on. Setting it once at the
start saves a rewrite later.

## A path variable is not validated by @Valid

```java
@GetMapping("/{key}")
public RowResponse get(@PathVariable @Size(min = 1, max = 128) String key) { }
```

A constraint on a `@PathVariable` needs `@Validated` on the controller class, and the failure arrives as a
`ConstraintViolationException` rather than as `MethodArgumentNotValidException`. That difference matters for
the error handler, which has to catch both to produce one shape.

```java
@RestController
@Validated
public class RowController { }
```

## A custom constraint

```java
@Constraint(validatedBy = IsbnValidator.class)
@Target({ ElementType.FIELD, ElementType.PARAMETER })
@Retention(RetentionPolicy.RUNTIME)
public @interface Isbn {
    String message() default "not a valid ISBN";
    Class<?>[] groups() default { };
    Class<? extends Payload>[] payload() default { };
}

public class IsbnValidator implements ConstraintValidator<Isbn, String> {
    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        return value != null && value.replace("-", "").matches("[0-9]{13}");
    }
}
```

Three methods and an annotation are the whole cost of a rule that reads as a word in the request record. That
is worth it once a format check appears in three places, and it is overkill for a rule used once.

## Validate the shape, not the business

Validation at the boundary checks that the request is well formed: a key is present, a number is positive, a
date is in the past. It cannot check that the key is unique or that the account has funds, because those
depend on state and belong in the service, where a violation becomes a typed exception with its own status.

Do not treat a validation annotation as the only check either. A message that arrives from a queue, a
scheduled job or another service never passes through the controller, so the constructor of the domain type
still enforces its own invariants. The annotation protects the endpoint; the constructor protects the type.

## Check yourself

Add three constraints to a request record, call the endpoint with an invalid body, and read the response. Then
put a constraint on a path variable, add `@Validated` to the controller, and confirm the failure arrives as a
different exception type.
