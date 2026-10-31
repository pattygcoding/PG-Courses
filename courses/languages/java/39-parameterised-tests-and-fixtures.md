---
title: Parameterised tests and fixtures
summary: One test with a table of cases, grouped tests with shared setup, and data that does not drift out of date.
chapter: Testing and quality
minutes: 13
status: draft
---

## A table of cases beats copied tests

```java
@ParameterizedTest
@CsvSource({
        "a,1",
        "report.csv,128",
        "  spaced  , 7",
})
void parsesAKeyAndValue(String input, long expected) {
    assertEquals(expected, parser.parse(input).value());
}
```

```java
@ParameterizedTest(name = "{0} is worth {1}")
@CsvSource({ "a,1", "bb,2" })
void countsCharacters(String input, int expected) {
    assertEquals(expected, input.length());
}
```

`@ParameterizedTest` replaces `@Test` and runs the body once per case. The `name` attribute puts the values
in the report, which is the difference between "the eighth case failed" and "spaced is worth 7 failed".

The sources worth knowing:

| Source | Supplies |
| --- | --- |
| `@ValueSource` | one argument from a list of literal values |
| `@CsvSource` | several arguments per case from a comma separated table |
| `@EnumSource` | one value per enum constant |
| `@MethodSource` | cases from a static method returning a stream |
| `@NullSource` and `@EmptySource` | the null case and the empty case |

`@MethodSource` is the one that handles a case that is not expressible as a string:

```java
static Stream<Arguments> windows() {
    return Stream.of(
            arguments(Instant.EPOCH, Instant.EPOCH),
            arguments(Instant.EPOCH, Instant.EPOCH.plusSeconds(60)));
}
```

## Group the tests that share setup

```java
class ParserTest {
    @Nested
    class WithValidInput {
        private final CsvParser parser = new CsvParser();

        @Test
        void readsTheKey() { }
    }

    @Nested
    class WithInvalidInput {
        private final CsvParser parser = new CsvParser();
        private final String input = "bad";

        @Test
        void fails() { }
    }
}
```

`@Nested` classes group tests under a heading in the report and each gets the lifecycle annotations it needs,
so the setup for one group does not run for another. It is also how a shared test method can accept a
different fixture per group.

## Builders keep test data readable

```java
static Row row(String key) {
    return new Row(key, 0, Instant.EPOCH);
}

static Row row(String key, long value) {
    return new Row(key, value, Instant.EPOCH);
}
```

Two overloads that fill in the fields a test does not care about mean adding a field to `Row` does not touch
twenty tests. The same idea at a larger scale is a builder, which the immutability page covers, and it earns
its place as soon as a type has more than about four fields.

## Temporary directories come from an extension

```java
@TempDir
Path tempDir;

@Test
void writesTheReport() throws IOException {
    Path target = tempDir.resolve("report.csv");
    Files.writeString(target, "a,1\n", StandardCharsets.UTF_8);

    assertTrue(Files.exists(target));
}
```

`@TempDir` on a field or a parameter creates a directory for the test and removes it afterwards, which is
more reliable than a fixed path under the build directory. A test that uses a fixed name fails when two runs
overlap, which happens the first time the build is parallel.

## Read test resources from the classpath

```java
try (InputStream in = getClass().getResourceAsStream("/sample.csv")) {
    assertNotNull(in, "sample.csv must be on the test classpath");
}
```

A file in `src/test/resources` is loaded from the classpath, so the test works whatever the working directory
is. A test that reads `"src/test/resources/sample.csv"` by relative path passes in the IDE and fails in
continuous integration, which is the most common form of this bug.

## Time is a dependency

```java
class ServiceTest {
    private final Clock fixed = Clock.fixed(Instant.parse("2024-03-01T00:00:00Z"), ZoneOffset.UTC);
    private final Service service = new Service(fixed);

    @Test
    void stampsTheRecord() {
        assertEquals(Instant.parse("2024-03-01T00:00:00Z"), service.create().at());
    }
}
```

Taking a `Clock` in the constructor makes the time in a test exact and instant. The alternatives, sleeping
until enough time has passed or asserting a range, make the suite slow and flaky, and the flakiness always
appears on a loaded build machine rather than on the developer's laptop.

## AssertJ for the complicated assertions

```java
assertThat(rows)
        .hasSize(3)
        .extracting(Row::key)
        .containsExactly("a", "b", "c");

assertThatThrownBy(() -> parser.parse("bad"))
        .isInstanceOf(InvalidRecordException.class)
        .hasMessageContaining("line 1");
```

AssertJ reports the whole collection when a fluent assertion fails, which is more useful than "expected true
but was false". `assertSoftly` collects several failures and reports them together, which is the same idea
as `assertAll` with a nicer syntax.

## Check yourself

Convert three copy and pasted tests into one `@ParameterizedTest` with a `@CsvSource`, and add a
`@MethodSource` case that cannot be a string. Add `@TempDir` to a test that writes a file and confirm the
directory is gone afterwards.
