---
title: Parameters and the query string
summary: useParams for the path, useSearchParams for the filter, and why the URL is the better state.
chapter: Routing
minutes: 13
status: draft
---

## Reading a path parameter

```tsx
{
  path: 'books/:id',
  element: <BookDetail />,
  loader: async ({ params, request }: LoaderFunctionArgs) => {
    const book = await fetchBook(params.id ?? '', request.signal);

    return { book, waiting: fetchBacklog(book.genre) };
  },
},
```

```tsx
export function BookDetail() {
  const { book, waiting } = useLoaderData() as BookDetailData;
  // ...
}
```

The parameter reaches the loader as `params.id`. A component that needs it can read it with `useParams`:

```tsx
import { useParams } from 'react-router';

const { id } = useParams<{ id: string }>();
```

The loader is usually the better place. It runs before the component, it can turn the id into the record the
page needs, and it can fail with a 404 when there is no such record. A component that reads the raw id and
fetches its own data is doing the loader's job after the fact.

`params.id` is `string | undefined` because the parameter is optional in the route's type, even though the
path requires it. The `?? ''` is the smallest way to satisfy the compiler, and a route that cannot have an
empty id is one where the loader's first job is to reject it:

```ts
if (!params.id) {
  throw new Response('No book was named.', { status: 400 });
}
```

## Reading the query string

```tsx
const [params, setParams] = useSearchParams();
const genre = params.get('genre') ?? 'all';
const term = params.get('q') ?? '';
```

`useSearchParams` returns the current parameters and a setter, and `URLSearchParams` does the rest: `get`,
`getAll`, `has`, `toString`. A parameter that is not there is `null`, which is what the `??` turns into a usable
default.

The pattern in this project writes them with the function form:

```tsx
onChange={(event) =>
  setParams((current) => {
    const next = new URLSearchParams(current);
    if (event.target.value === 'all') {
      next.delete('genre');
    } else {
      next.set('genre', event.target.value);
    }
    return next;
  })
}
```

Three reasons for the function rather than a fresh `new URLSearchParams({ genre })`:

- The other parameters are kept. A filter change should not drop the search term.
- The default value is left out of the URL. `?genre=all` and no parameter mean the same thing, and one of them
  is a URL worth copying.
- A function receives the latest parameters rather than the ones captured by this render, which matters in a
  handler that fires twice before a render.

## Writing with a delay, and replacing the entry

```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (term.length === 0) {
          next.delete('q');
        } else {
          next.set('q', term);
        }
        return next;
      },
      { replace: true },
    );
  }, 300);

  return () => clearTimeout(timer);
}, [term, setParams]);
```

`{ replace: true }` overwrites the current history entry instead of pushing one. Without it, typing four
characters leaves four entries and the back button walks through each of them, which is not what anybody means
by back. A filter change from a select pushes an entry, because stepping through filters is worth undoing.

The rule I use: replace for anything that changes many times quickly, push for anything a person would
deliberately go back to.

## Links that carry the state

```tsx
<Link to={`/books/${book.id}`}>{book.title}</Link>
```

```tsx
<Link to="/books" state={{ from: 'detail' }}>
  Back to the catalogue
</Link>
```

A link is a URL, so the state a page needs can be in it: the id in the path, the filter in the query. The
`state` option carries a value that is not URL shaped, and it lives in the history entry rather than in the
address bar, so it survives a back and forward and not a pasted link.

```tsx
const location = useLocation();
const from = (location.state as { from?: string } | null)?.from;
```

That is the mechanism behind a "back where I came from" link, and it is also the one to reach for when the
value is a scroll position, a selected row or a set of unsaved filters that do not belong in a shareable URL.

## Navigating from code

```tsx
const navigate = useNavigate();

navigate('/books');
navigate(-1); // back
navigate('/books', { replace: true });
```

Most `navigate` calls in application code are a sign that a link or a redirect would do, and the two exceptions
are worth keeping: after an action, where the answer is a `redirect` from the action instead, and in a form
handler that has finished its work. `navigate(-1)` for a cancel button is the third, and it fails in a tab that
was opened directly on the page, which is why a link to a known route is usually better.

## Check yourself

Add a `page` parameter to the catalogue, default it to 1, and keep it in the URL while the search term changes.
Then make the back button walk back through two filters but not through the typing, and check the difference
between the two writes.
