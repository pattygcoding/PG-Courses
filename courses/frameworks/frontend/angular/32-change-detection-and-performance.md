---
title: Change detection and performance
summary: OnPush, the deferral already in the template, and the two numbers a build gives you for free.
chapter: Performance and accessibility
minutes: 14
status: draft
---

## Two strategies, and what each one costs

```ts
export enum ChangeDetectionStrategy {
  OnPush = 0,
  Eager = 1,
  Default = 1, // the older name for Eager
}
```

That is the enum from the installed framework, printed from its module. The distinction is worth being
precise about:

- **OnPush** means the component is checked when one of the things it read has changed: a signal it read
  in the template, an input it received, an event in its own template. Between those moments it is
  skipped entirely.
- **Eager** (still accepted as `Default`) means the component is checked on every change detection run
  of its parent.

In a zoneless application with signals, a component that reads only signals and inputs is already
correct under either strategy, and the difference is mostly about how much is skipped. I set `OnPush`
explicitly on the pages in this course for two reasons: it documents the intent, and it turns a mutable
field added later into a bug that a reviewer sees rather than one that ships.

```ts
@Component({
  selector: 'app-book-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
```

The cost of OnPush is real: a component that mutates an object in place, or that reads a plain field
written by a `setInterval`, is not checked and does not update. The fix is a signal write or
`markForCheck`, and both are a clue that the state model was wrong rather than the strategy.

## The framework can tell you when an update would be missed

Developer preview, and useful while migrating:

```ts
provideCheckNoChangesConfig({ exhaustive: true, interval: 500 })
```

With that provider in place, Angular periodically verifies that no binding was updated without a
notification and throws `ExpressionChangedAfterItHasBeenCheckedError` when it finds one. It is the
closest thing to a linter for "this component is not reactive yet", and the plan is to run it in a test
job rather than in production.

## What you get for free from the template

Three habits, all introduced earlier in this course, cover most of the wins:

| Habit | Where | Effect |
| --- | --- | --- |
| `track book.id` in `@for` | the control flow page | rows are reused instead of rebuilt |
| new objects in a signal | the signals page | a change is a change, and `Object.is` agrees |
| `@defer (on viewport)` | the lazy loading page | the chunk and its dependencies arrive later |

The one that people skip is the second, and it is the one that makes a big list janky. A signal holding
an array that is sorted in place notifies nothing and re-renders nothing, and the page slowly falls out
of step with the model. Spreading the array costs an allocation and removes the class of bug.

## Images

```html
<img ngSrc="cover/dune.jpg" width="240" height="360" priority alt="Cover of Dune" />
```

`NgOptimizedImage` from `@angular/common` does three things a plain `<img>` does not: it requires width
and height, so the layout does not shift while the image arrives, it sets `loading="lazy"` and
`decoding="async"` by default, and `priority` on one image per page marks it as the largest contentful
paint so it is preloaded and fetched with a high priority. The import goes in the component's `imports`
array like any other directive.

## The build is the performance report

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-XXXXXXXX.js    | main          | 294.73 kB |                82.08 kB

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-XXXXXXXX.js   | loan-form     |  64.27 kB |                16.20 kB
chunk-XXXXXXXX.js   | shelf-summary |    541 bytes |               541 bytes
```

Budgets in `angular.json` turn that table into a gate:

```json
{ "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
{ "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
```

The reason to care about the raw size next to the transfer size is compression. 294.73 kB of JavaScript
arrives as 82.08 kB over the wire, and the parse cost is paid on the raw number. A budget that only
watched the transfer size would let a large dependency through.

## Measuring rather than guessing

Three tools, in the order I reach for them:

- the build table, for the size of what ships and where it went,
- the browser's performance panel and Lighthouse, for the load and the interaction cost,
- the framework's change detection profiler in Angular DevTools, for how much work a click causes.

A component that re-renders a thousand rows on every keystroke is a bigger problem than a 20 kB library,
and only the last of those three tools shows it. The fix usually belongs in the template: a computed
instead of a method call, or a `track` expression that stops the rows being rebuilt.

## Check yourself

Take the catalogue and set `ChangeDetectionStrategy.Eager` on the list component, then type in the
search box with the change detection profiler open and compare the number of checks with the OnPush
version. Then remove the `track` from the `@for` and watch the same profile.
