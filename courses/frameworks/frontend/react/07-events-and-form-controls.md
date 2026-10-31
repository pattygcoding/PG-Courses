---
title: Events and form controls
summary: One handler per input, the difference between value and defaultValue, and what React's onChange really is.
chapter: State and events
minutes: 13
status: draft
---

## A handler is a function

```tsx
<button type="button" onClick={() => setCount((value) => value + 1)}>Add one</button>
<button type="button" onClick={addOne}>Add one</button>
```

```tsx
function addOne(): void {
  setCount((value) => value + 1);
}
```

Both work, and the difference matters when the handler needs an argument:

```tsx
<button type="button" onClick={() => select(book.id)}>Show details</button>
<button type="button" onClick={select(book.id)}>Show details</button> // calls select while rendering
```

The second one runs during the render and passes its return value as the handler, which is usually
`undefined`. When the handler needs an argument, wrap it in an arrow function. `onClick={select}` is fine
only when `select` takes no arguments.

React's events are not DOM events. It wraps them in a synthetic event with the same shape, so
`preventDefault` and `stopPropagation` work as expected and the handler receives the type the DOM would
give. In React 19 they are pooled no longer, so reading `event` after an `await` is safe.

## Submitting a form

```tsx
<form
  className="session"
  onSubmit={(event) => {
    event.preventDefault();
    signIn(String(new FormData(event.currentTarget).get('member') ?? ''));
  }}
>
  <label htmlFor="sign-in">Sign in as</label>
  <input id="sign-in" name="member" />
  <button type="submit">Sign in</button>
</form>
```

`preventDefault` is what stops the browser from navigating away with the form data, which is the behaviour
of a form with no `action`. `new FormData(form)` reads every named control in one go, and it is the shortest
way to pick up three fields without three pieces of state.

Note the pairing: the input has an `id`, the label has `htmlFor`, and the button is `type="submit"` so Enter
in a text field submits. All three are needed for a form that works with a keyboard.

## Controlled inputs

```tsx
const [term, setTerm] = useState('');

<input id="search" type="search" value={term} onChange={(event) => setTerm(event.target.value)} />
```

The input shows what the state says, and every keystroke writes the state back. That round trip is what
makes the value available to the rest of the render: filtering a list, enabling a button, showing a message.
It is also what makes validation possible while typing, which the forms chapter uses.

React's `onChange` fires on every keystroke rather than when the field loses focus, so it behaves like the
DOM's `input` event with a friendlier name. The DOM's own `change` event, which fires on blur, is not
exposed under the same name.

## Uncontrolled inputs with defaultValue

```tsx
<input id="member" name="member" defaultValue={member} onChange={(event) => setMember(event.target.value)} />
```

```tsx
<select id="bookId" name="bookId" defaultValue={result?.loan.bookId ?? ''}>
```

`defaultValue` sets the initial value and then leaves the field alone. The loan form uses it because the
router owns the form's data: the action reads the whole form on submit, and the component only needs to
give a failed submission its previous values back. An uncontrolled field with a `defaultValue` is also
cheaper, because a keystroke does not re-render the component.

One warning to recognise, because it points at a real mistake:

```text
You provided a `value` prop to a form field without an `onChange` handler.
This will render a read-only field. If the field should be mutable use `defaultValue`.
Otherwise, set either `onChange` or `readOnly`.
```

## Selects, checkboxes and radios

```tsx
<select
  id="genre"
  value={genre}
  onChange={(event) => setGenre(event.target.value)}
>
  <option value="all">All genres</option>
  {genres.map((name) => (
    <option key={name} value={name}>
      {genreLabel(name)}
    </option>
  ))}
</select>
```

```tsx
<input
  id="available"
  type="checkbox"
  checked={availableOnly}
  onChange={(event) => setAvailableOnly(event.target.checked)}
/>
```

A checkbox uses `checked` and `event.target.checked`, not `value`. A radio group is a set of inputs sharing
a `name`, with `checked={value === 'hardback'}` on each and one handler reading `event.target.value`.

## Deriving from the event

```tsx
onChange={(event) => setTerm(event.target.value)}
```

`event.target` is typed as the element the handler is on, so `value` on an input and `checked` on a checkbox
are both available without a cast. A handler shared by two element types needs a cast or, better, two
handlers: one that reads what it knows the element to be is shorter than one that guesses.

## Check yourself

Write a form with a text field, a select and a checkbox, all uncontrolled, and read the values with
`new FormData(event.currentTarget)`. Then make the text field controlled and watch how many times the
component renders while you type.
