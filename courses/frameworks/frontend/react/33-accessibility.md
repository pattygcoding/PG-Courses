---
title: Accessibility
summary: Roles React will not add for you, what a screen reader is told, and the test that already checks it.
chapter: Shipping
minutes: 14
status: draft
---

## Semantic elements first

A `<button>` is focusable, responds to Enter and Space, and is announced as a button. A `<div>` with an
`onClick` is none of those things, and adding them back by hand is more work than using the button. The
catalogue's markup follows three habits that cover most of it:

```tsx
<label htmlFor="search-field">{label}</label>
<input id="search-field" type="search" value={term} onChange={(event) => update(event.target.value)} />
```

```tsx
<button type="button" onClick={() => addLine()}>
  Add a line
</button>
```

```tsx
<table>
  <caption>Loans recorded and borrowers waiting</caption>
  <thead>
    <tr>
      <th scope="col">Genre</th>
      <th scope="col">Loans</th>
      <th scope="col">Waiting</th>
    </tr>
  </thead>
  <tbody>
    <tr key={line.genre}>
      <th scope="row">{genreLabel(line.genre)}</th>
      <td>{line.loans}</td>
      <td>{line.waiting}</td>
    </tr>
  </tbody>
</table>
```

- Every field has a label bound with `htmlFor`. A placeholder is not a label: it disappears as soon as somebody
  types, and not every screen reader reads it as the field's name.
- A button that does not submit carries `type="button"`, and anything that can be disabled uses the `disabled`
  attribute rather than a class, so assistive technology is told.
- A data table has a `caption` and every header cell has a `scope`. That is what makes "42" announce as
  "Science fiction, Loans, 42" rather than as a bare number.

## Live regions for state that changes on its own

```tsx
{loading && <p role="status">Loading the report...</p>}
```

```tsx
{error !== null && (
  <p role="alert">
    {error} <button type="button" onClick={reload}>Try again</button>
  </p>
)}
```

`role="status"` is a polite live region: the text is announced once the reader finishes what it is saying.
`role="alert"` interrupts, which is right for a failure and wrong for a loading line. I checked both against a
browser's accessibility tree while building this project, and the validation message under the member field is
exposed as an `alert` while the loading line is a `status`.

For a live region to be announced once rather than repeatedly, the element that changes should be one element
with new text in it, rather than a new element each time:

```tsx
<p role="status">{state.message}</p>
```

That is why the waiting list's message lives in one paragraph with a possibly empty string, rather than inside an
`@if` that creates and destroys it.

## The current page in the navigation

```tsx
<NavLink to="/books" className={linkClass}>
  Catalogue
</NavLink>
```

```html
<a aria-current="page" class="active" href="/books">Catalogue</a>
```

`NavLink` adds `aria-current="page"` as well as the class, which is what a screen reader announces as the
current page. The class is for the styling and the attribute is for everything else, and the shell in this
project sets neither by hand.

## Focus after a change

A client side navigation replaces part of the page and leaves focus where it was, which for a keyboard user means
the next Tab continues from the middle of a page that is no longer there. Two fixes are worth knowing:

```tsx
<h1 tabIndex={-1} ref={heading}>
  Catalogue
</h1>
```

```tsx
const heading = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  heading.current?.focus();
}, []);
```

`tabIndex={-1}` makes the heading focusable by script without adding it to the tab order, which is the technique
behind a skip link and behind moving focus to the top of a new page.

The second case is a failed submit: focus belongs on the first field with a message, which is a ref per field and
one `useEffect` after the errors change, and the alternative is a person tabbing through a form to find out what
went wrong.

## What React adds for you

| Feature | Where it comes from |
| --- | --- |
| `aria-current` on the current link | `NavLink` |
| `htmlFor` mapped to `for` | JSX's DOM property names |
| keyboard handling for a button | the browser, if it is a `<button>` |
| focus on a `<dialog>` opened with `showModal()` | the browser |
| keyboard handling for a `<div role="button">` | you, including Enter and Space |

That last row is the reason to use the element rather than the role. A `role` tells a screen reader what
something is; it does not make it behave that way.

## Checking it

- Tab through the page. If focus disappears, something is unreachable, and a custom control is the usual cause.
- Open the accessibility tree in the inspector and read what each control is called. A control announced as a
  button with no name is a button with no name.
- Run a Lighthouse accessibility audit, which catches the mechanical cases: missing labels, contrast, heading
  order.
- Notice that a component test written with `getByRole` and `getByLabelText` is already an accessibility check.
  The duplicate label that broke two tests in this project was a real problem for a screen reader, and the test
  found it before a person did.

## Check yourself

Turn one label into a placeholder, remove the table's `caption`, and run the tests and a Lighthouse audit on
both versions. Then add a skip link to the layout and check that it appears on focus and moves focus to the main
content.
