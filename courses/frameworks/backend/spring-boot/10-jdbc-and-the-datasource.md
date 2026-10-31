---
title: JDBC and the datasource
summary: The pool Boot configures, the template that removes the boilerplate, and the settings that decide how it behaves under load.
chapter: Data access
minutes: 13
status: draft
---

## Boot configures a pool for you

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/tool
    username: tool
    password: ${TOOL_DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      connection-timeout: 2s
      max-lifetime: 30m
      leak-detection-threshold: 5s
```

Adding a driver to the classpath makes Boot build a `DataSource`, and HikariCP is the pool it uses. The
settings above are the ones that decide behaviour under load:

| Setting | Effect |
| --- | --- |
| `maximum-pool-size` | the most connections the service will open |
| `connection-timeout` | how long a thread waits for one before failing |
| `max-lifetime` | how long a connection is kept before being replaced |
| `leak-detection-threshold` | logs when a connection is held longer than this |

A leak detection warning is the most useful line the pool prints, because it names the stack that took the
connection and did not return it. Without it, the symptom is a service that works until it does not.

## The pool is the first thing to run out

Every query needs a connection, so every slow query holds one, and ten of them hold the pool. The next request
waits, then times out, and the service appears to be down while the database is healthy. Two habits prevent
it: keep transactions short, and never hold a transaction open across a call to another service.

A pool sized to the database's connection limit is the other end of the same problem: three replicas with a
pool of twenty is sixty connections, and a small database may allow fifty. The number belongs in configuration
and the sum across replicas is worth a comment in the deployment notes.

## JdbcTemplate removes the boilerplate

```java
@Repository
public class JdbcRowStore implements RowStore {
    private final JdbcTemplate jdbc;

    public JdbcRowStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Row> find(String key) {
        List<Row> rows = jdbc.query(
                "select key, value, created_at from rows where key = ?",
                (rs, rowNum) -> new Row(
                        rs.getString("key"),
                        rs.getLong("value"),
                        rs.getTimestamp("created_at").toInstant()),
                key);

        return rows.stream().findFirst();
    }

    public int save(Row row) {
        return jdbc.update(
                "insert into rows (key, value, created_at) values (?, ?, ?) "
                        + "on conflict (key) do update set value = excluded.value",
                row.key(), row.value(), Timestamp.from(row.at()));
    }
}
```

Boot provides a `JdbcTemplate` bean once a `DataSource` exists, so a repository takes one by constructor.
`query` runs a statement with a `RowMapper` per row, `update` runs one and returns the affected count, and
`queryForObject` is the version for a single value.

## Parameters are not optional

```java
jdbc.query("select * from rows where key = '" + key + "'", mapper);      // injection
```

Never build a statement by concatenating a value. A key containing `' or 1=1 --` turns a lookup into a full
table read, and the same trick on an update can delete rows. A `?` placeholder sends the value separately from
the statement, so it can never be read as SQL:

```java
jdbc.query("select * from rows where key = ?", mapper, key);
```

Named parameters are the readable version once a statement has more than three:

```java
MapSqlParameterSource params = new MapSqlParameterSource()
        .addValue("key", row.key())
        .addValue("value", row.value());

named.update("update rows set value = :value where key = :key", params);
```

## Batches for many rows

```java
jdbc.batchUpdate("insert into rows (key, value) values (?, ?)", new BatchPreparedStatementSetter() {
    @Override
    public void setValues(PreparedStatement statement, int index) throws SQLException {
        statement.setString(1, rows.get(index).key());
        statement.setLong(2, rows.get(index).value());
    }

    @Override
    public int getBatchSize() {
        return rows.size();
    }
});
```

One statement per row means one network round trip per row, which is slow for ten thousand rows. A batch sends
them together. The driver decides the actual batch size, and setting `rewriteBatchedStatements` for MySQL or
using the Postgres `reWriteBatchedInserts` option is where the speed comes from.

## Reading a generated key

```java
KeyHolder holder = new GeneratedKeyHolder();
jdbc.update(connection -> {
    PreparedStatement statement = connection.prepareStatement(
            "insert into rows (key) values (?)", Statement.RETURN_GENERATED_KEYS);
    statement.setString(1, row.key());
    return statement;
}, holder);

long id = holder.getKey().longValue();
```

A generated identifier needs a `PreparedStatementCreator` so the statement can be tagged and the key read
back. This is the kind of boilerplate that JPA removes, which is the trade the next page covers.

## When to use JdbcTemplate over JPA

A reporting query that joins six tables and aggregates, a bulk update of a million rows, a statement whose
plan you tuned by hand: all three want the SQL visible in the code. JPA is for loading and saving object
graphs, and a project with a small transactional surface and a lot of reporting can use the template
throughout and be simpler for it.

## Check yourself

Write one query, one update and one batch update against a local database, and log the SQL each one sends. Then
set `leak-detection-threshold` to a second, hold a connection without closing it in a test, and read the
warning.
