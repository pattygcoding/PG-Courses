---
title: Normalisation
summary: Three anomalies in one table, the three normal forms, and when to break them on purpose.
chapter: Designing a schema
minutes: 13
status: draft
---

## One table holding everything

```sql
create table unnormalised(
  loan_id integer primary key,
  book_title text not null,
  author_name text not null,
  author_born text,
  member_name text not null,
  member_joined text,
  loaned_on text,
  due_on text
) strict;
```

Three loans, and every row repeats the book, its author and the member. That is what a spreadsheet of a lending log looks like,
and it is where every schema starts before it is normalised.

```sql
select book_title, count(*) as rows_holding_this_title from unnormalised group by book_title;
```

```text
book_title          rows_holding_this_title
-------------------------  -----------------------
Kindred                                          1
The Left Hand of Darkness                        2
```

The title is stored twice, and so is the author's name and birth date. That is **redundancy**, and it is not a style problem: it
is a place where two copies can disagree.

## The update anomaly

```sql
update unnormalised set author_born = '1929-10-22' where loan_id = 1;

select loan_id, author_born from unnormalised where author_name = 'Ursula K. Le Guin';
```

```text
loan_id  author_born
-------  -----------
      1  1929-10-22
      2  1929-10-21
```

One author, two birth dates. The update was correct and incomplete, and nothing in the schema could have told me. Every copy of a
value that matters is a place the next `UPDATE` can miss, and a database that reports two answers to the same question is worse
than one that reports none.

## The insert anomaly

There is no way to record an author who has not been borrowed yet, and no way to record a member who has not borrowed. Every
column in the table is about a loan, so a fact about an author cannot exist without a loan. The table cannot hold truth it was
not shaped for.

## The delete anomaly

```sql
delete from unnormalised where loan_id = 2;

select count(*) as rows_left, count(distinct member_name) as members_left from unnormalised;
```

```text
rows_left  members_left
---------  ------------
        2             1
```

Grace borrowed one book and returned it, and the delete that removed the loan also removed the only record that she exists. That
is the delete anomaly: deleting a fact about one thing destroys a fact about another.

## The three normal forms

**First normal form** is about atomic values: no column holds a list, and no table holds repeating groups.

```text
bad:  book.id | book.title | book.authors = 'Le Guin, Butler'
good: book | book_author | author
```

A comma-separated list in a column cannot be joined, indexed, counted or validated, and every query against it is a string
search. That is the one normal form worth never breaking, and it is why `book_author` exists in this schema.

**Second normal form** is about a composite key: every non-key column depends on the whole key and not on part of it.

```text
bad:  book_author(book_id, author_id, title)
      -- title depends on book_id alone
good: book_author(book_id, author_id, role)   -- role depends on the pair
```

The test is the question "if I knew only this part of the key, would this column still be determined". If yes, the column belongs
in another table.

**Third normal form** is about transitive dependencies: no non-key column determines another non-key column.

```text
bad:  book(id, title, author_id, author_name)
      -- author_name depends on author_id, which is not the key
good: book(id, title, author_id) + author(id, name)
```

The birth date and the author's name in the unnormalised table are exactly this. The rule of thumb: a column that is a fact about
another entity belongs in that entity's table.

## What normalisation buys and costs

Bought:

- **One place for each fact**, so an update cannot half-happen.
- **Every entity can exist on its own**, so an author with no books is a row.
- **Deleting one fact leaves the others**, which the loan delete above failed to do.
- **Constraints that work**, because a unique key on an author's name is only possible when the names are in one table.

Cost:

- **More joins**, so a report that reads one row now reads four tables.
- **More tables to migrate**, so a schema change touches more files.

The classic response is that reads are cheap and correctness is not, and that is right until a read is too slow. Which leads to:

## Denormalising on purpose

A denormalisation is a deliberate copy of a derived value, and the difference from an accident is that it is written down and
maintained.

| Case | What is stored | Kept correct by |
| --- | --- | --- |
| a total | `order.total_pence` | the application, in the same transaction |
| a count | `book.loan_count` | a trigger, or a nightly job |
| a search name | `author.name_lower` | a generated column or a trigger |
| a snapshot | `order_line.price_at_purchase` | nothing, deliberately |

The last row is the interesting one: a price copied into an order line is not a denormalisation to be repaired, because the
order's price is a fact about the order at the time. Deciding which copies are snapshots and which are cached is the whole
judgement in denormalising, and a comment on the column is the minimum documentation.

A generated column is the cleanest denormalisation, because the engine maintains it and it cannot drift. That is what chapter
seven's first lesson used for `total_pence`, and it is the version to prefer where the engine supports it.

## Check yourself

Build the unnormalised table above and reproduce all three anomalies. Then split it into book, author, member and loan tables and
write the query that reconstructs the original report. Finish by naming a column in a schema you know that is a denormalisation,
and saying which of the four cases it is.
