---
title: Routes, links and layouts
summary: One route table, one outlet, and the link component that reports the current page to a screen reader.
chapter: Routing
minutes: 14
status: draft
---

## Two ways to use the router

React Router 8 can be used in three modes, and this project uses the data mode. The difference is where the
route table lives:

```tsx
// declarative: routes described in JSX, inside a BrowserRouter
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route path="books" element={<BookList />} />
    </Route>
  </Routes>
</BrowserRouter>
```

```tsx
// data: routes described as objects, with loaders and actions attached
const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, loader: () => redirect('/books') },
      { path: 'books', element: <BookList />, loader: ({ request }) => fetchBooks(request.signal) },
      { path: 'books/:id', element: <BookDetail />, loader: bookLoader },
      { path: 'loans/new', element: <LoanForm />, loader: loadBooks, action: loanAction },
      { path: 'loans/thanks', element: <LoanThanks /> },
      { path: 'reports', lazy: () => import('./reports/Reports') },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
);
```

The object form is what makes loaders, actions, lazy routes and error elements possible, which is why the rest
of this chapter uses it. The JSX form is shorter for a small application and cannot do those four things, so
starting with the object table avoids a rewrite later.

`RouterProvider` comes from `react-router/dom` in this project. The same export exists on the main entry point
for the RSC and framework code paths, and the DOM one is the client application's.

## Paths, elements and the index route

```tsx
{ index: true, loader: () => redirect('/books') }
```

An index route is the one that matches when nothing else under the parent does. Here the root path redirects
rather than rendering a page of its own, so `/` becomes `/books` before anything renders.

```tsx
{ path: 'books/:id', element: <BookDetail /> }
```

A colon marks a parameter, and the component reads it with `useParams`. Anything static wins over anything
parameterised when both could match, and the first entry that matches is used, so a catch-all belongs last.

## The layout route

```tsx
export function Layout() {
  const { member, signIn, signOut } = useSession();
  const navigation = useNavigation();

  return (
    <>
      <header className="shell">
        <NavLink to="/books" className="brand">
          Northside Library
        </NavLink>

        <nav>
          <NavLink to="/books" className={linkClass}>
            Catalogue
          </NavLink>
          <NavLink to="/loans/new" className={linkClass}>
            New loan
          </NavLink>
          <NavLink to="/reports" className={linkClass}>
            Reports
          </NavLink>
        </nav>
        {/* the sign in form or the signed in member */}
      </header>

      {navigation.state !== 'idle' && (
        <p className="pending shell" role="status">
          Loading the next page...
        </p>
      )}

      <main className="shell">
        <Outlet />
      </main>

      <ScrollRestoration />
    </>
  );
}
```

A layout is a route whose `element` renders an `Outlet`. Everything around the outlet stays mounted through
every navigation, which is why the header does not flicker and why the scroll position can be restored: the
`<ScrollRestoration />` component uses the browser's history entry and the outlet's position to put the reader
back where they were.

Every child route renders where the outlet is. There is one outlet per level, so a nested layout has its own.

## NavLink is not Link with a class

```tsx
function linkClass({ isActive }: { readonly isActive: boolean }): string | undefined {
  return isActive ? 'active' : undefined;
}
```

```html
<a aria-current="page" class="brand active" href="/books">Northside Library</a>
```

That HTML came out of the running application. `NavLink` adds the class when the route is current, and it also
sets `aria-current="page"`, which is what a screen reader announces. `Link` is for a link that is never
current, such as one inside an article.

`className` accepts a function, which is how the active state reaches a class name without a wrapper element.
`to="/books"` matches that path and everything under it; `end` makes it match only the exact path.

Two details about `to`:

```tsx
<Link to={`/books/${book.id}`}>{book.title}</Link>
<Link to=".." relative="path">Back</Link>
```

A relative link is resolved against the route that renders it, which reads well in a nested layout and is easy
to break by moving the component. The catalogue uses absolute paths for that reason.

## The URL is the state

| What the URL carries | Read with | Written with |
| --- | --- | --- |
| the path, including `:id` | `useParams` | `Link`, `navigate` |
| the query string | `useSearchParams` | `setParams` |
| the hash | `useLocation` | a `fragment` on a link |

Every one of those survives a reload, can be sent to somebody else, and is what the back button restores. That
is why the catalogue keeps its filter there and why a half typed form does not.

## Check yourself

Add a nested layout for the loans section with its own header and outline the two `<Outlet />` elements
involved. Then make the Reports link active on a sub path and work out when `end` is needed.
