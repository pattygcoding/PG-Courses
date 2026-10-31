---
title: Lifetimes and tags
summary: cacheLife for how long an entry is good, and cacheTag for the write that makes it wrong.
chapter: Data and caching
minutes: 14
status: draft
---

## A lifetime is not optional in practice

```ts
"use cache";
cacheLife("hours");
cacheTag("catalogue");
```

The directive works without `cacheLife`, and it then uses an implicit default profile. Pairing one with every directive is
what the docs recommend, and the reason is that the default is a guess about your data: a catalogue title and a stock
price do not deserve the same lifetime.

The profiles that ship with the framework cover most cases:

| Profile | Stale for | Revalidate | Expire |
| --- | --- | --- | --- |
| `seconds` | a moment | fast | fast |
| `minutes` | up to a minute | a minute | an hour |
| `hours` | up to an hour | an hour | a day |
| `days` | up to a day | a day | a week |
| `weeks` | up to a week | a week | the end of the month |
| `max` | until asked to refresh | never on its own | never on its own |
| `default` | the framework's own numbers | | |

`max` is the one to notice. An entry with that profile never expires by time, and only a tag or a path invalidates it,
which is what you want for content that changes when a person changes it.

The numbers in the build output correspond to the profiles each route used:

```text
├ ◐ /books/dune                             1h      1d
```

Revalidate an hour, expire a day: `cacheLife("hours")`.

## Making an entry wrong

A lifetime answers "how stale is acceptable". A tag answers "who knows better".

```ts
export async function getCatalogue(): Promise<CatalogueEntry[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  // ...
}
```

Tag the cached function, and invalidate the tag in the write that changed it:

```ts
export async function recordLoanAction(_previous: FormState, formData: FormData): Promise<FormState> {
  // ...
  updateTag("catalogue");
  updateTag("stats");
```

One tag per kind of data, named after the thing rather than the page, and a function may carry several.

## updateTag and revalidateTag

These two look interchangeable and are not, and the framework lets you use each in one place only:

| | `updateTag` | `revalidateTag` |
| --- | --- | --- |
| where it may be called | Server Actions | Server Actions and Route Handlers |
| what the next request sees | fresh data, it waits | with a profile, stale data while fresh is fetched |
| meant for | read your own writes | webhooks, background refreshes, other callers |

The distinction is about the person doing the writing. A librarian who records a loan and then looks at the shelf should see
the loan, so the action uses `updateTag` and the next request pays the render cost.

A webhook saying "the supplier's catalogue changed" should not make a visitor wait, so the route handler in this application
uses the profile form:

```ts
export async function POST() {
  revalidateTag("catalogue", "max");

  return Response.json({ revalidated: true, at: new Date().toISOString() }, { status: 202 });
}
```

Called in an action, `updateTag` is immediate; called in a route handler it throws:

```text
Error: updateTag can only be called from within a Server Action
```

## What the visitor sees

The behaviour is worth watching once, because it is the payoff for the whole chapter. Open a book page, record a loan, and
look at the count without reloading:

```text
before  2 of 3 copies on the shelf.
action  Lent Dune to Ada Lovelace, due 2026-11-14.
after   1 of 3 copies on the shelf.
```

The notice and the new count arrive in the same response, and the page was never reloaded. The action invalidated the tag,
the router re-rendered the route, the cached function was rebuilt on the server, and the fresh result came back with the
action's own return value.

## Invalidating by path

`revalidatePath` is the older tool and still the blunt one:

```ts
import { revalidatePath } from "next/cache";

export async function setDeskAction(open: boolean): Promise<void> {
  // ...
  revalidatePath("/loans");
}
```

It invalidates everything cached on a route rather than the entries behind a tag, which is the right call when the route is
the unit that changed and the wrong one when three pages share the data. Prefer the tag where you have named one.

## Purging everything

There is no "clear the cache" button, and that is on purpose. The build id already gives you a full reset when you deploy,
so a panic purge is a deploy away. Between deploys the tag is the tool: name your entries after the data, and invalidate
them from the write that changed the data.

## Check yourself

Add a running total to the catalogue that counts how many loans the library has recorded, cache it for a week, and
invalidate it from the loan action. Then check the same count fifteen minutes later without touching the application, and
explain what the profile you chose means for the answer.
