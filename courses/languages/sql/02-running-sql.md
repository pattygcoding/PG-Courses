---
title: Running SQL
summary: The sqlite3 command line, dot commands against statements, and the two engines' error messages.
chapter: Getting started
minutes: 13
status: draft
---

## Install the engine

```bash
winget install SQLite.SQLite
brew install sqlite
sudo apt install sqlite3
```

```text
$ sqlite3 -version
3.54.1 2026-10-16 14:45:20 555e07ef33f69a0957d24d8e555b702464a131d6f1607f4c3c1e4551e8e6ca76 (64-bit)
```

SQLite is one executable with no service, no configuration and no user accounts, which is why it is the engine this course
uses. Any SQL client works if you prefer one, and PostgreSQL or MySQL are fine to follow along with if you already run them
and translate the few differences as you meet them.

## A database is a file

```bash
sqlite3 library.db          # open or create a file
sqlite3 ':memory:'          # a database that vanishes when you quit
sqlite3 library.db < script.sql    # run a script and exit
```

`sqlite3 library.db` opens the file, creating it if it is not there, and every statement you type is committed to it. That
is the whole of persistence: no `CREATE DATABASE`, no user, no connection string. `:memory:` is a database that exists for
the life of the process, which is what a lesson, a test and a scratch experiment want.

## Dot commands are not SQL

```text
sqlite> .tables
name
----
note
```

A line starting with a dot is a command for the tool rather than a statement for the engine. The engine never sees it, which
is why it has no semicolon and why the same command does not exist in another client. The ones worth knowing:

| Command | Effect |
| --- | --- |
| `.tables` | list the tables |
| `.schema [name]` | print the `CREATE` statement for a table or index |
| `.mode column` | how a result is laid out |
| `.headers on` | print a header row |
| `.read file.sql` | run a file |
| `.import file.csv table` | load a CSV |
| `.output file` | send results to a file |
| `.bail on` | stop at the first error |
| `.quit` | exit |

```text
sqlite> .schema note
CREATE TABLE note(id integer primary key, body text);
```

`.schema` reads the statement back out of the database's own catalogue, which makes it the fastest way to answer "what is
actually in this database" rather than "what does the migration file say should be in it". A schema that has drifted from its
migrations is a real problem, and comparing the two is how you find it.

## A statement ends with a semicolon

```sql
create table note(id integer primary key, body text);
insert into note(body) values ('first'), ('second');
select * from note;
```

```text
id   body
--  ------
 1  first
 2  second
```

The `;` ends the statement and until it arrives the prompt continues onto the next line, which is why a longer query can be
typed across several lines and why a missing semicolon looks like a syntax error.

Every output in this course was produced with `.mode column` and `.headers on`. SQLite's default is `list` mode, a
pipe-separated row per line, which is the one to use when something else is parsing the output:

```text
1|first
2|second
```

## Reading an error

```sql
select * from note where;
```

```text
Parse error near line 5: near ";": syntax error
  select * from note where;
                          ^--- error here
```

```sql
select id from missing_table;
```

```text
Parse error near line 6: no such table: missing_table
```

The line number, the text of the statement and the caret are what you need, and the tool prints all three. Note the second
message: a missing table is reported as a parse error, because SQLite resolves the name before it plans the query. That is a
quirk of the wording rather than something wrong with the statement.

PostgreSQL reports the same failure differently:

```text
ERROR:  relation "missing_table" does not exist
LINE 1: select 1 from missing_table
                      ^
```

Same idea, different wording, and the message names the relation instead of calling it a parse error.

By default an error stops that statement and the script continues, which is the wrong behaviour for a build step:

```text
$ sqlite3 :memory: < script.sql
Parse error near line 4: no such column: missing
  select missing from note;
         ^--- error here
marker
```

The next statement ran and the exit status was zero, so a script that failed on its first query reported success. Both
engines have a way to change that:

```bash
sqlite3 library.db < migration.sql    # with ".bail on" as the first line of the file
psql -v ON_ERROR_STOP=1 -f migration.sql
```

With `.bail on` the tool stops at the first error and exits with status 1, and `-v ON_ERROR_STOP=1` does the same for `psql`.
Every migration script and every build step wants one of them, and chapter ten comes back to why.

## PRAGMA is how SQLite is configured

```sql
pragma table_info(note);
```

```text
cid   name     type    notnull     dflt_value      pk
---  -------  -------  -------  -----------------  --
  0  id       INTEGER        0                      1
  1  body     TEXT           1                      0
  2  created  TEXT           0  current_timestamp   0
```

`PRAGMA` is SQLite's own statement for settings and introspection. `table_info` lists a table's columns with their types, a
flag for which columns refuse `NULL`, their default and their position in the primary key, and it is the query to run when
you need to know what a table really looks like.

Others worth knowing: `foreign_keys` (off by default, which chapter seven covers), `index_list`, `journal_mode` and
`database_list`. `PRAGMA` is an extension rather than standard SQL, and PostgreSQL has `SHOW` and the `information_schema`
views for the same purpose.

## Why the command line

A graphical client is fine, and the command line is worth knowing because it is the version that exists everywhere: in a
container, on a server reached by SSH, in a continuous integration step and in the terminal of an editor. It is also the
version that makes the round trip obvious, which matters while you are learning what the engine does with a statement.

## Check yourself

Install the tool, create a database file, and create one table with three columns. Run `.schema` and `pragma table_info` on
it and compare the two answers. Then break a query twice, once with a syntax mistake and once with a table that does not
exist, and read both messages. Finish by putting three statements in a file with a deliberate error in the middle and running
it with and without `.bail on`.
