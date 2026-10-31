---
title: The application context and beans
summary: What the container does with your classes, the stereotypes that make them beans, and the moment each one is built.
chapter: Getting started
minutes: 13
status: draft
---

## A bean is an object the container owns

```java
@Service
public class ReportService {
    private final RowStore store;

    public ReportService(RowStore store) {
        this.store = store;
    }
}
```

`@Service` marks the class for the component scan, and the container constructs it, supplies the `RowStore`
it needs and keeps the one instance for the life of the application. Anything you would have written as
`new ReportService(new JdbcRowStore(dataSource))` in a `main` method is now decided by the container.

## The stereotype annotations

| Annotation | Use for |
| --- | --- |
| `@Component` | anything with no more specific role |
| `@Service` | the layer with the rules |
| `@Repository` | the layer that talks to a store, and it translates exceptions too |
| `@Controller` | a web component that returns a view |
| `@RestController` | a web component that returns a body |
| `@Configuration` | a class whose methods declare beans |

They all mark a class as a component, so the choice is documentation rather than behaviour, with two
exceptions: `@Repository` adds exception translation, and `@RestController` combines `@Controller` with
`@ResponseBody`.

## @Bean for what you do not own

```java
@Configuration
public class ClockConfiguration {
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    @Bean
    ObjectMapper objectMapper() {
        return JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();
    }
}
```

A `@Bean` method declares an object you cannot annotate, such as a type from a library or the JDK. The method
name is the bean name, and the returned object is the one every other bean receives. This is the seam that
makes the container worth using in tests: a `Clock` bean is replaced by a fixed one with no change to the
class under test.

```java
@Bean
RowStore rowStore(DataSource dataSource) {
    return new JdbcRowStore(dataSource);
}
```

A `@Bean` method may take parameters, and the container supplies them from its own beans. That is how a
configuration class wires together the objects it declares.

## When the container builds them

Singleton beans are built when the context refreshes, which happens before the application is ready and after
the server is bound to its port. A missing dependency is reported at that point, with the chain of beans that
needed it, which is why a start-up failure names the bean rather than the class you were editing.

```text
Parameter 0 of constructor in com.example.tool.ReportService required a bean of type
'com.example.tool.RowStore' that could not be found.
```

That message names the parameter, the class and the missing type. The usual causes are a class outside the
scan package, a missing stereotype annotation, and an interface with no implementation declared.

## Lazy and eager

```java
@Bean
@Lazy
SlowClient slowClient() {
    return new SlowClient();
}
```

A bean is created at startup by default, which means a broken one fails the start rather than the first
request. `@Lazy` delays construction until it is first needed, which is worth it for something expensive and
rarely used and harmful for anything whose failure you want to find early. A start that takes thirty seconds
is usually a pile of eager beans doing network calls.

## Scopes

| Scope | Lifetime |
| --- | --- |
| `singleton` | one per context, the default |
| `prototype` | a new instance per request for the bean |
| `request` | one per HTTP request |
| `session` | one per HTTP session |

A singleton is shared by every thread that uses it, so it must be stateless or thread safe. That is the single
most important consequence of the container model: a field on a `@Service` holding request data is a bug that
appears under load, and the compiler says nothing.

```java
@Service
public class ReportService {
    private final RowStore store;      // fine, an immutable collaborator
}
```

## Overriding and naming

```java
@Service("csvStore")
public class CsvRowStore implements RowStore { }

@Bean("jsonStore")
RowStore jsonStore() { }
```

When two beans implement the same interface, the container needs to know which one to inject. Giving one a
name and using `@Qualifier("csvStore")` at the injection point is the explicit way, and marking one
`@Primary` is the way to change the default. Two implementations and no `@Primary` is a start-up failure
naming both candidates, which is better than a silent choice.

## Check yourself

Add a `Clock` bean in a configuration class, inject it into a service, and confirm the service uses it. Then
delete the `@Service` annotation and read the start-up failure, noting which parts of the message name the
problem.
