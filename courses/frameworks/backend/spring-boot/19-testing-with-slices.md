---
title: Testing with slices
summary: Starting part of the application instead of all of it, and what each slice leaves out.
chapter: Observability and testing
minutes: 13
status: draft
---

## Three scopes

| Test | Starts | Speed |
| --- | --- | --- |
| plain JUnit | nothing | milliseconds |
| a slice | one layer | tens of milliseconds |
| `@SpringBootTest` | the whole context | seconds |

Most tests should be plain JUnit over a service with fakes, which the language course covers. A slice is for the
layer that needs the framework: a controller needs the web layer to turn a request into a method call, and a
repository needs a database. The full context is for the wiring, and one or two of those is usually enough.

## A controller slice

```java
@WebMvcTest(RowController.class)
class RowControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    RowService service;

    @Test
    void returnsTheRow() throws Exception {
        when(service.find("report.csv")).thenReturn(Optional.of(new Row("report.csv", 128, Instant.EPOCH)));

        mockMvc.perform(get("/api/rows/report.csv"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("report.csv"))
                .andExpect(jsonPath("$.value").value(128));
    }

    @Test
    void rejectsAnInvalidBody() throws Exception {
        mockMvc.perform(post("/api/rows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"key\":\"\",\"value\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.key").exists());
    }
}
```

`@WebMvcTest` starts the web layer with the given controller and nothing else, so the service is a mock. That is
the point: the test checks the mapping, the validation, the serialisation and the status codes, which are the
controller's job, without a database.

`@MockitoBean` replaces a bean in the context. It was called `@MockBean` before Boot 3.4, and the old name is
deprecated rather than removed.

## What a slice does not include

```java
@WebMvcTest(RowController.class)
@Import(ApiErrorHandler.class)
class RowControllerAdviceTest { }
```

An error handler, a filter or a converter is not part of the slice unless it is imported. A test that expects a
problem details body from a validation failure fails until the advice class is imported, which is the correct
behaviour: the slice includes what it says it includes.

## Testing JSON on its own

```java
@JsonTest
class RowResponseTest {

    @Autowired
    JacksonTester<RowResponse> json;

    @Test
    void writesAnIsoTimestamp() throws Exception {
        RowResponse response = new RowResponse("a", 1, Instant.parse("2024-03-01T00:00:00Z"));

        assertThat(json.write(response)).hasJsonPathStringValue("@.at", "2024-03-01T00:00:00Z");
    }
}
```

`@JsonTest` starts only Jackson, which is what a serialisation rule deserves. Checking an ISO format or a
`NON_NULL` inclusion through a controller test works and takes longer to narrow down when it fails.

## A repository slice

```java
@DataJpaTest
class RowRepositoryTest {

    @Autowired
    RowRepository repository;

    @Test
    void findsByKey() {
        repository.save(new RowEntity("a", 1, Level.NORMAL));

        assertThat(repository.findByKey("a")).isPresent();
    }
}
```

`@DataJpaTest` configures the JPA components, an embedded database by default, and a transaction that rolls back
after each test. The next page replaces that embedded database with the real one, because an in-memory database
is a different database.

## The full context

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ToolApplicationTests {

    @Autowired
    TestRestTemplate rest;

    @Test
    void answersTheHealthCheck() {
        ResponseEntity<String> response = rest.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

`@SpringBootTest` starts the whole thing. `webEnvironment` decides whether a server runs: `MOCK` gives MockMvc
with no port, `RANDOM_PORT` starts a real server on a free port, and `NONE` is for a test that needs the context
without the web layer.

Two things make this category cheaper. The context is cached between test classes when the configuration is
identical, so a test that adds a property or a different mock creates a second context and a second start.
Keeping the annotations consistent across test classes is what keeps the suite fast.

```java
@TestConfiguration
class FixedClock {
    @Bean
    Clock clock() {
        return Clock.fixed(Instant.parse("2024-03-01T00:00:00Z"), ZoneOffset.UTC);
    }
}
```

A `@TestConfiguration` imported by one test class adds beans to the context without polluting the application,
which is the seam for anything that varies by test.

## Keep one test that starts everything

A slice cannot catch a bean that was never declared or a profile that has no value. One `@SpringBootTest` that
starts the application and calls one endpoint is worth its couple of seconds, because it fails on the wiring
mistakes that the fast tests are blind to.

## Check yourself

Write a `@WebMvcTest` for one controller with a mocked service, checking a happy path and a validation failure.
Then import the error handler and confirm the problem details body appears. Finish with one `@SpringBootTest` and
note the time each category takes.
