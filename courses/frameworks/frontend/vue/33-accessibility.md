---
title: Accessibility
summary: Labels, live regions, the current page in the navigation, and the assertions you already have.
chapter: Shipping
minutes: 13
status: draft
---

## The markup Vue gives you

Vue adds almost nothing to HTML, which is the good news: a `<button>` is a button, and an `<a>` is a link. The parts
that go wrong are the same parts that go wrong in hand-written HTML, and this project's components are where they get
fixed once.

## Labels bound to controls

```vue
<p class="field">
  <label :for="fieldId">{{ label }}</label>

  <input :id="fieldId" v-model="model" :name="name" v-bind="$attrs" />
</p>
```

```ts
const fieldId = `field-${props.name}`
```

`AppField` generates an id from the field's name and binds the label to it, and the browser check shows the pairing on
every field in the application:

```text
labelText: "Search the catalogue"
fieldId: "search"
```

A label that is not bound is the most common accessibility bug there is, and it costs one attribute to avoid. A
placeholder is not a label: it disappears as soon as somebody types, and not every screen reader reads it as the
field's name.

## Invalid fields and their message

```vue
<span v-if="error" :id="errorId" class="error" role="alert">{{ error }}</span>
```

```vue
<input
  :id="fieldId"
  v-model="model"
  :aria-invalid="error !== undefined"
  :aria-describedby="error === undefined ? undefined : errorId"
/>
```

Three attributes have to agree for a message to be read as the field's message, and the browser check confirms all
three after an empty submit:

```text
alerts: ["A member name needs at least three characters.", "Choose a book."]
memberInvalid: "true"
memberDescribedBy: "field-member-error"
```

- `aria-invalid` marks the field, so a form can be summarised as "two fields need attention".
- `aria-describedby` points at the message, so the field's description and its error are read together.
- `role="alert"` announces the message when it appears rather than waiting for the reader to walk back over the field.

## Live regions

```vue
<p v-if="loading" role="status">Loading the catalogue...</p>
```

```vue
<p v-else-if="error" role="alert">
  {{ error }}
  <button type="button" @click="reload">Try again</button>
</p>
```

```vue
<p v-if="message" role="status">{{ message }}</p>
```

`role="status"` is a polite region: the announcement waits for the reader to finish what it is saying. `role="alert"`
interrupts, which is right for a failure and wrong for a loading line. Both appear in the accessibility tree of the
running application, which is where to check them:

| Element | Role in the tree |
| --- | --- |
| `Loading the catalogue...` | `status` |
| `A member name needs at least three characters.` | `alert` |
| `Ada Lovelace is on the list.` | `status` |

For an announcement to happen once rather than repeatedly, the element that changes should be one element whose text
changes, rather than a new element each time. That is why the waiting list's message is one paragraph that may be
empty, rather than a block that appears and disappears.

## The current page, as markup

```html
<a aria-current="page" class="router-link-active router-link-exact-active" href="/">Catalogue</a>
```

Two more details come free with Vue's own components. That HTML is from the running application on the catalogue
route: `RouterLink` adds both classes and the `aria-current` attribute, and the classes are the ones the shell styles.

```ts
nav a.router-link-active {
  font-weight: 700;
}
```

A navigation built from links needs no `onclick`, no tabindex and no key handling, and it tells a screen reader where
the reader is. A `<div>` with a click handler needs all four and still reads as a paragraph.

## Tables

```vue
<table>
  <caption>
    Loans recorded and borrowers waiting
  </caption>
  <thead>
    <tr>
      <th scope="col">Genre</th>
      <th scope="col">Loans</th>
      <th scope="col">Waiting</th>
    </tr>
  </thead>
  <tbody>
    <tr v-for="line in lines" :key="line.genre">
      <th scope="row">{{ genreLabel(line.genre) }}</th>
      <td>{{ line.loans }}</td>
      <td>{{ line.waiting }}</td>
    </tr>
  </tbody>
</table>
```

The caption names the table and every header cell says whether it is a column or a row header, which is what makes a
cell read as "Science fiction, Loans, 42" rather than as a bare number.

## Focus

A client-side navigation replaces part of the page and leaves focus where it was. For a keyboard user that means the
next Tab continues from the middle of a page that is no longer there. Two answers, and both are small:

```vue
<h1 tabindex="-1" ref="heading">Catalogue</h1>
```

```ts
onMounted(() => {
  heading.value?.focus()
})
```

`tabindex="-1"` makes an element focusable by script without adding it to the tab order, which is the technique behind
a skip link and behind moving focus to the top of a new page. The other case is a failed submit: focus belongs on the
first field with a message, which is a `useTemplateRef` per field and one watcher with `flush: 'post'`.

The router offers neither for you, and neither does React Router: where focus goes after a navigation is a product
decision rather than something a router can guess.

## What the components would not have saved

- The two buttons in the sign-in form and the loan form are `<button type="submit">`, so Enter submits and the keyboard
  reaches them.
- The `aria-*` attributes are written on the control rather than on the wrapper, which is what the slot form of
  `AppField` passes down to a `<select>` when a caller supplies its own.
- The error messages are text rather than an icon beside a red border. A colour is not a message.

## Check yourself

Turn one label into a placeholder and one `aria-describedby` off, then run the component tests and read which
assertions fail. Then add a skip link to the shell, check that it appears on focus, and confirm that it moves focus to
the main content.
