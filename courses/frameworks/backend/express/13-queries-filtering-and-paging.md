---
title: Queries, filtering and paging
summary: One query that searches, filters and pages, and the parameters that keep it safe.
chapter: Data
minutes: 14
status: draft
---

## What the endpoint promises

```bash
curl -s 'http://localhost:3000/books?q=le+guin&page=1&perPage=2'
```

```text
{"data":[{"id":"the-left-hand-of-darkness","title":"The Left Hand of Darkness","author":"Ursula K. Le Guin",
"genre":"science-fiction","copies":1,"year":1969,"available":0,"waiting":1}],
"meta":{"page":1,"perPage":2,"total":1}}
```

A list endpoint has four jobs: filter, sort, page, and tell the client what the whole set was. The last one is the part that
gets left out. `meta.total` is what a client needs to render "page 1 of 3", and without it a paging interface cannot know
whether a next page exists.

| Parameter | Meaning | Default |
| --- | --- | --- |
| `q` | a search term for title or author | absent |
| `genre` | one of the known genres | absent |
| `page` | one-based page number | 1 |
| `perPage` | rows per page, with a ceiling | 20 |

## The ceiling is not optional

```ts
const listQuery = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  genre: z.enum([...GENRES]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});
```

`perPage` has a maximum of 50, because otherwise `?perPage=1000000` is a request that makes your database read a table into
memory and your JSON encoder build a string nobody can send. A limit on a list endpoint is the same kind of decision as a
limit on a request body.

`z.coerce.number()` is what makes `?page=2` work at all, since a query string is text. It also rejects `?page=abc` with a
400 rather than passing `NaN` into a `limit` clause, which is the failure worth having.

## One query, assembled from parts

```ts
list(filters: BookFilters): BookWithStock[] {
  const where: string[] = [];
  const parameters: (string | number)[] = [];

  if (filters.q) {
    where.push("(lower(books.title) like ? or lower(books.author) like ?)");
    const needle = `%${filters.q.toLowerCase()}%`;
    parameters.push(needle, needle);
  }

  if (filters.genre) {
    where.push("books.genre = ?");
    parameters.push(filters.genre);
  }

  const sql = `
    select ${COLUMNS} from books
    ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
    order by books.title
    limit ? offset ?
  `;

  return this.database.prepare(sql).all(...parameters, filters.limit, filters.offset) as unknown as BookWithStock[];
}
```

The clauses are built by the code and the values travel separately, which is the whole safety argument for the two arrays. A
combined version is shorter and is an injection:

```ts
// never
const sql = `select * from books where title like '%${q}%'`;
```

The `%` wildcards go into the parameter rather than the statement, so the value stays a value. SQLite treats `%` and `_` as
wildcards in `like`, and a search term containing either matches more than a person expects, which is a small annoyance
rather than a security hole: the worst case is a search that returns too much.

## The count is a second query

```ts
count(filters: Pick<BookFilters, "q" | "genre">): number {
  const row = this.database
    .prepare(`select count(*) as total from books ${where.length > 0 ? `where ${where.join(" and ")}` : ""}`)
    .get(...parameters) as { total: number };

  return row.total;
}
```

```ts
const data = books.list({ ...filters, limit: query.perPage, offset: (query.page - 1) * query.perPage });

response.json({
  data,
  meta: { page: query.page, perPage: query.perPage, total: books.count(filters) },
});
```

Two queries with the same `where` clause: one for the page, one for the total. They take the filters through the repository
so the two cannot disagree about what is being counted, which is the bug where the list shows three rows and the total says
five.

An offset is what SQLite has, and it costs what it sounds like: `offset 10000` reads and discards ten thousand rows. Where
that matters, the shape to use is a keyset page, which asks for the rows after a value a client already has:

```sql
select * from books where title > ? order by title limit ?
```

It removes the discard cost and it makes the `total` disappear, because a cursor page has no page number to be on. The
trade is real in both directions, and an offset is the right default until a table is large enough to notice.

## Sorting

```sql
order by books.title
```

A fixed sort is one line and is easy to get wrong in the other direction, where a client chooses it:

```ts
// a string from the query goes into an order by
const sql = `select * from books order by ${request.query.sort}`;
```

Column names cannot be bound as parameters, so a sort parameter has to be mapped, and the mapping is an allow list:

```ts
const SORTS = {
  title: "books.title",
  author: "books.author",
  year: "books.year desc",
} as const;

const clause = SORTS[sort] ?? SORTS.title;
```

`SORTS[sort]` looks up a value the code wrote, and an unknown key falls back to the default. Nothing a client sends reaches
the statement, which is the same principle as binding, applied to the one part of a query that cannot be bound.

## Check yourself

Add a `sort` parameter with three allowed values and a fallback, then send `?sort=title;drop table books` and confirm the
table survives. Then page to the end of the catalogue and check that the last page has the rows you expect and that
`meta.total` stays constant, and finally ask for `?perPage=1000` and read the 400.
