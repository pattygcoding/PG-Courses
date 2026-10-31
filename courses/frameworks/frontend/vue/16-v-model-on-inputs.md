---
title: v-model on inputs
summary: What the compiler does with v-model, the modifiers, and the number input that hands back a number.
chapter: Forms and app state
minutes: 13
status: draft
---

## One directive, three elements

```vue
<input v-model="term" type="search" />
```

```ts
// what the compiler produces, in effect
<input :value="term" @input="term = $event.target.value" />
```

```vue
<select v-model="genre">
  <option value="all">All genres</option>
  <option v-for="name in genres" :key="name" :value="name">{{ genreLabel(name) }}</option>
</select>
```

```vue
<input v-model="availableOnly" type="checkbox" />
```

`v-model` is a compile-time shorthand, and what it produces depends on the element:

| Element | Bound to | Listens for |
| --- | --- | --- |
| text, search, textarea | `value` | `input` |
| checkbox | `checked` | `change` |
| radio | `checked`, matched by value | `change` |
| select | `value` | `change` |

That table is the whole of it. A `v-model` on a `<select>` writes the chosen option's `value`, a checkbox writes a
boolean, and a radio writes the value of whichever input was checked.

## Modifiers

```vue
<input v-model.trim="member" />
<input v-model.number="copies" type="number" />
<input v-model.lazy="note" />
```

- `.trim` trims the value as it is written back.
- `.number` casts to a number, and leaves the value alone when it cannot be parsed.
- `.lazy` listens for `change` instead of `input`, so the value arrives when the field loses focus rather than on
  every keystroke.

Modifiers chain, and they are the same names Vue accepts on a component's `v-model`, where a component implements
them itself.

## The number input

```vue
<AppField v-model="days" label="Days" name="days" :error="errors.days" type="number" />
```

Vue's `v-model` on `<input type="number">` casts the value to a number, whether or not `.number` is written. The
field's model therefore holds a number while the state that feeds it may have been declared as a string, and that
mismatch is a warning rather than a silent bug:

```text
[Vue warn]: Invalid prop: type check failed for prop "modelValue".
Expected String with value "14", got Number with value 14.
  at <AppField modelValue=14 onUpdate:modelValue=fn label="Days" ... >
```

I met that while checking the loan form, and the fix is to declare what the input actually produces:

```ts
// v-model on a number input hands back a number, so the field is not a string.
const days = ref<string | number>(14)
```

```ts
const loan: Loan = {
  member: member.value.trim(),
  bookId: bookId.value,
  days: Number(days.value),
}
```

Two ways out are available, and both are honest: widen the type and convert where the value leaves the form, or
use a string input with a `.number` modifier and keep the state a string. The first is what this project does,
because the loan day count is a number and the conversion belongs at the boundary.

## A date field, and the value nobody expects

```vue
<input v-model="dueOn" type="date" />
```

```ts
const dueOn = ref('2026-11-14')
```

An empty date input is `''`, not `null`, and a browser without the control falls back to a text input that accepts
anything. A form that sends a date to an API needs a check on the value rather than trust in the input type, which
is the subject of the next page.

## The form around it

```vue
<form novalidate @submit.prevent="submit">
  <AppField v-model="member" label="Member" name="member" :error="errors.member" />

  <AppField label="Book" name="bookId" :error="errors.bookId">
    <template #default="{ id, invalid, describedBy }">
      <select :id="id" v-model="bookId" name="bookId" :aria-invalid="invalid" :aria-describedby="describedBy">
        <option value="">Choose a book</option>
        <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
      </select>
    </template>
  </AppField>

  <button type="submit" :disabled="!canSubmit || loading">
    {{ loans.saving ? 'Recording' : 'Record loan' }}
  </button>
</form>
```

`novalidate` turns off the browser's own bubbles so the messages this form renders are the ones people see.
`@submit.prevent` keeps the page from navigating, and the submit button is a button with `type="submit"` so that
Enter in a text field submits the form.

## When not to use it

```vue
<form class="session" @submit.prevent="signIn">
  <label for="sign-in">Sign in as</label>
  <input id="sign-in" name="member" />
  <button type="submit">Sign in</button>
</form>
```

```ts
function signIn(event: Event): void {
  const form = event.currentTarget as HTMLFormElement
  session.signIn(String(new FormData(form).get('member') ?? ''))
  form.reset()
}
```

The sign-in form in the layout has one field, is submitted once, and does not need the value while it is being
typed. `new FormData(form)` reads every named control in one go, and the field stays uncontrolled, which is less
code and one less render per keystroke. `v-model` earns its place when the value is needed during the edit:
filtering, counting, previewing or validating.

## Check yourself

Build a small form with a text field, a checkbox, a select and a number field, all with `v-model`, and log the
values as they change. Then switch the number field to a plain ref and read the warning you get, and explain which
of the two declarations was wrong.
