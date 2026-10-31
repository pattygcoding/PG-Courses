---
title: JSON, records and the boundary types
summary: What serialises, what should not, and the handful of annotations worth knowing.
chapter: HTTP with Spring MVC
minutes: 13
status: draft
---

## Jackson is configured for you

Boot creates an `ObjectMapper` from the Jackson dependency the web starter brings, and configures it: the
date and time module is registered, dates write as ISO 8601 strings rather than numbers, and an unknown
property in a request body is ignored rather than rejected.

```yaml
spring:
  jackson:
    property-naming-strategy: SNAKE_CASE
    serialization:
      indent-output: false
    default-property-inclusion: non_null
```

Each setting has a bean equivalent, and a `Jackson2ObjectMapperBuilderCustomizer` or your own `ObjectMapper`
bean is the way to change something the properties do not cover.

## Records serialise with no annotation

```java
public record RowResponse(String key, long value, Instant at) {
}
```

```json
{"key":"report.csv","value":128,"at":"2024-12-05T09:14:02.113Z"}
```

A record's accessors match its component names, so Jackson writes and reads it with no help. That is the
shortest correct DTO in the language, and it is why a Boot 3 codebase is full of them.

## Never serialise an entity

```java
@Entity
public class RowEntity {
    @Id private Long id;
    private String key;

    @ManyToOne(fetch = FetchType.LAZY)
    private AccountEntity account;
}
```

Returning that class from a controller produces one of three failures: a `LazyInitializationException` when
the serializer touches a lazy association outside the transaction, an infinite loop when two entities
reference each other, and a JSON document shaped like the database rather than like the API. It also couples
the wire format to the schema, so renaming a column becomes a breaking API change.

```java
public record RowResponse(String key, long value) {
    static RowResponse from(Row row) {
        return new RowResponse(row.key(), row.value());
    }
}
```

Three types instead of one: the entity for the database, the domain type for the rules, and the response
record for the wire. Each one changes for its own reason.

## The annotations worth knowing

```java
public record RowResponse(
        @JsonProperty("id") String key,
        @JsonInclude(JsonInclude.Include.NON_NULL) String note,
        @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd") LocalDate createdOn,
        @JsonIgnore long internalCounter) {
}
```

| Annotation | Effect |
| --- | --- |
| `@JsonProperty` | renames a field on the wire |
| `@JsonIgnore` | keeps a field out of both directions |
| `@JsonIgnoreProperties` | the class level version, for a list |
| `@JsonInclude` | omits a null, an empty value or a default |
| `@JsonFormat` | patterns a date, a time or a number |
| `@JsonAlias` | accepts an extra name when reading |

`@JsonInclude(NON_NULL)` on a class is how a partial update stops sending `"note": null` for fields the client
never mentioned, which a client cannot tell apart from an explicit null.

## Enums and value types

```java
public enum Level {
    QUIET(0),
    LOUD(1);

    private final int code;

    Level(int code) {
        this.code = code;
    }

    @JsonValue
    public int code() {
        return code;
    }

    @JsonCreator
    public static Level of(int code) {
        return code == 0 ? QUIET : LOUD;
    }
}
```

By default an enum serialises as its name, which is stable and readable and changes if someone renames the
constant. `@JsonValue` writes the code instead, and the matching `@JsonCreator` reads it back, which is what
an external contract wants.

A domain wrapper such as an account identifier turns into an object unless you say otherwise:

```java
public record AccountId(@JsonValue String value) {
    public AccountId {
        Objects.requireNonNull(value, "value");
    }
}
```

The `@JsonValue` on the component writes the bare string, so the identifier appears as a string in JSON and is
still a distinct type in the code.

## Money and dates on the wire

```java
public record Payment(String currency, BigDecimal amount) {
}
```

```json
{"currency":"GBP","amount":19.99}
```

Jackson writes a `BigDecimal` as a JSON number, the client parses it as a floating point value, and the value
comes back as 19.989999999999998. Sending money as a string is the fix:

```java
@JsonFormat(shape = JsonFormat.Shape.STRING)
BigDecimal amount
```

Writing an `Instant` as an ISO string is the default in Boot 3, and it is worth checking because a timestamp
written as a number of seconds is a format the client has to know about. Use `Instant` for a point in time and
`LocalDate` for a date a person reads, and avoid the old `Date` and `Calendar` types in a DTO.

## Do not build JSON by hand

```java
String body = "{\"key\":\"" + key + "\"}";       // escape problems and injection
```

A key containing a quote or a newline produces invalid JSON, and a key containing crafted text produces
something the client misreads. Let the serialiser escape it, which it does correctly and you will not.

## Check yourself

Return a record with a `BigDecimal`, an `Instant` and a nullable field, and read the JSON. Turn on
`NON_NULL` inclusion and compare, then change one field name with `@JsonProperty` and confirm the wire format
changed while the Java code did not.
