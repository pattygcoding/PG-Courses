---
title: Unit tests with JUnit 5
summary: The annotations that make a test, the assertions worth using, and the lifecycle around one.
chapter: Testing and quality
minutes: 13
status: draft
---

## A test is a method with an annotation

```java
class CsvParserTest {
    private final CsvParser parser = new CsvParser();

    @Test
    void parsesAKeyAndValue() {
        Row row = parser.parse("report.csv,128");

        assertEquals("report.csv", row.key());
        assertEquals(128L, row.value());
    }

    @Test
    @DisplayName("rejects a line with no comma")
    void rejectsALineWithNoComma() {
        assertThrows(InvalidRecordException.class, () -> parser.parse("report"));
    }
}
```

JUnit 5 discovers a non-static method annotated `@Test` in a class in the test source tree. The class and the
methods may be package-private, which is the convention and one fewer keyword to read. `@DisplayName`
replaces the method name in the report and is worth using where the method name cannot be a sentence.

The dependency pair is `junit-jupiter` for the API and `junit-platform-launcher` at test runtime, and Gradle
needs `useJUnitPlatform()` for the runner to pick them up.

## Assertions

```java
assertEquals(expected, actual);                        // equals
assertEquals(128L, row.value(), "value");
assertNotEquals(0L, row.value());

assertTrue(rows.isEmpty());
assertNull(found);
assertSame(parser, service.parser());                  // reference identity

assertThrows(IllegalArgumentException.class, () -> new Row("", -1));
assertDoesNotThrow(() -> parser.parse("a,1"));
```

`assertEquals` uses `equals`, and `assertSame` checks that two references point at one object, which is the
distinction between "the same value" and "the same object". One is not a substitute for the other, and a test
that meant the second and wrote the first passes for the wrong reason.

`assertThrows` returns the exception, so the message can be checked as well, which catches a test that passes
because a different failure was thrown:

```java
InvalidRecordException failure = assertThrows(
        InvalidRecordException.class, () -> parser.parse("bad"));

assertTrue(failure.getMessage().contains("line 1"));
```

`assertAll` runs several assertions and reports every failure rather than stopping at the first, which saves
a round of fix and rerun when one change breaks three things:

```java
assertAll(
        () -> assertEquals("a", row.key()),
        () -> assertEquals(1L, row.value()),
        () -> assertNotNull(row.at()));
```

## Lifecycle

```java
class ReportTest {
    private Path tempFile;

    @BeforeEach
    void setUp() throws IOException {
        tempFile = Files.createTempFile("report", ".csv");
    }

    @AfterEach
    void tearDown() throws IOException {
        Files.deleteIfExists(tempFile);
    }

    @Test
    void readsTheHeader() { }
}
```

`@BeforeEach` and `@AfterEach` run around every test, and `@BeforeAll` and `@AfterAll` run once around the
class and must be static unless the class is annotated `@TestInstance(PER_CLASS)`. The default is a fresh
instance per test, so a field cannot carry state from one test to the next and the tests stay independent
whatever order they run in.

That default is what makes a test that passes alone and fails in a suite a real bug rather than a test
problem, since nothing is shared. Where state is genuinely shared, such as a database in a container, it is
shared on purpose through a static field or an extension.

## Skipping and tagging

```java
@Test
@Disabled("needs a network connection")
void fetchesTheSchema() { }

@Test
@Tag("slow")
void rebuildsTheIndex() { }

@Test
void needsTheRightPlatform() {
    assumeTrue(System.getProperty("os.name").startsWith("Windows"));
}
```

`@Disabled` records that a test is not running and why. A tag lets the build include or exclude a group.
`assumeTrue` aborts the test rather than failing it, which is the right answer for an environment the test
cannot control.

## Check yourself

Write a test class with a setup method that creates a temporary file, one test that reads from it, and one
that asserts an exception with a message check. Then split one test into three assertions inside `assertAll`
and see how many failures the report shows.
