---
title: Full-text search
summary: The index that finds words, the query syntax it understands, and the ranking a report needs.
chapter: Views, CTEs and triggers
minutes: 12
status: draft
---

## A `LIKE` cannot do this

A search box that matches a word inside text is `like '%word%'`, which is a scan of every row with a wildcard at the front. On a
table of any size it is too slow, and it matches `wordy` and `swordfish` along with `word`.

SQLite's answer is FTS5, a virtual table holding an inverted index: one entry per word pointing at the rows it appears in. A lookup
is a lookup rather than a scan, and the index understands words rather than substrings.

```sql
create virtual table book_fts using fts5(title, body);

insert into book_fts(title, body) values
  ('The Left Hand of Darkness', 'A novel about an envoy on a world where people have no fixed gender.'),
  ('A Wizard of Earthsea', 'A young wizard learns the true name of things on an island world.'),
  ('The Dispossessed', 'Two worlds, one rich and one poor, and a physicist who travels between them.'),
  ('Kindred', 'A woman travels back in time to a plantation and to her ancestors.');

select title from book_fts where book_fts match 'world';
```

```text
         title
-------------------------
The Left Hand of Darkness
A Wizard of Earthsea
```

Two rows, matching `world` and not `worlds`, because FTS5 is tokenised: the third book contains `worlds` and did not match. That is
a difference from `LIKE` in both directions, and the reason the query syntax below exists.

## The query syntax

```sql
select title from book_fts where book_fts match 'title:kindred';
select title from book_fts where book_fts match '"left hand"';
select title from book_fts where book_fts match 'world*';
select title from book_fts where book_fts match 'world OR wizard';
```

| Syntax | Matches |
| --- | --- |
| `word` | the token |
| `"two words"` | the phrase, in order |
| `word*` | the token or any token starting with it |
| `a OR b` | either |
| `a b` | both, which is the default and is an implicit `AND` |
| `column:word` | within that column only |
| `NOT word` | without that token |
| `NEAR(a b, 10)` | within ten tokens of each other |

```text
 title
-------
Kindred

         title
-------------------------
The Left Hand of Darkness

         title
-------------------------
The Left Hand of Darkness
A Wizard of Earthsea
The Dispossessed
```

`world*` matched all three books because the prefix found `worlds` in the third, which is the fix for the tokenisation surprise
above. It is a prefix search rather than a substring one: `orld` matches nothing, and the `*` has to be at the end.

## Ranking

```sql
select title, rank from book_fts where book_fts match 'world OR wizard' order by rank;
```

```text
         title                     rank
-------------------------  -----------------------
A Wizard of Earthsea           -1.1551901833252614
The Left Hand of Darkness  -9.4163424124513623e-07
```

`rank` is a column, and a more negative value is a better match, which is the opposite of what most people expect. `A Wizard of
Earthsea` ranks first because it matched `wizard` as well as `world` and because its text is shorter: a term in a short document
is more significant than the same term in a long one.

`bm25(book_fts)` is the function that computes it, with optional weights per column:

```sql
select title, bm25(book_fts, 10.0, 1.0) as score
from book_fts where book_fts match 'world' order by score;
```

That version weights the title ten times the body, so a match in a title beats one in the text. Tuning those numbers is how a
result list is improved without changing the index, and the numbers want to come from real queries rather than a guess.

## Highlighting the match

```sql
select highlight(book_fts, 0, '[', ']') as highlighted from book_fts where book_fts match 'wizard';
select snippet(book_fts, 1, '[', ']', '...', 8) as snip from book_fts where book_fts match 'world';
```

```text
     highlighted
----------------------
A [Wizard] of Earthsea

                    snip
--------------------------------------------
A novel about an envoy on a [world]...
...true name of things on an island [world].
```

`highlight(table, column, open, close)` returns the column with the matched terms wrapped, and `snippet(table, column, open, close,
ellipsis, tokens)` returns the text around the match. Two rows came back from the snippet query because two rows matched, and the
second snippet begins with `...` because its match is not at the start.

Those two functions are what makes a result list usable, and they save the application from re-implementing the tokeniser to find
out which part of the text matched.

## Keeping the index in step

A virtual table is a second copy of the data, so it has to be kept up to date:

```sql
create virtual table book_fts using fts5(title, body, content='book', content_rowid='id');

create trigger book_fts_insert after insert on book begin
  insert into book_fts(rowid, title, body) values (new.id, new.title, new.body);
end;

insert into book_fts(book_fts) values ('rebuild');
insert into book_fts(book_fts) values ('optimize');
```

An **external content table** stores no copy of the text: the index holds the tokens and the row ids, and the text is read from the
real table when a query needs it. That saves the space and still needs the triggers to stay in step, so the two are used together.

`rebuild` re-indexes everything from the content table, which is the recovery path when the index has drifted, and `optimize`
merges the index's internal segments, which is the maintenance path after a lot of writes. A large FTS index also grows with
deleted rows, so a `rebuild` after a bulk delete is worth the time.

## The alternative in PostgreSQL

PostgreSQL has the same idea with more machinery: a `tsvector` column, a GIN index on it, and `to_tsquery` for the query.

```sql
create index idx_book_search on book using gin(to_tsvector('english', title || ' ' || body));
select title from book where to_tsvector('english', title || ' ' || body) @@ to_tsquery('english', 'world');
```

`@@` is the match operator, `english` names the stemming configuration, and the GIN index is what makes it fast. It stems, so
`worlds` matches `world`, which is the difference from FTS5's prefix syntax. Past the basics, `pg_trgm` adds trigram similarity
for fuzzy matching and typo tolerance.

For a smaller need, three alternatives are worth considering before either: a `LIKE` on a small table, a normalised lowercase
column with an index for prefix matching, and a generated column holding a search form of the text. A full-text index is the right
answer past a few thousand rows and more machinery than a thousand rows need.

## Check yourself

Create an FTS5 table, insert a few rows and run a bare term, a phrase, a prefix and an `OR`. Order one query by `rank` and one by
`bm25` with column weights and compare the order. Then make the index an external content table with triggers and confirm a new row
is findable immediately.
