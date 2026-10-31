---
title: The standard library and how to read the API docs
summary: Where the useful parts live, and how to find the contract a method actually promises.
chapter: Getting started
minutes: 12
status: draft
---

## The packages worth knowing by name

| Package | What is in it |
| --- | --- |
| `java.lang` | `Object`, `String`, `Math`, `Integer`, `System`, `Thread`, imported automatically |
| `java.util` | collections, `Optional`, `Objects`, `Calendar` replacement types |
| `java.util.stream` | `Stream`, `Collectors`, the pipeline types |
| `java.util.function` | `Function`, `Predicate`, `Supplier`, `Consumer` and their friends |
| `java.time` | `Instant`, `LocalDate`, `Duration`, `ZoneId` |
| `java.nio.file` | `Path`, `Files`, `Paths` |
| `java.math` | `BigDecimal`, `BigInteger` |
| `java.util.concurrent` | executors, futures, concurrent collections, atomics |

Everything else is either a specific job (`java.util.regex`, `java.text`, `java.net`) or the module
system's own plumbing. A surprising amount of what people install a library for is already here:
`HttpClient` since 11, `Base64` and `HexFormat`, a JSON-free `Properties` reader, and a date and time
library that made its predecessor obsolete.

## The documentation is generated from the source

`javadoc` turns the comments into a site, and the official API documentation is that site for the JDK.
Each class page has the same shape: a class description, a field summary, a constructor summary, a method
summary, and then the detail for each member.

```java
/**
 * Returns an immutable list containing the given elements.
 *
 * @param elements the elements to include
 * @return a list containing {@code elements}
 * @throws NullPointerException if the array or any element is null
 * @since 9
 */
```

Four things in that comment decide how you use the method: immutable, which means a later
`list.add(...)` throws, `@throws`, which names a failure the signature does not, and `@since`, which
tells you the minimum release.

## The contract is in the prose

The type signature rarely carries the whole promise, so read the description:

- "The returned list is immutable" versus "a new list you may modify".
- "This implementation is not thread safe" versus "safe for concurrent use".
- "The order of the elements is unspecified", which means a test asserting an order is a future failure.
- "May return null", which means you have a null check to write.

That prose is the specification. A method that returns a `List` and documents no mutability is telling
you not to assume either way.

## Deprecation is information

```java
@Deprecated(since = "9", forRemoval = true)
public Date getDate() { }
```

`forRemoval = true` means the method is scheduled to disappear and a new project should not call it.
Without it, the method is discouraged but supported. Either way the description usually names the
replacement, and taking that advice while the code is small is far cheaper than after it spreads.

## Finding things without a search engine

The API index page lists every class and every method alphabetically. On a large project, `javap` prints
the members of a compiled class:

```bash
javap -p -classpath out/classes com.example.tool.Tool
```

The IDE's completion is the same information with a tooltip, and it is the fastest of the three when it
is available. What matters is having a way to answer "what does this method do" without guessing from its
name.

## Check yourself

Open the `List` page in the API documentation and find three methods whose description contains a
constraint the signature does not show. Then rewrite one of your own methods and document what happens
when it receives a null.
