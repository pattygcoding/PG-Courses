---
title: Reactive forms and custom controls
summary: The form API that is still everywhere, its FormArray, and the ControlValueAccessor contract that connects a component to it.
chapter: Forms
minutes: 15
status: draft
---

## A typed form with rows that come and go

```ts
export class ReservationForm {
  private readonly builder = inject(FormBuilder);

  protected readonly saved = signal('');

  protected readonly reservation = this.builder.nonNullable.group({
    holder: ['', [Validators.required, Validators.minLength(3)]],
    lines: this.builder.array([this.newLine()]),
  });

  protected get holder() {
    return this.reservation.controls.holder;
  }

  protected get lines() {
    return this.reservation.controls.lines;
  }

  protected addLine(): void {
    this.lines.push(this.newLine());
  }

  protected removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  protected save(): void {
    const value = this.reservation.getRawValue();
    this.saved.set(value.lines.length === 1 ? 'one line' : `${value.lines.length} lines`);
  }

  private newLine() {
    return this.builder.nonNullable.group({
      genre: ['', Validators.required],
      count: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    });
  }
}
```

```html
<form [formGroup]="reservation" (ngSubmit)="save()">
  <label for="holder">Member</label>
  <input id="holder" formControlName="holder" />
  @if (holder.invalid && holder.touched) {
    <p role="alert">Enter the member name, three characters or more.</p>
  }

  <div formArrayName="lines">
    @for (line of lines.controls; track $index) {
      <fieldset [formGroupName]="$index">
        <legend>Line {{ $index + 1 }}</legend>

        <label [attr.for]="'genre-' + $index">Genre</label>
        <input [id]="'genre-' + $index" formControlName="genre" />

        <label [attr.for]="'count-' + $index">Copies</label>
        <app-count-stepper [id]="'count-' + $index" formControlName="count" />

        <button type="button" (click)="removeLine($index)">Remove line</button>
      </fieldset>
    }
  </div>

  <button id="add-line" type="button" (click)="addLine()">Add a line</button>
  <button type="submit" [disabled]="reservation.invalid">Reserve</button>
</form>
```

Four details in those two files are the reactive forms vocabulary:

- `nonNullable.group` and `nonNullable.array` mean a control's value can never be `null`, which removes
  `| null` from every read of `value`.
- `formGroupName` and `formArrayName` bind a subtree of controls to a subtree of the template, which is
  what makes the `@for` over `lines.controls` work.
- `getRawValue()` returns the value of disabled controls as well as enabled ones. `value` skips the
  disabled ones, which is a real difference when a form disables a field rather than hiding it.
- `holder.touched` is false until the control has been blurred, so the message under an input does not
  appear while the person is still filling it in. I wrote the test without dispatching `blur` first and
  got no message at all, which is the behaviour rather than a bug.

## A component that plugs into a form

```ts
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

/**
 * A stepper that plugs into reactive forms by implementing the
 * ControlValueAccessor contract and registering itself as a value accessor.
 */
@Component({
  selector: 'app-count-stepper',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CountStepper), multi: true },
  ],
  template: `
    <button type="button" (click)="step(-1)" aria-label="One fewer">Fewer</button>
    <output>{{ count() }}</output>
    <button type="button" (click)="step(1)" aria-label="One more">More</button>
  `,
})
export class CountStepper implements ControlValueAccessor {
  protected readonly count = signal(1);
  protected readonly disabled = signal(false);

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.count.set(value ?? 1);
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected step(delta: number): void {
    this.count.update((value) => Math.max(1, value + delta));
    this.onChange(this.count());
    this.onTouched();
  }
}
```

The four methods are the whole contract. `writeValue` is called by the form when the model changes,
`registerOnChange` hands over the function the component calls when the person edits,
`registerOnTouched` does the same for blur, and `setDisabledState` reports the disabled flag. `multi:
true` on the provider is what lets several accessors coexist, and `forwardRef` breaks the circular
reference between the class and its own metadata.

`formControlName="count"` on `app-count-stepper` then works like it does on an `<input>`:

```ts
const more = fixture.nativeElement.querySelector(
  'app-count-stepper button[aria-label="One more"]',
) as HTMLButtonElement;
more.click();
more.click();
await TestBed.inject(ApplicationRef).whenStable();

expect(form.reservation.value.lines[0]?.count).toBe(3);
```

A component written this way works in a reactive form, a template-driven form and a signal form, because
`FormField` provides a small `NgControl` shim for exactly that interoperability.

Signal forms have their own control contract, and the names are worth knowing:
`FormValueControl<T>`, `FormCheckboxControl` and `FormUiControl` describe the value, the touched output
and the focus and reset hooks a custom control implements. The `FORM_FIELD` token is how a control reads
the field state it is bound to.

## When to keep reactive forms

- The form already exists. A migration rewrites validation and state, and it buys nothing for a form
  that works.
- The form needs a `FormArray` shaped by the data, and everyone on the team knows that API.
- A third-party control only implements `ControlValueAccessor`. Signal forms consume it for
  compatibility, and reactive forms are its native home.

For new work, signal forms are the better default in v22: the model is typed, the validation is a
function rather than a directive, and the state is a signal that change detection already understands.

## Check yourself

Add a cross-field validator to the reservation that rejects a member name that appears in two lines, and
register it on the group rather than on a control. Then add a `setValue` call from a button and watch
whether the page updates, and fix it with `markForCheck` or by binding a signal instead.
