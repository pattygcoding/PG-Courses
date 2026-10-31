---
title: A data layer
summary: Why the SQL does not belong in the handler, and what a repository buys for the price of one class.
chapter: Data
minutes: 13
status: draft
---

## The version that does not last

```ts
router.get("/", (request, response) => {
  const rows = database.prepare("select * from books order by title").all();

  response.json({ data: rows });
});
```

That works, and it puts three things in a route handler: a SQL statement, the shape of a database row, and the shape of an
API response. The next endpoint needs the same query with a filter, so it is copied and edited. The third one needs the copy
counts as well, so there are three statements that are nearly the same and no place where the catalogue is defined.

The change that costs nothing on day one and a week on day ninety is to name the queries:

```ts
export class BookRepository {
  constructor(private readonly database: Database) {}

  list(filters: BookFilters): BookWithStock[] {
    // ...
  }

  count(filters: Pick<BookFilters, "q" | "genre">): number {
    // ...
  }

  find(id: string): BookWithStock | undefined {
    // ...
  }

  create(input: NewBook): BookWithStock {
    // ...
  }

  update(id: string, input: Partial<Omit<NewBook, "id">>): BookWithStock | undefined {
    // ...
  }

  remove(id: string): boolean {
    // ...
  }
}
```

Six methods, and the handler knows none of them is SQL:

```ts
router.get("/:id", (request, response) => {
  const book = books.find(param(request, "id"));

  if (!book) {
    throw new NotFoundError("That book is not in the catalogue.");
  }

  response.json({ data: book });
});
```

What the handler knows is that `find` takes an id and answers with a book or nothing. Where that comes from is a decision the
repository owns, and the lesson on testing shows the payoff: a test builds the same router against an in-memory database, with
no application code changed.

## The constructor takes the database

```ts
constructor(private readonly database: Database) {}
```

No import of a global connection and no module-level singleton. The repository is a value built with what it needs, which
means two of them can exist in one process: the running application's and a test's. That is the same reasoning as
`createApp` not calling `listen`, applied one layer down.

## Two ways to get from a row to an object

The database speaks snake_case and the API speaks camelCase, so something has to translate. This project uses both
techniques, and the difference is worth seeing.

**Alias it in the query**, so the row is already the right shape:

```ts
const COLUMNS = `
  books.id,
  books.title,
  books.author,
  books.genre,
  books.copies,
  books.year,
  books.copies - (
    select count(*) from loans where loans.book_id = books.id and loans.returned_on is null
  ) as available,
  (select count(*) from waitlist where waitlist.book_id = books.id) as waiting
`;

find(id: string): BookWithStock | undefined {
  return this.database.prepare(`select ${COLUMNS} from books where books.id = ?`).get(id) as
    | BookWithStock
    | undefined;
}
```

**Or map it in a function**, when the row and the object genuinely differ:

```ts
function toLoan(row: LoanRow): OutstandingLoan {
  return {
    id: row.id,
    bookId: row.book_id,
    member: row.member,
    borrowedOn: row.borrowed_on,
    days: row.days,
    returnedOn: row.returned_on,
    title: row.title,
    dueOn: row.due_on,
    overdue: row.overdue === 1,
  };
}
```

| Technique | Best when |
| --- | --- |
| SQL aliases | the columns are already the fields you want |
| a mapping function | names or types differ, as with a computed date or a boolean from an integer |

The first keeps the mapping next to the query that needs it. The second puts every conversion in one function that a test can
call directly, which is why the loan shape uses it: `overdue` arrives from SQLite as `0` or `1` and has to become a boolean
somewhere, and one function is one place to look.

Both share one rule: **a row never leaves the repository.** A handler that receives a row would have to know about
snake_case, and the day a column is renamed the API changes.

## Where the queries are composed

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

Building a statement from parts is where a data layer earns its keep and where the one serious risk lives. The clauses are
chosen by the code, the *values* go in as parameters, and the two never mix. A filter that interpolated the search term into
the string would be an injection, and the next lesson is about the two lines that prevent it.

## Check yourself

Add a `byGenre(): { genre: string; count: number }[]` method that groups the catalogue, use it in a new route, and check that
no SQL in the handler changed. Then move one method's query into a second repository and see what has to change to keep the
route working, which is the count of how well the boundary held.
