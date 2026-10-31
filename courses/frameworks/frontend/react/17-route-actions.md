---
title: Route actions
summary: The router owns the form, the action owns the rules, and the component renders what came back.
chapter: Forms and actions
minutes: 14
status: draft
---

## The action in the route table

```tsx
import { createBrowserRouter, redirect } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      {
        path: 'loans/new',
        element: <LoanForm />,
        loader: () => fetchBooks(),
        action: async ({ request }: ActionFunctionArgs) => {
          const loan = readLoan(await request.formData());
          const errors = validate(loan);

          if (Object.keys(errors).length > 0) {
            return { errors, loan } satisfies LoanActionResult;
          }

          const receipt = await requestLoan(loan);

          return redirect(
            `/loans/thanks?member=${encodeURIComponent(loan.member)}&dueOn=${receipt.dueOn}`,
          );
        },
      },
      { path: 'loans/thanks', element: <LoanThanks /> },
    ],
  },
];
```

An action is a function the router calls when a form submits, with the request in hand. It returns one of
three things:

| Returned | What the router does |
| --- | --- |
| data, such as `{ errors, loan }` | stays on the page, and the component reads it with `useActionData` |
| a `Response` or a redirect | navigates, and the loaders for the new route run |
| nothing | re-runs the loaders for the current route, which is the refresh case |

The action reads the form with `request.formData()`, which is the same `FormData` the browser builds for a
native POST. That is the point of the pattern: the component does not collect the values, translate them into
an object and pass an object to a function. The form sends itself.

## The form submits to the router

```tsx
<Form method="post" noValidate>
  {/* fields with names */}
  <button type="submit" disabled={submitting}>
    {submitting ? 'Recording' : 'Record loan'}
  </button>
</Form>
```

```tsx
import { Form } from 'react-router';
```

`Form` is a `<form>` that hands the submission to the router instead of letting the browser navigate away.
`method="get"` would put the field values in the URL and call the route's loader; `method="post"` calls the
action. A plain `<form>` still works in a React application, and its submit handler has to read the values,
validate them and call the API itself, which is the version the last page showed.

The `noValidate` attribute is worth keeping through the change. A `<Form>` in data mode runs on the client, so
the browser's own validation bubbles would still appear before the action saw anything.

## Reading the result

```tsx
const result = useActionData() as LoanActionResult | undefined;
const errors = result?.errors ?? {};
const days = result?.loan.days ?? 14;
```

```ts
export interface LoanActionResult {
  readonly errors: LoanErrors;
  readonly loan: Loan;
}
```

The types live next to the component and the route table imports them, so the action and the component cannot
drift. The `satisfies` in the action is what makes that check happen at the point the value is built, rather
than three files away when the page is opened.

`useActionData` is `undefined` before the first submission, which is why every read from it has a fallback.
Passing the submitted loan back means a failed submission renders the values the person typed rather than an
empty form, which is the difference between a form that remembers and one that punishes.

## Pending state

```tsx
const navigation = useNavigation();
const submitting = navigation.state === 'submitting';
```

`useNavigation` describes the navigation in flight: `idle` when nothing is happening, `loading` while a
loader runs, `submitting` while an action does. In the browser check for this course the button read
"Recording" and was disabled while the POST was open, and the page stayed on the form until the action
returned a redirect.

The same value drives the progress line in the layout:

```tsx
{navigation.state !== 'idle' && (
  <p className="pending shell" role="status">
    Loading the next page...
  </p>
)}
```

That is the fix for the most complained about property of a client side application: a click that produces no
visible change for 400 ms looks broken. The indicator is one line, and `role="status"` means a screen reader
hears it too.

## The three ways to send a form

| Shape | Runs | Best for |
| --- | --- | --- |
| `onSubmit` handler | client | a dialog with nowhere to go |
| `<Form method="post">` with a route action | client, through the router | a page whose result is a navigation or a validation error |
| `<form action={fn}>` with a React action | client, through React | a widget that updates in place |

The third one is the subject of the next page. The second is the one to reach for when the form's outcome is a
new page, because the router already knows how to navigate, how to re-run loaders and how to render an error
element when the action throws.

One thing this setup does not give you: because the action runs in the browser, a form still does nothing with
JavaScript turned off. A framework that can run actions on the server, React Router's own framework mode or
Next.js, gets progressive enhancement from the same code.

## Check yourself

Move the waiting list form from the book page into a route with a `<Form method="post">` and an action, and
compare the number of lines with the version on the next page. Then make the action throw a `Response` with a
500 status and see what the route's `errorElement` renders.
