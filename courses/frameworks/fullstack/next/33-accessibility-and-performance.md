---
title: Accessibility and performance
summary: The three numbers a visitor feels, and the markup the framework does not do for you.
chapter: Quality
minutes: 13
status: draft
---

## Three numbers

Core Web Vitals are three measurements, and each one maps to a decision this course already made:

| Metric | Measures | What moves it in this application |
| --- | --- | --- |
| LCP | when the largest element is painted | the static shell and the streamed boundaries |
| INP | how fast the page answers an interaction | how much JavaScript was hydrated |
| CLS | how much the layout moved while loading | reserved space, sized images, matched font metrics |

The first and second are the arguments for the architecture of the whole course. A page whose shell is prerendered paints
sooner than one that waits on data, and a page whose client bundle is three forms is quicker to respond than one whose whole
tree is interactive. Building the catalogue with server components is a performance decision before it is a tidiness one.

## What the framework does

- **Route announcements.** Client-side navigation moves focus and announces the change, which is the one thing a
  single-page application usually breaks.
- **Image sizing.** `next/image` reserves the space, which is the largest cause of layout shift in most applications.
- **Font metrics.** A font loaded with `next/font` is adjusted so the swap does not move the text.
- **Focus on error.** The error boundary and the not-found page are rendered in place, so the visitor stays where they were in
  the tab order.

Each of those is a bug that was fixed once, in the framework, for everybody. They are the reason to use the built-in
components rather than the plain HTML equivalents, and none of them replaces the next section.

## What you still have to write

The application has five accessibility decisions in it, and all five are yours:

```tsx
<p className="count" aria-live="polite">
  {optimistic.length} waiting
</p>
```

The waiting list count changes without a navigation, and `aria-live` is what tells a screen reader to mention it. Without it
the change happens silently for anyone not looking at the screen.

```tsx
<p className="errors" role="alert">
  {state.error}
</p>
```

`role="alert"` announces an error as soon as it appears, which is what a form message needs. `role="status"` does the same
politely, and is what the success notice uses.

```tsx
<form className="stack" action={formAction} aria-busy={isPending}>
```

`aria-busy` on the form tells assistive technology that the region is updating. The visible version of the same thing is the
button that says "Recording...", and a page needs both.

```tsx
<label htmlFor="member">Member name</label>
<input id="member" name="member" required minLength={3} />
```

A `label` with `htmlFor` is what makes the input discoverable, and it is also what makes the tests able to find it with
`getByLabelText`. Two problems, one fix.

```tsx
<Link href={href} aria-current={isCurrent ? "page" : undefined}>
```

An active navigation link is a state, not a colour, and `aria-current` is the attribute that carries it.

## Headings and landmarks

The structure is worth checking once per page, because it is what a screen reader navigates by:

```text
banner        the header
navigation    the nav
main          the page content
h1            one per page, the page's subject
h2            the sections inside it
contentinfo   the footer
```

This application uses `<header>`, `<nav>`, `<main>` and `<footer>` for the landmarks, which is why the end-to-end test can
assert `page.getByRole("banner")` and be confident it found the header rather than a div with a class.

## Measuring

Two tools, and they answer different questions:

| Tool | Answers |
| --- | --- |
| Lighthouse, in the browser's audit panel | how a single page scores, with the reasons |
| the Performance panel, recorded | where the time actually went, request by request |

A Lighthouse run on a page of this application reports the accessibility and SEO checks as a list of things to fix, and the
performance score as a number driven mostly by what the server sent. The score is a summary; the list is the work.

The measurement that matters most is one you set up yourself, on the pages that matter, with the network throttled. A page that
scores well on a laptop with a fast connection can still be unusable on a phone in a lift.

## The order to fix things in

1. Ship less JavaScript, which is what the server components page is about.
2. Reserve space, which is what the images and fonts page is about.
3. Stream what is slow, which is what the boundaries are about.
4. Then measure again, because the first three change the number and the guesses did not.

## Check yourself

Run a Lighthouse audit on the catalogue page and on the book page. Then take the optimisation that the report suggests and
decide, for each one, whether it is a framework setting or a rule that belongs in the lint config so that it cannot come
back.
