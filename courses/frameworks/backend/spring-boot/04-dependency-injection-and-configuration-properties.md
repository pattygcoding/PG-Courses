---
title: Dependency injection and configuration properties
summary: Constructor injection, the wiring the container can check, and typed settings from any source.
chapter: Getting started
minutes: 13
status: draft
---

## Constructor injection

```java
@Service
public class ReportService {
    private final RowStore store;
    private final Clock clock;

    public ReportService(RowStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }
}
```

A single constructor needs no `@Autowired`, since there is nothing to choose. The fields are `final`, so the
object cannot exist in a half-initialised state, and the test constructs it the same way the container does:

```java
var service = new ReportService(new InMemoryRows(), Clock.fixed(instant, ZoneOffset.UTC));
```

That is the argument for constructor injection over the alternatives. Field injection hides the dependencies
where a reader cannot see them and makes the class impossible to construct in a plain test, which pushes every
test into a full application context.

```java
@Service
public class ReportService {
    @Autowired
    private RowStore store;            // avoid
}
```

Use setter injection for a genuinely optional dependency, and constructor injection for everything else.

## Circular dependencies are a design signal

```text
The dependencies of some of the beans in the application context form a cycle
```

Two services that need each other cannot both be constructed first. The workarounds are `@Lazy` on one side or
moving to setter injection, and both hide a design problem rather than fixing it. The fix is to move the shared
behaviour into a third bean that both depend on, which is nearly always what the two were reaching for.

## Typed configuration properties

```java
@ConfigurationProperties(prefix = "tool.report")
public record ReportProperties(
        Duration timeout,
        int batchSize,
        List<String> columns) {
}
```

```yaml
tool:
  report:
    timeout: 30s
    batch-size: 500
    columns:
      - key
      - value
```

The property name is `tool.report.batch-size` in the file and `batchSize` in the record, because of relaxed
binding: kebab case, camel case and underscores all bind to the same field, and an environment variable
`TOOL_REPORT_BATCH_SIZE` does too. That is what lets the same class read a settings file in development and
environment variables in a container.

```java
@SpringBootApplication
@ConfigurationPropertiesScan
public class ToolApplication { }
```

`@ConfigurationPropertiesScan` finds every properties class, which is shorter than listing them. Adding
`spring-boot-configuration-processor` as an annotation processor generates the metadata the IDE uses to
complete and validate the names.

## Validate settings at startup

```java
@ConfigurationProperties(prefix = "tool.report")
@Validated
public record ReportProperties(
        @NotNull Duration timeout,
        @Min(1) @Max(10_000) int batchSize,
        @NotEmpty List<String> columns) {
}
```

A missing or absurd value fails the start with the property name and the constraint, rather than behaving
strangely at three in the morning. That is the main reason to bind settings into a typed object: the checks
run once, at a point where a failure is cheap.

A record is bound through its constructor, which is the modern form. `Duration` and `DataSize` are bound from
strings such as `30s` and `10MB`, and an enum binds from its name, which keeps the file readable.

## The settings that come with Boot

```yaml
server:
  port: 8080
  shutdown: graceful

spring:
  application:
    name: tool
  datasource:
    url: jdbc:postgresql://localhost:5432/tool

logging:
  level:
    com.example.tool: DEBUG
    org.hibernate.SQL: DEBUG

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

Every one of those is read by an auto-configurer that already exists. Knowing the handful of namespaces saves
writing a class: `server` for the container, `spring` for the framework, `logging` for the levels,
`management` for the actuator, and `spring.datasource` for the pool.

## Where a value comes from

Boot reads properties from several places and the later ones win:

1. `application.properties` or `application.yml` on the classpath.
2. A profile specific file, such as `application-prod.yml`.
3. Environment variables and system properties.
4. Command line arguments.
5. A `@TestPropertySource` or `properties` attribute in a test.

Knowing the order is what makes a container deployment predictable: an environment variable overrides the
file in the image without a rebuild, which is how one image is configured per environment.

## Check yourself

Bind three settings into a record with validation, set them in `application.yml`, and start the application.
Then set one as an environment variable, confirm it overrides the file, and remove a required value to read
the start-up failure.
