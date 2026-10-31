---
title: Users and permissions
summary: Roles, grants, the column you can hide, and the account the application should not use.
chapter: Working with a database
minutes: 12
status: draft
---

## Roles, not users

```sql
create role librarian login password 'not-a-real-password';
create role app_user login password 'also-not-real-password';

grant select on book to librarian;
grant usage on schema public to librarian;
```

```text
  grantee  | table_name | privilege_type
-----------+------------+----------------
 librarian | book       | SELECT
```

PostgreSQL has one concept for both users and groups, which is a **role**. A role that can log in has `login`; a role that holds
privileges and is granted to others is a group; and the same role can be both. `create user` is an alias for `create role ...
login`, which is why the documentation mostly says role.

The grant is per object and per privilege. Nothing is granted by default: a new role cannot read a table it does not own until
somebody says `select`, and it cannot even see the schema without `usage` on it.

```sql
select rolname, rolsuper, rolcanlogin from pg_roles where rolname in ('librarian', 'app_user');
```

```text
  rolname  | rolsuper | rolcanlogin
-----------+----------+-------------
 librarian | f        | t
 app_user  | f        | t
```

`rolsuper` false is the important column: a superuser bypasses every permission check, so an application's role must never be one.
`rolcreatedb` and `rolcreaterole` are the other two worth checking for.

## Revoking

```sql
revoke insert on loan from librarian;
grant select (title, pages) on book to librarian;
```

```text
  grantee  | table_name | column_name | privilege_type
-----------+------------+-------------+----------------
 librarian | book       | author_id   | SELECT
 librarian | book       | id          | SELECT
 librarian | book       | pages       | SELECT
 librarian | book       | price_pence | SELECT
 librarian | book       | published   | SELECT
 librarian | book       | title       | SELECT
```

`revoke` takes back a privilege that was granted, and `grant ... (columns)` grants a privilege on **specific columns**. A column
grant is how a table's sensitive column is hidden from a role: grant `select (id, name)` and the role cannot select the salary
column, even with `select *`.

That works and it is worth knowing, and the reason it is not used more is that it applies to direct column references rather than
to `select *`, which fails for the role rather than silently returning fewer columns. A view is usually the better tool: grant the
view, not the table, and the shape of what the role can read is one object.

## Reading the permissions

```sql
select grantee, table_name, privilege_type from information_schema.table_privileges where grantee = 'librarian';
select count(*) from information_schema.role_table_grants where table_name = 'book';
```

`information_schema.table_privileges` lists the grants on tables for the current role's visibility, and `role_table_grants` includes
the ones inherited through a role membership. The difference between the two views is where the answers differ: a privilege granted
to a group the role belongs to appears in one and not the other, which is the first thing to check when a role can do something
the direct grants do not explain.

PostgreSQL also has `pg_default_acl` for the grants applied to future objects in a schema, which is how a convention like "every
table in this schema is readable by the reporting role" is applied without repeating the grant.

## The shape I use

| Role | Privileges | Used by |
| --- | --- | --- |
| `app` | `select, insert, update, delete` on the tables it needs | the application |
| `migrator` | owner of the objects, plus `create` | the migration step |
| `readonly` | `select` on everything | a report, an analyst, a support tool |
| `backup` | `select` and the replication privilege | the backup job |

Three or four roles, each with one job, and the application's role cannot change the schema. That last part is the one that
matters most: an application that can run `DROP TABLE` is an application whose SQL injection is a disaster rather than a data leak,
and a migration step that owns the schema is a migration step that is reviewed as one.

The `readonly` role is the one that gets forgotten and used most. A support engineer with `readonly` can answer most questions
without a deploy, and giving them the application's role instead is how a support query becomes an accidental `UPDATE`.

## SQLite has none of this

SQLite has no users, no roles and no grants. A database is a file, and the permissions are the filesystem's: whoever can read the
file can read every table in it. Two consequences worth stating plainly:

- **A SQLite database file on a shared machine is readable by everyone with file access**, unless the filesystem permissions say
  otherwise. There is no `revoke`.
- **Encryption is a build option or an extension**, not a feature of the format, so a file at rest is readable with a hex editor.
  SQLCipher is the widely used option and it is a separate build.

That is the right trade for a file that lives inside one application's own directory, and it is the wrong one for a shared server
with several people querying it. Which is most of the difference between the two engines, and the subject of the next page.

## Check yourself

Create two roles, grant one `select` on a table and the other `select` on two columns of it, and confirm the second cannot read the
third column. Read both grant views and explain the difference. Then list the roles your own application would need and what each
could do.
