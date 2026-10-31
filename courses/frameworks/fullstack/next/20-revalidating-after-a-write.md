---
title: Revalidating after a write
summary: A write has to say what it made wrong, and the framework will not guess for you.
chapter: Mutations
minutes: 13
status: draft
---

## The gap a write opens

A cached catalogue is a snapshot. Recording a loan changes what the catalogue should say, and nothing about the write knows
that a cache entry exists. So every write ends with a statement about what it invalidated:

```ts
if (!result.ok) {
  return { error: result.error, member };
}

updateTag("catalogue");
updateTag("stats");
```

Two tags, because two cached functions read the loans: the catalogue counts copies, and the home page counts loans. Miss one
and the bug is a page that is wrong for up to an hour, which is the kind of bug that is reported as "sometimes".

## The four tools

| Function | Called from | Effect |
| --- | --- | --- |
| `updateTag(tag)` | a Server Action | expires the entry, the next request waits for fresh data |
| `revalidateTag(tag, profile)` | actions and route handlers | with `max`, serves stale while fetching fresh |
| `revalidatePath(path)` | actions and route handlers | invalidates everything cached on a route |
| `refresh()` | a Server Action | re-renders the route from the server without touching other entries |

The distinction that matters most is the first two. `updateTag` is the read your own writes tool: the librarian records a
loan and looks at the shelf, so the shelf has to be right in the next render, and the render waits. `revalidateTag` with a
profile is the background tool: a webhook changed something, visitors can see the old copy for a moment, and nobody waits.

## Choosing a tag name

Name the tag after the data, not the page:

```ts
cacheTag("catalogue");   // everything the catalogue shows
cacheTag("stats");       // the counts on the home page
```

`cacheTag("catalogue-page")` would be tied to one route, and then a second route reading the same data needs its own tag and
its own invalidation. The tag is a handle on an entry, so the name should say what the entry holds.

A cached function may carry more than one:

```ts
"use cache";
cacheTag("catalogue");
cacheTag(`book-${book.id}`);
```

The second tag is what lets a write that touched one book invalidate only that book's entries, while a write that reshuffled
the whole catalogue invalidates the first. Where an entry reads several records, tag it with all of them, and accept that
the popular tag invalidates more than strictly needed.

## Order, and the one that throws

```ts
updateTag("catalogue");
redirect(`/books/${id}`);
```

Revalidate before redirecting, because `redirect` throws and nothing after it runs. The same is true of `notFound()`, and of
any error the action raises deliberately.

There is no need to revalidate and then navigate with `router.push` from the client: an action's response already carries the
updated route.

## Seeing it work

The behaviour to watch is one page, one click, one response:

```text
action  Lent Dune to Ada Lovelace, due 2026-11-14.
after   1 of 3 copies on the shelf.
```

Nothing in the client asked for the page again. The action invalidated the tag, the framework re-rendered the route, and the
response contains both the action's return value and the new markup. That is the single-roundtrip model the docs describe,
and it is why an application like this one needs no client store for server data.

## The failures to expect

| Symptom | Cause |
| --- | --- |
| the count is right on one page and stale on another | a tag was invalidated and a second tag was not |
| the page is stale until the lifetime expires | the write invalidated nothing |
| the count is right after a reload and wrong before it | the action returned data but nothing revalidated |
| a write appears to do nothing at all | the action failed a check and returned an error nobody rendered |

The last row is the one to check first when a mutation "does not work": the action is often behaving correctly and the
component is discarding its return value.

## Testing invalidation

Invalidation is easy to lose in a refactor, so the action's test asserts it:

```ts
expect(cache.updateTag).toHaveBeenCalledWith("catalogue");
expect(cache.updateTag).toHaveBeenCalledWith("stats");
```

`next/cache` is mocked for the test, and the two assertions are what will fail the day somebody removes a line without
thinking. It is a cheap test for a bug that is otherwise invisible until a librarian reports it.

## Check yourself

Remove `updateTag("stats")` from the loan action, record a loan and watch the home page. Note how long the wrong number
survives, then put the line back and confirm that the count is right in the same response as the action's notice.
