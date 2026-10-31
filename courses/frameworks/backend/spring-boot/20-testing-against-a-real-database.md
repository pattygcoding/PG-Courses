---
title: Testing against a real database
summary: Why an embedded database is a poor stand-in, and the container that makes the real one cheap.
chapter: Observability and testing
minutes: 13
status: draft
---

## H2 is not PostgreSQL

`@DataJpaTest` uses an embedded database by default, and it is a different product. The differences that bite
are the ones nobody thinks about:

- Types and functions. `jsonb`, `timestamptz`, `text[]`, window functions and `on conflict` are PostgreSQL.
- SQL that a migration uses. A `create table` with a vendor specific clause fails or silently differs.
- The query planner. A missing index is invisible in a table with three rows.
- The migrations. Flyway runs against the real dialect, which is where a mistake in one is caught.

A test suite that passes on H2 and fails on the first deploy has done nothing. The container removes the excuse.

## Testcontainers starts a real one

```groovy
testImplementation 'org.springframework.boot:spring-boot-testcontainers'
testImplementation 'org.testcontainers:postgresql'
testImplementation 'org.testcontainers:junit-jupiter'
```

```java
@SpringBootTest
@Testcontainers
class RowRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    RowRepository repository;

    @Test
    void findsByKey() {
        repository.save(new RowEntity("a", 1, Level.NORMAL));

        assertThat(repository.findByKey("a")).isPresent();
    }
}
```

`@ServiceConnection` reads the container's random port and credentials and configures the `DataSource` from
them, which replaces the `@DynamicPropertySource` block that used to hold three property names. The container is
`static` so it starts once for the class and is reused by every test in it.

## One container for the whole run

```java
public abstract class DatabaseTest {

    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
```

A container per test class starts a database per test class, and each start is a second or two. Starting one for
the whole JVM and sharing it through a base class, with a per-test cleanup, is what keeps the suite usable.

```java
@BeforeEach
void clean() {
    repository.deleteAll();
}
```

With `@Transactional` on the test class, each test rolls back instead, which is faster and only breaks when the
code under test uses `REQUIRES_NEW` or the assertion needs committed data.

## Flyway runs against the container

Because the context starts against the real database, the migrations apply during the test run, which turns a
broken migration into a failing test rather than a failed deploy. That covers the mistake that H2 hides, and it
is the main reason to pay for the container.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

`validate` in the test profile makes the context fail when an entity and a migration disagree, so the test suite
checks the schema as well as the code.

## Fixtures with SQL

```java
@Test
@Sql("/fixtures/rows.sql")
void countsTheLargeRows() { }
```

```sql
insert into rows (key, value, level) values ('a', 2048, 'LOUD');
insert into rows (key, value, level) values ('b', 1, 'QUIET');
```

A file under `src/test/resources` inserts the data a test needs, which is more readable than a builder chain when
the fixture spans two tables and a foreign key. A test that inserts its own data is easier to understand a year
later, and the file has one job.

## Shared data versus isolated data

| Approach | Cost | Where it works |
| --- | --- | --- |
| Rollback per test | cheapest | a single threaded test of one transaction |
| Delete per test | one statement per table | anything that must commit |
| Unique data per test | nothing to clean | parallel test runs |

A suite that runs in parallel needs the third, since two tests deleting from the same table interfere. A key
built from a random value makes each test's data its own, and the cleanup becomes unnecessary.

## The cost, honestly

A container based test is a second or two of start-up plus a round trip per statement, against milliseconds for a
mock. That means the suite has two tiers: the fast tests over services with fakes, which run on every save, and
the database tests, which run on every push. Docker is a requirement in continuous integration, and a runner
without it needs the one test category skipped rather than the whole suite.

## Check yourself

Point `@DataJpaTest` at a PostgreSQL container with `@ServiceConnection`, run one repository test, and confirm
Flyway applied the migrations. Then add a test that asserts on a PostgreSQL specific type and check that it would
have passed on H2 for the wrong reason.
