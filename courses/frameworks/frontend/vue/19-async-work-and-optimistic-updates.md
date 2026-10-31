---
title: Async work and optimistic updates
summary: The loading, error and result shape a store keeps, and the count that moves before the request lands.
chapter: Forms and app state
minutes: 13
status: draft
---

## Three states, one action

```ts
const error = ref<string | null>(null)
const saving = ref(false)
const receipts = ref<LoanReceipt[]>([])

async function borrow(loan: Loan): Promise<LoanReceipt | null> {
  saving.value = true
  error.value = null

  try {
    const receipt = await requestLoan(loan)
    receipts.value = [...receipts.value, receipt]
    return receipt
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : 'The loan could not be recorded.'
    return null
  } finally {
    saving.value = false
  }
}
```

Every request in an interface has that shape: something is in flight, it either worked or it did not, and the result
either belongs in state or is over. The flags live in the store rather than in the component because two components
can care: the form disables its button, and a header could show a spinner from the same flag.

Two ways to report the outcome, and both appear in this project:

| The action returns | The component does |
| --- | --- |
| `LoanReceipt \| null` | checks for null and decides whether to navigate |
| `{ waiting, message }` | renders the message, and takes the count from the same object |

What it should not do is throw a raw error into a template or leave the caller guessing whether the request
finished. The `finally` block is what makes the second question answerable.

## Optimistic updates

```vue
<script setup lang="ts">
const props = defineProps<{
  readonly genre: string
  readonly waiting: number
}>()

const emit = defineEmits<{
  joined: [waiting: number]
}>()

const store = useLoansStore()

const member = ref('')
const message = ref<string | null>(null)
const optimistic = ref<number | null>(null)

// The value that is true now, or the one the pending request explains.
const shown = computed(() => optimistic.value ?? props.waiting)

async function join(): Promise<void> {
  const name = member.value.trim()

  if (name.length < 3) {
    message.value = 'Enter the member name.'
    return
  }

  // The count moves before the request lands, and the answer replaces it.
  optimistic.value = shown.value + 1

  const result = await store.join(props.genre, name)

  optimistic.value = null
  message.value = result.message

  if (result.waiting > 0) {
    emit('joined', result.waiting)
  }
}
</script>
```

```vue
<p>
  <strong>{{ shown }}</strong>
  {{ shown === 1 ? 'borrower is' : 'borrowers are' }} waiting for {{ genreLabel(genre) }}
  <span v-if="optimistic !== null" class="pending"> (saving)</span>
</p>
```

Vue has no `useOptimistic`. The pattern is three pieces of state and one computed, and it is worth having in your
hands because the framework-level version of it is exactly this:

- `props.waiting` is what the parent says is true.
- `optimistic` is the guess for a request in flight, or `null` when nothing is in flight.
- `shown` is the value to render: the guess if there is one, the prop otherwise.
- When the action settles, `optimistic` goes back to `null` and the honest value renders.

In the browser, the whole sequence took one click: the count went from 3 to 4 as the click landed, the message
"Ada Lovelace is on the list." replaced the saving hint, and the number the API answered with was the one left on
screen.

## The failing case is the interesting one

```ts
async function join(genre: string, member: string): Promise<WaitingState> {
  try {
    const backlog: Backlog = await requestWaitingList(member, genre)
    return { waiting: backlog.waiting, message: `${member} is on the list.` }
  } catch (failure) {
    return {
      waiting: 0,
      message: failure instanceof Error ? failure.message : 'The waiting list is unavailable.',
    }
  }
}
```

Because the store answers with the count and a message, the component has one path:

```ts
optimistic.value = null // the guess is gone, whatever happened
message.value = result.message
```

A failed join therefore drops the optimistic count and shows the reason, which is what a person expects from a button
that did not work. The store returning `waiting: 0` on failure only matters when the component wants to adopt it, and
here it does not: the prop is still the truth for a request that never landed.

The test pins both halves:

```ts
await wrapper.get('input').setValue('Ada Lovelace')
await wrapper.get('form').trigger('submit')

// the optimistic value, while the POST is still open
expect(wrapper.text()).toContain('3 borrowers are waiting for Poetry')

await flushPromises()

// the prop again, plus the message
expect(wrapper.text()).toContain('2 borrowers are waiting for Poetry')
expect(wrapper.text()).toContain('The waiting list could not be updated (status 500).')
```

A stub that answered with the same number in both cases would let that test pass whether or not the optimistic update
did anything. The number the stub returns is deliberately different from the guess.

## Where the API layer lives

```ts
export async function requestWaitingList(member: string, genre: string): Promise<Backlog> {
  const response = await fetch(`${base}/waiting-list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ member, genre }),
  })

  if (!response.ok) {
    throw new Error(`The waiting list could not be updated (status ${response.status}).`)
  }

  return (await response.json()) as Backlog
}
```

One module holds every request, and it knows four things: the base URL, the HTTP method, the check on `response.ok`
and the shape of the answer. The store calls it, the component calls the store, and a template never sees a `fetch`.
That split is what makes the store testable with a stubbed `fetch` and the component testable with a stubbed store.

## Check yourself

Add a `return` action that removes a member from the waiting list, with the same optimistic treatment in the other
direction, and write the two tests: one that shows the count dropping before the request lands, and one where the
request fails and the count comes back with the reason.
