---
title: Migrations and transactions
summary: The schema owned by versioned SQL files, and the boundary where a transaction begins and ends.
chapter: Data access
minutes: 14
status: draft
---

## Flyway owns the schema

```text
src/main/resources/db/migration/
  V1__create_rows.sql
  V2__add_level_to_rows.sql
  V3__index_rows_by_level.sql
  R__row_summary_view.sql
```

```sql
create table rows (
    id          bigserial primary key,
    key         varchar(128) not null unique,
    value       bigint not null,
    created_at  timestamptz not null default now()
);
```

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: none
  flyway:
    enabled: true
    locations: classpath:db/migration
```

A versioned file runs once, in order, and its checksum is recorded. Adding a file applies it on the next start,
and a file whose contents changed after it ran fails the start with the expected and the actual checksum. That
is the protection that stops a schema from differing between environments.

A repeatable file starts with `R__` and re-runs whenever its contents change, which is the right place for a
view or a stored function.

## Never edit a migration that has run

The checksum means an edit fails on every environment that already applied it, and the fix is a new file with a
new number. The temptation is strongest for a typo in a file applied to a developer's own database ten minutes
ago, and the cost is a conversation with whoever deployed it.

```yaml
spring:
  flyway:
    baseline-on-migrate: true
    out-of-order: false
```

`baseline-on-migrate` is for adopting Flyway in a database that already has tables, and it records a baseline
version rather than running everything. `out-of-order` allows a migration with a lower version to apply after a
higher one, which is what happens when two branches merge, and leaving it off is the safer default.

## ddl-auto belongs nowhere near production

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

`validate` makes Hibernate check that the schema matches the entities and fail the start when they disagree,
which catches a change to an entity that nobody wrote a migration for. `update` is the tempting setting and it
generates schema changes from the entities, which is how a column gets dropped or a type gets narrowed without
anyone deciding to. Use `create-drop` in a test slice and `validate` or `none` everywhere else.

## Where @Transactional goes

```java
@Service
public class RowService {
    private final RowRepository repository;

    @Transactional
    public Row create(CreateRowRequest request) {
        RowEntity entity = repository.save(new RowEntity(request.key(), request.value()));
        return toDomain(entity);
    }
}
```

On the public method of the service, which is the layer that owns a unit of work. Spring applies it with a
proxy, so the annotation on a private method, or on a method called from inside the same class, does nothing:

```java
public void outer() {
    inner();          // no transaction, the proxy is bypassed
}

@Transactional
public void inner() { }
```

That is the self-invocation trap, and the symptom is a transaction that logically should exist and does not.
Move `inner` to another bean, or call it through an injected self reference, or put the annotation on `outer`.

## Rollback rules

```java
@Transactional(rollbackFor = Exception.class)
public void importRows(List<Row> rows) throws IOException { }
```

An unchecked exception rolls the transaction back and a checked exception does not, which surprises people whose
methods declare `IOException`. `rollbackFor` names the exceptions that should, and `noRollbackFor` names one
that should not, such as a failure that is recorded and tolerated.

## Propagation

| Mode | Behaviour |
| --- | --- |
| `REQUIRED` | join the existing transaction or start one, the default |
| `REQUIRES_NEW` | suspend the current one and start a separate transaction |
| `SUPPORTS` | join if there is one, otherwise run without |
| `NOT_SUPPORTED` | suspend the current one and run without |
| `MANDATORY` | fail unless one already exists |
| `NEVER` | fail if one exists |

`REQUIRES_NEW` is the one worth knowing: it commits on its own, so an audit row written that way survives the
rollback of the transaction that triggered it. It also takes a second connection from the pool, so calling it
inside a loop is a way to exhaust the pool.

## Isolation and locking

```java
@Transactional(isolation = Isolation.READ_COMMITTED)
public void update(String key) { }
```

The default is the database's, and for PostgreSQL that is read committed. Raising it to repeatable read or
serializable reduces the anomalies and increases the retries, since a serializable transaction can be rolled
back by the database and retried by you.

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select r from RowEntity r where r.key = :key")
Optional<RowEntity> lockByKey(@Param("key") String key);
```

A pessimistic lock issues `select ... for update`, which blocks a second transaction until the first commits.
An optimistic lock is the `@Version` field, which lets both proceed and fails the second one at commit. The
choice is between waiting and retrying, and a service with occasional contention wants the retry.

```java
@Retryable(retryFor = OptimisticLockingFailureException.class, maxAttempts = 3)
```

Spring Retry on a method that can hit an optimistic lock failure turns a rare conflict into an invisible retry,
and it needs the operation to be safe to repeat.

## Keep transactions short

A transaction holds a connection, holds locks and delays vacuuming. Two rules keep it bounded: never make a
remote call inside one, and never hold one across anything the user is waiting on. Loading data, deciding,
writing and committing is a transaction; calling a payment provider is not part of it.

```java
@Transactional(readOnly = true)
public List<Row> all() { }
```

`readOnly = true` lets the provider skip dirty checking and lets the driver and the database optimise, and it is
worth putting on every read method as a habit.

## Check yourself

Write two migrations, one that creates a table and one that adds a column, and confirm both apply. Then edit the
first one and read the start-up failure. Finally write a method that calls another public method on the same
bean and confirm the inner transaction never starts.
