---
title: JSON in a relational database
summary: Storing a document, querying it without unpacking it, and the point at which it should have been columns.
chapter: The dialect problem
minutes: 12
status: draft
---

## SQLite has JSON functions and no JSON type

```sql
select json_valid('{"a":1}') as valid, json_valid('nope') as invalid;
```

```text
valid  invalid
-----  -------
    1        0
```

A JSON document is stored in a `TEXT` column, and `json_valid` is the test. That makes a `CHECK` constraint the way to stop a
column holding something that is not JSON:

```sql
create table doc(id integer primary key, body text check (json_valid(body)));

insert into doc(body) values ('{"kind":"book","pages":304}');
insert into doc(body) values ('not json');
```

```text
Error near line 96: CHECK constraint failed: json_valid(body)
```

The second insert was refused, so the column cannot hold a value that is not JSON. That is one line of schema doing what an
application would otherwise do in every writer.

## Reading a value out of it

```sql
select json_extract('{"a":{"b":[1,2,3]}}', '$.a.b[1]') as nested, '{"a":1}' -> '$.a' as arrow, '{"a":1}' ->> '$.a' as arrow_text;
```

```text
nested  arrow  arrow_text
------  -----  ----------
     2  1               1
```

`json_extract(doc, path)` returns the value at a path, and the path language is JSONPath: `$.a.b[1]` is the second element of the
array at `b` inside the object at `a`. **Arrays are zero-indexed**, so the value here is 2.

`->` and `->>` are the shorthand operators and they differ in what they return for a container:

| Operator | Returns | For `'{"a":{"b":1}}' -> '$.a'` |
| --- | --- | --- |
| `->` | JSON, quoted | `{"b":1}` |
| `->>` | text, unquoted | the text of the value |

For a number or a string the two are the same, which is why the example does not show the difference. It appears with an object or
an array, and it matters when the value is compared to a string, because `->` on a JSON string includes the quotes.

## Querying a document as rows

```sql
select key, value, type from json_each('{"a":1,"b":"two"}');
```

```text
key  value   type
---  -----  -------
a        1  integer
b    two    text
```

```sql
select value from json_each('[10,20,30]');
```

```text
value
-----
   10
   20
   30
```

`json_each` is a table-valued function: it turns a document into rows and joins like a table. That is how a JSON array becomes an
`IN` list or a `JOIN` without the application unpacking it, and it is the answer to "a list of ids as a single parameter":

```sql
select b.title from book as b join json_each('[1,3,5]') as j on b.id = j.value;
```

`json_array_length`, `json_type`, `json_object` and `json_array` are the rest of the set, and the `json_group_array` aggregate is
how rows become a document.

## Indexing an extract

```sql
create index idx_doc_kind on doc(json_extract(body, '$.kind'));

explain query plan select id from doc where json_extract(body, '$.kind') = 'book';
```

```text
QUERY PLAN
`--SEARCH doc USING COVERING INDEX idx_doc_kind (<expr>=?)
```

An expression index on the extract is used by a query with the same expression, which is the one thing that makes a JSON column as
fast as a real one for the values that matter. The rule from the indexes chapter applies unchanged: the expression in the index has
to match the expression in the query exactly, or nothing is used. That also means one index per path, which is the first symptom
in the list at the end of this page.

## PostgreSQL's jsonb

PostgreSQL has two JSON types. `json` stores the text as written and preserves whitespace and key order; `jsonb` stores a parsed
binary form, which loses the formatting and the order and supports an index. `jsonb` is the one to use unless the exact text
matters.

```sql
create table doc (id integer generated always as identity primary key, body jsonb);

select body ->> 'kind' from doc where body @> '{"kind":"book"}';
create index idx_doc_body on doc using gin (body jsonb_path_ops);
```

`@>` is the containment operator, and a GIN index on `jsonb_path_ops` makes containment fast. That is a better answer than an
expression index per field: one index serves every containment query rather than one index per path.

## When JSON in a column is right

- **A document from somewhere else.** A webhook payload, an API response, a log entry. The shape is not yours and it changes
  without a migration.
- **Attributes that are genuinely open.** A form's answers, a product's specifications, where the fields differ per row and
  nothing joins on them.
- **A snapshot.** The request that produced an order, kept for a dispute. It is a record of what happened rather than data to
  query.
- **A document you have already committed to**, such as an event in an event-sourced system.

## When it is wrong

The test is one question: **does anything join on it, filter on it, or aggregate it?** If yes, it should be a column.

| Symptom | What it means |
| --- | --- |
| an index per path | the paths are fields |
| a `json_each` in every report | it is a table |
| a `CHECK` per path on top of `json_valid` | it is a table with constraints |
| an application that validates the document before writing it | the schema should validate it |
| a query a colleague cannot read | the path language is not a schema |

The failure mode is gradual: a document column starts as a flexible place for a payload nobody queries, and a year later the
reports are full of `json_extract`, there are nine expression indexes, and the constraints that should protect the data are in the
application. That is a relational schema written in a language with weaker tools.

## Check yourself

Create a table with a JSON column and a `json_valid` check, and try to insert something that is not JSON. Extract a nested value
and a value from an array, and confirm the array index is zero-based. Then turn an array into rows with `json_each` and join it to
a real table, and add an expression index and check that the plan uses it.
