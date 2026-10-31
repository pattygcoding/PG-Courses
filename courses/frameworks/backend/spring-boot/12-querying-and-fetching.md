---
title: Querying and fetching
summary: The N plus one query, the lazy association that throws outside a transaction, and the settings that show you both.
chapter: Data access
minutes: 14
status: draft
---

## Turn the SQL on first

```yaml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        generate_statistics: true
logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

`show-sql` prints the statements, and the statistics add a summary with the query count at the end of a
request. Reading that count against the rows returned is how the next problem becomes visible, and the bind
tracing shows the parameter values, which is what makes a slow statement reproducible by hand.

## The N plus one query

```java
List<RowEntity> rows = repository.findByLevel(Level.LOUD);

for (RowEntity row : rows) {
    System.out.println(row.getAccount().getName());     // one query per row
}
```

```text
select ... from rows where level = ?
select ... from accounts where id = ?
select ... from accounts where id = ?
select ... from accounts where id = ?
```

One query for the list and one per element is the N plus one problem. A hundred rows become a hundred and one
queries, each with a network round trip, and a page that takes ten milliseconds locally takes three seconds
against a database in another region.

## Four ways to fix it

```java
@Query("select r from RowEntity r join fetch r.account where r.level = :level")
List<RowEntity> findByLevelWithAccount(@Param("level") Level level);
```

A `join fetch` loads the association in the same statement. It does not need to appear in the select clause to
be fetched, and it does not return duplicates for a many-to-one.

```java
@EntityGraph(attributePaths = "account")
List<RowEntity> findByLevel(Level level);
```

`@EntityGraph` says the same thing declaratively on a repository method, which is shorter and keeps the query
derived from the name. It works with pagination where a `join fetch` on a collection does not.

```yaml
spring:
  jpa:
    properties:
      hibernate:
        default_batch_fetch_size: 50
```

That setting makes the provider load up to fifty proxies in one statement when it first needs one, which fixes
the whole application rather than one query. It is the cheapest of the four fixes and the one to try first.

A projection that selects only the columns the page needs avoids the association entirely, and it is the
fastest option when the association is not really required.

## Lazy by default, and why

```java
@ManyToOne(fetch = FetchType.LAZY)
private AccountEntity account;

@OneToMany(mappedBy = "row", fetch = FetchType.LAZY)
private List<TagEntity> tags;
```

A many-to-one is eager by default and a one-to-many is lazy, which is backwards from what a service wants in
both cases. Making the many-to-one lazy and loading it where it is needed turns an invisible query per row
into a visible decision. An eager collection is worse: it loads every child of every row, and two eager
collections on one entity make the result set the product of the two.

## The lazy initialisation failure

```text
org.hibernate.LazyInitializationException: could not initialize proxy
[com.example.tool.AccountEntity#1] - no Session
```

The proxy is loaded outside the transaction, so the session it would need is closed. Three fixes, in the order
I would try them:

1. Fetch the association in the query that loads the parent, with a `join fetch` or an `@EntityGraph`.
2. Return a projection or a DTO built inside the transaction, so nothing lazy escapes.
3. Move the transaction boundary out to the layer that needs the data.

## Open Session In View is on by default

Boot enables `spring.jpa.open-in-view` by default, which keeps the session open for the whole request so a lazy
load in the controller or in a serializer still works. That is why the exception above often does not happen in
a Boot application and why it appears the day someone disables the setting.

```yaml
spring:
  jpa:
    open-in-view: false
```

Turning it off is the setting I would change on a new project, because it makes the transaction boundary the
service method and turns a hidden query into a visible failure. It is a behaviour change, so turn it off at the
start rather than after the code has grown to depend on it.

## Paging

```java
Page<RowEntity> page = repository.findByLevel(Level.LOUD, PageRequest.of(0, 20, Sort.by("value")));
```

```json
{
  "content": [],
  "totalElements": 412,
  "totalPages": 21,
  "number": 0,
  "size": 20
}
```

A `Page` runs a second `count` query to fill in the totals and a `Slice` does not, so a next-page button with no
total is cheaper with `Slice`. An offset ten thousand pages deep makes the database walk and discard ten
thousand rows, which is where keyset pagination takes over:

```java
@Query("select r from RowEntity r where r.id > :after order by r.id")
List<RowEntity> pageAfter(@Param("after") long after, Pageable pageable);
```

That selects the next page by the last identifier seen rather than by an offset, so the tenth page costs what
the first one did. It needs a stable order and gives up random access to page numbers.

## Bulk updates go around the persistence context

```java
@Modifying(clearAutomatically = true, flushAutomatically = true)
@Query("update RowEntity r set r.level = :next where r.level = :current")
int reclassify(@Param("current") Level current, @Param("next") Level next);
```

A bulk statement runs in the database and the entities already loaded in the context keep their old values,
which is what `clearAutomatically` fixes by emptying the context afterwards. Loading a hundred rows and updating
each one is a query per row and is the right thing for a hundred; a million rows needs the bulk statement and
the awareness that the context is now stale.

## Check yourself

Load a list with a lazy association, access it in a loop, and count the queries from the statistics. Fix it
three ways and compare the query counts. Then turn off open-in-view and read the exception the controller now
throws.
