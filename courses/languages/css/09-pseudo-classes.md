---
title: Pseudo-classes
summary: Selecting by position, by state and by relationship, and the three that decide ties.
chapter: Selectors and the cascade
minutes: 14
status: draft
---

## Position among siblings

```css
li:first-child       { }
li:last-child        { }
li:nth-child(2)      { }
li:nth-child(odd)    { }
li:nth-child(2n + 1) { }
li:nth-child(-n + 3) { }
li:nth-last-child(1) { }
li:nth-of-type(2)    { }
```

On a list of five items:

```text
count li:nth-child(odd)     -> 3
count li:nth-child(2n + 1)  -> 3
count li:nth-child(-n + 3)  -> 3
count li:nth-last-child(1)  -> 1
count li:nth-of-type(2)     -> 1
count li:first-child        -> 1
count li:last-child         -> 1
count li:only-child         -> 0
```

`odd` and `2n + 1` are the same thing written two ways, and they matched the same three items, which is a cheap way to confirm you have the arithmetic right. `-n + 3` is the first three, so counts of 1, 2 and 3 are all reachable with a formula rather than a class on every item.

Two of these are worth understanding rather than memorising:

- **`nth-child` counts all siblings; `nth-of-type` counts only siblings of the same element name.** In a list of only `li` elements the two agree, which is why the difference is invisible until a stray element appears. Add a `<div>` between items and `li:nth-child(2)` starts counting it while `li:nth-of-type(2)` does not.
- **`nth-last-child(1)` is the last child**, and it is how you style by position from the end, which `nth-child` cannot express.

`only-child` matched nothing because the list has five items. It matched one element elsewhere on the page, an `i` that is the only element in its container:

```text
count #lonely i:only-child   -> 1
count #lonely i:only-of-type -> 1
```

Both work there and they mean different things. `:only-child` requires no element siblings at all. `:only-of-type` requires no siblings of the same type, so it still matches when other element names are present. For a heading that is the only one in its section, `:only-of-type` is the one that does what you meant.

## Counting only some of the siblings

A newer form filters the sibling list before counting:

```text
count :nth-child(2n of .card)   -> 1
count li:nth-child(2 of .card)  -> 1
count .card:nth-child(2)        -> 0
supports selector(:nth-child(2n of .card)) -> true
```

The list holds items in the order card, plain, card, plain, card. The two forms disagree because they count different sets. `li:nth-child(2 of .card)` builds the list of siblings matching `.card` and takes the second, which is the third item in the document. `.card:nth-child(2)` asks whether a card is the second child, and no card is, so it matched nothing.

The gap between those two questions is real, and there was no way to ask the first one before `of`. It turns "style the second card" into a selector rather than a class.

## Negation and matching sets

```text
count li:not(.card)                  -> 2
count li:not(.card, :first-child)    -> 2
count .owls > .owl:not(:first-child) -> 2
count .has-child-parent:has(> .has-child) -> 1
```

`:not()` takes a list, so `li:not(.card, :first-child)` excludes cards and the first child in one selector rather than in two rules. It has a specificity consequence that the next lesson covers: `:not()` adds the specificity of its argument while `:where()` does not.

`:has()` is the relational one. Read from the element being tested, `:has(> .has-child)` means "has a child with this class", and on a page with two containers where only one had the child, exactly one matched. It is the selector for a parent, and the combinators lesson explains the relative-selector part.

`:empty` matched one element and means exactly what it says: no children at all, including no text. An element containing a space or a newline is not empty, which is the usual reason a rule using it does nothing.

## State

```text
count input:valid -> 1
```

A text input with no `required` and any value is valid, so one matched. The form chapter maps these states onto validation properly. The part that matters here is that a state pseudo-class is evaluated by the browser continuously, so it changes while the page is open and you cannot reproduce it by reading the stylesheet.

| Pseudo-class | True when |
| --- | --- |
| `:hover` | the pointer is over the element |
| `:focus` | the element has focus |
| `:focus-visible` | focus arrived by keyboard, roughly |
| `:active` | the element is being pressed |
| `:checked` | a checkbox or radio is checked |
| `:disabled` / `:enabled` | the control is disabled or not |
| `:valid` / `:invalid` | the control passes or fails its constraints |
| `:required` / `:optional` | the control carries the `required` attribute |
| `:target` | the element's id is the URL fragment |

`:focus-visible` is the one to prefer for focus rings. It tells a click apart from a keyboard Tab, so the ring appears for the person who needs it and stays out of the way for the person who does not. Removing the focus ring entirely is a real accessibility failure, and the accessibility chapter explains which of these states a keyboard user depends on.

`:target` is worth one sentence because it is the only one of the list driven by the URL rather than by interaction. It matches the element whose `id` equals the fragment, which is enough to build a tab strip with no script at all.

## The three that change specificity

```text
:is(.isClass, #isProbe)    -> is-later     (took the id's weight)
.not-arg-test:not(.zzz)    -> with-not     (the argument counted)
:where(#whereProbe)        -> id-first     (:where added nothing)
```

`:is()` and `:where()` take the same selector list and match the same elements:

```text
count :is(li, p)    -> 6
count :where(li, p) -> 6
```

Six elements either way, five list items and a paragraph. What differs is the specificity they contribute. `:is()` takes the weight of its most specific argument, even when that argument is the one that did not match. `:where()` contributes zero. So the same match can be a heavyweight rule or an invisible one, and picking between them is picking which.

The practical split:

- Use `:is()` when the rule should compete normally, and use it to shorten a long selector list.
- Use `:where()` for a reset or a default that must never beat anything.

The second is why resets are written with `:where()`. A reset that outranks your own rules later in the document is worse than no reset at all, because the fix looks like it should work.

## Check yourself

Write one selector that styles every list item except the first and the last, and one that styles every third item. Then write a rule that styles a card only when it contains an image, using `:has()`. Finish by rewriting a rule that uses `:where()` with `:is()` and predicting whether it still wins against a class selector.
