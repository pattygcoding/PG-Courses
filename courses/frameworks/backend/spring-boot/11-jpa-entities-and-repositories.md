---
title: JPA entities and repositories
summary: Mapping a table to a type, the repository that writes the queries for you, and the methods it derives from a name.
chapter: Data access
minutes: 14
status: draft
---

## An entity is a mapped class

```java
@Entity
@Table(name = "rows")
public class RowEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 128)
    private String key;

    @Column(nullable = false)
    private long value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level;

    @Version
    private long version;

    protected RowEntity() {
    }

    public RowEntity(String key, long value, Level level) {
        this.key = key;
        this.value = value;
        this.level = level;
    }
}
```

A no-argument constructor is required, and making it `protected` keeps it out of your API while the provider
can still use it. The fields are private and the class exposes what the application needs, which is the same
rule as any other type.

`@Enumerated(EnumType.STRING)` stores the enum by name. The default stores the ordinal, so reordering the
constants rewrites the meaning of every existing row, which is a bug nobody sees until the data is wrong.

`@Version` gives optimistic locking: every update includes the version in its `where` clause, and a concurrent
update finds no row and fails instead of overwriting. The transactions page covers what to do with that
failure.

## The repository interface

```java
public interface RowRepository extends JpaRepository<RowEntity, Long> {
    Optional<RowEntity> findByKey(String key);

    List<RowEntity> findByLevelAndValueGreaterThan(Level level, long value);

    boolean existsByKey(String key);

    long deleteByKey(String key);

    Page<RowEntity> findByLevel(Level level, Pageable pageable);
}
```

Spring Data implements the interface at start-up. A method name is parsed into a query using the property
names, so `findByKey` becomes `select ... where key = ?`, and `And`, `Or`, `GreaterThan`, `Containing`,
`IgnoreCase`, `OrderBy` and `In` are all part of the grammar. Nothing here is SQL, and a name that cannot be
parsed fails the start with the property it did not recognise.

```java
List<RowEntity> rows = repository.findAll(Sort.by("key").descending());
```

`findAll`, `findById`, `save`, `saveAll`, `deleteById`, `count` and the paging variants come from
`JpaRepository` for nothing.

## A query when the name gets long

```java
public interface RowRepository extends JpaRepository<RowEntity, Long> {
    @Query("select r from RowEntity r where r.value > :threshold order by r.value desc")
    List<RowEntity> largerThan(@Param("threshold") long threshold);

    @Query(value = "select * from rows where key like :prefix || '%'", nativeQuery = true)
    List<RowEntity> byPrefix(@Param("prefix") String prefix);
}
```

JPQL names entities and fields rather than tables and columns, so it survives a rename of a column and fails at
start-up when a field is renamed. A native query is SQL, which is what a database-specific function or an
unusual join needs, at the cost of the portability and the check.

## The persistence context is a cache and a change log

```java
@Transactional
public void rename(String key, String next) {
    RowEntity row = repository.findByKey(key).orElseThrow();
    row.setKey(next);                      // no save call
}
```

An entity loaded inside a transaction is tracked. Changing a field marks it dirty, and the provider writes an
`update` when the transaction commits, which is called dirty checking. `save` is needed for a new entity and
is harmless for an existing one, though it takes a different path internally.

The context is also a first-level cache: loading the same row twice in one transaction issues one query, and
both references are the same object. That is why a change made through one reference is visible through the
other, and why a query run after a bulk statement does not see the change that statement made.

## Projections avoid loading a whole entity

```java
public interface RowSummary {
    String getKey();
    long getValue();
}
```

```java
public interface RowRepository extends JpaRepository<RowEntity, Long> {
    List<RowSummary> findByLevel(Level level);
}
```

An interface with getters that match the selected columns makes Spring Data build a query for those columns
only. A record works with an explicit query:

```java
@Query("select new com.example.tool.RowSummary(r.key, r.value) from RowEntity r where r.level = :level")
List<RowSummary> summaries(@Param("level") Level level);
```

Either form avoids loading the entity graph, which is the difference between one query returning three columns
and a hundred queries returning everything.

## Value objects inside an entity

```java
@Embeddable
public record Money(String currency, BigDecimal amount) {
}
```

```java
@Embedded
private Money price;
```

An `@Embeddable` record maps a small value type onto columns in the same table, so a domain concept survives
the trip through the database without its own table or an identifier. A composite key is the other use, with
`@EmbeddedId`.

## Auditing timestamps

```java
@EntityListeners(AuditingEntityListener.class)
@Entity
public class RowEntity {
    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

```java
@SpringBootApplication
@EnableJpaAuditing
public class ToolApplication { }
```

Those two fields are then filled on insert and update from the clock the auditing configuration uses, which in
a test can be a fixed one. Writing them by hand in every service is the alternative, and it is the kind of
detail that gets missed on one code path.

## Keep the entity and the domain type apart

An entity is shaped by the database: it needs an identifier, a version and a no-argument constructor, and its
associations exist to be navigated. A domain type is shaped by the rules. Using the entity everywhere means the
domain learns about the schema, and a change to a column reaches into the business logic.

The trade is real and worth naming. A separate domain type is more code and a mapping in each direction. For a
service with ten tables and simple rules, using the entity as the domain type is defensible and the mapping
would be ceremony. For anything with real rules, the mapping is what keeps the schema changeable.

```java
static Row toDomain(RowEntity entity) {
    return new Row(entity.getKey(), entity.getValue(), entity.getLevel());
}
```

One method per direction, in the repository, and the rest of the application never sees the entity.

## Check yourself

Write an entity with an enum, a version and an audit timestamp, and a repository with one derived query and one
annotated query. Change a field inside a `@Transactional` method without calling `save` and confirm the update
appears in the SQL log. Then add a projection and compare the SQL it sends with the entity version.
