---
title: Testing routes, guards and forms
summary: Navigating for real in a test, stubbing the route table for a guard, and typing into a form.
chapter: Testing
minutes: 14
status: draft
---

## Navigating without a browser

```ts
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import type { Routes } from '@angular/router';
import { Session } from './session';
import { signedIn } from './signed-in.guard';

@Component({ selector: 'app-stub-catalogue', template: '<p>catalogue</p>' })
class StubCatalogue {}

@Component({ selector: 'app-stub-loans', template: '<p>new loan</p>' })
class StubLoans {}

@Component({ selector: 'app-stub-greeting', template: '<p>{{ message() }}</p>' })
class StubGreeting {
  readonly message = input.required<string>();
}

const STUB_ROUTES: Routes = [
  { path: 'books', component: StubCatalogue },
  { path: 'loans/new', canActivate: [signedIn], component: StubLoans },
  {
    path: 'greeting',
    component: StubGreeting,
    resolve: { message: () => Promise.resolve('hello from the resolver') },
  },
];

describe('signedIn guard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(STUB_ROUTES, withComponentInputBinding())],
    });
  });

  it('lets a signed in member through', async () => {
    const harness = await RouterTestingHarness.create('/loans/new');

    expect(harness.routeNativeElement?.textContent).toContain('new loan');
  });

  it('sends a signed out visitor to the catalogue', async () => {
    TestBed.inject(Session).signOut();

    await RouterTestingHarness.create('/loans/new');

    expect(TestBed.inject(Router).url).toBe('/books');
  });

  it('binds resolved data into an input of the same name', async () => {
    const harness = await RouterTestingHarness.create('/greeting');

    expect(harness.routeNativeElement?.textContent).toContain('hello from the resolver');
  });
});
```

`RouterTestingHarness.create(url)` performs a real navigation through the real router and returns an
object with the rendered element and the fixture. That is enough to test a guard, a resolver and the
input binding, and nothing about the router is stubbed.

The members worth knowing on it:

| Member | What it is |
| --- | --- |
| `routeNativeElement` | the element of the routed component |
| `routeDebugElement` | the debug element, with `componentInstance` when a test needs the class |
| `fixture` | the fixture for the host, for `whenStable` and `detectChanges` |

The stub components are the point of that file. Testing a guard through the real catalogue component
would pull in its resource, its requests and its templates, and none of them is what the guard does. The
route table for a guard test should be the smallest one that reaches the guard.

## The one thing RouterTestingHarness catches for you

Reading a required input before the router has bound it:

```text
Error: NG0950: Input "id" is required but no value is available yet.
```

That is what `routeDebugElement?.componentInstance` gives you if the test reads `id()` immediately after
`create()` on a lazily loaded route. The binding is not broken; it is written during the first change
detection after the navigation. Awaiting `fixture.whenStable()` before reading, or asserting on the
rendered text instead of the class, avoids it.

## A form test drives the DOM

```ts
it('posts the loan once the fields are filled in', async () => {
  const fixture = TestBed.createComponent(LoanForm);
  await TestBed.inject(ApplicationRef).whenStable();

  typeInto(fixture, '#member', 'Ada Lovelace');
  typeInto(fixture, '#days', '21');
  pickOption(fixture, '#book', 'dune');
  await TestBed.inject(ApplicationRef).whenStable();

  submitButton(fixture).click();
  await TestBed.inject(ApplicationRef).whenStable();

  expect(catalog.borrow).toHaveBeenCalledWith({
    member: 'Ada Lovelace',
    days: 21,
    bookId: 'dune',
  });
  expect(fixture.nativeElement.textContent).toContain('Due back on 2026-11-14.');
});

function typeInto(fixture: { nativeElement: HTMLElement }, selector: string, value: string): void {
  const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/** A browser fires both events when a select changes, so the test does too. */
function pickOption(fixture: { nativeElement: HTMLElement }, selector: string, value: string): void {
  const select = fixture.nativeElement.querySelector(selector) as HTMLSelectElement;
  select.value = value;
  select.dispatchEvent(new Event('input'));
  select.dispatchEvent(new Event('change'));
}
```

Three details in there are worth copying:

- Setting `.value` on an input notifies nothing. The `input` event is what the form directive listens to,
  so the test dispatches it.
- A `<select>` fires `input` and `change`. Dispatching only `change` left the model untouched in the
  first version of this test, and the assertion failed with nothing pointing at the event.
- `touched` stays false until a field is blurred. A test that expects a validation message after typing
  has to dispatch `blur` as well, or submit the form, which marks everything touched.

A signal forms control is bound with `[formField]`, so a test can also drive it through the model:

```ts
const draft = TestBed.inject(LoanDraft);
draft.model.set({ member: 'Ada Lovelace', bookId: 'dune', days: 21 });
await TestBed.inject(ApplicationRef).whenStable();
```

That is faster and less realistic. I write the DOM version for the form's own behaviour and the model
version for a test about something downstream of the form.

## Testing a rule on its own

A schema is a function over a signal, and `form` needs an injection context, so a test supplies one:

```ts
it('applies a rule only while its condition holds', () => {
  const model = signal<Draft>({ days: 10, reason: '' });
  const draft = TestBed.runInInjectionContext(() =>
    form(model, (path) => {
      applyWhen(path.days, ({ value }) => value() > 7, (days) => {
        max(days, 14, { message: 'At most 14 days.' });
      });
    }),
  );

  expect(draft.days().errors()).toHaveLength(0);

  model.set({ days: 30, reason: '' });

  expect(draft.days().errors()[0]?.message).toBe('At most 14 days.');
});
```

No fixture, no template, no ticks. Calling `form()` outside an injection context throws
`NG0203: inject() must be called from an injection context`, which is the error that sentence about
`runInInjectionContext` exists to explain.

The rule about two fields is the same shape, with `validateTree` on the parent path:

```ts
it('reports a rule about two fields on their parent', () => {
  const model = signal<Draft>({ days: 30, reason: '' });
  const draft = TestBed.runInInjectionContext(() =>
    form(model, (path) => {
      validateTree(path, ({ value }) => {
        const booking = value();
        return booking.days > 14 && booking.reason.trim().length === 0
          ? { kind: 'reason-required', message: 'A long loan needs a reason.' }
          : undefined;
      });
    }),
  );

  expect(draft().errors().map((error) => error.message)).toContain('A long loan needs a reason.');
});
```

That is the cheapest test in this course to write, and the reason validation belongs in a schema rather
than spread through a template.

## Check yourself

Write a guard test for `bookExists` with a stub route table and a stubbed catalogue, covering the
redirect and the allowed case. Then write a test for the reservation form that adds a line, fills both
lines and asserts the value posted to the API.
