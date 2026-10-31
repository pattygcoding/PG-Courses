---
title: Type, class and id selectors
summary: Three ways to name an element, and why the id is the wrong one to style with.
chapter: Selectors and the cascade
minutes: 12
status: draft
---

## The three simple selectors

```css
p        { }   /* every paragraph                                    */
.card    { }   /* every element whose class list contains "card"      */
#intro   { }   /* the element whose id is "intro"                     */
```

```text
count p            -> 16
count P            -> 16
count .CaseClass   -> 1
count .caseclass   -> 0
count #CaseId      -> 1
count #caseid      -> 0
```

Element names are matched case-insensitively, so `P` and `p` are the same selector. Class names and ids are matched exactly, because the document chose those spellings and the HTML standard makes them case-sensitive. `.caseclass` matched nothing while `.CaseClass` matched one, and nothing in the stylesheet will tell you which spelling the markup used.

## A class is a list, not a string

```html
<p class="card wide">A wide card</p>
```

```text
count [class~='card']    -> 2
count [class~='car']     -> 0
count [class*='card']    -> 3
count .card              -> 2
```

The `class` attribute holds a whitespace-separated list of names. `.card` is shorthand for `[class~='card']`, which matches a complete name in the list, and both matched the same two elements. `[class*='card']` matched three, including one with `class="cardigan"`, because `*=` is a substring test. Reaching for `*=` when you meant `.card` is how a rule ends up styling an element you have never looked at.

An element can carry several classes, and a compound selector asks for all of them:

```html
<p id="two-classes" class="card wide">two classes</p>
```

```text
count .card        -> 2
count p.card       -> 2
count p#plain.card -> 0
```

`p.card` narrows to paragraphs that also have the class, and it is the form to write when you mean both. `p#plain.card` matched nothing here because the element with `id="plain"` has no class, which is a useful reminder that a compound selector is a conjunction and not a list.

## An id names one element

An `id` must be unique in the document. It is what a fragment link points at, what `getElementById` takes, and what a form label's `for` refers to, so a duplicate breaks three things at once. The parser will not complain, and this is the kind of error the HTML course's validator catches rather than the browser.

Because an id is unique, styling by id means the rule can never apply to more than one element, and the specificity is the highest of any selector you can write. That combination is why the practice is avoided:

| Selector | Specificity | Can it be reused? |
| --- | --- | --- |
| `p` | (0, 0, 1) | yes, every paragraph |
| `.card` | (0, 1, 0) | yes, wherever the class is |
| `#intro` | (1, 0, 0) | no, one element |
| `style="..."` | higher than all three | no, one element |

The last row is the one that matters. An id selector outranks any number of classes, so a rule that needs to override `#intro` has to add an id of its own or an `!important`, and both are ways of losing an argument with your own stylesheet. I use classes for styling and reserve ids for the three jobs that need one target.

Specificity is worth previewing here because it decides everything after it. I measured each of these against the others:

```text
#imp-id vs .imp-class !important  -> class-important     (importance outranks specificity)
#spec-id vs .spec-class           -> id
.spec-class vs p.spec-class       -> type-and-class
```

The chapter's fourth lesson has the full system. For now the ranking is enough: id, then class, then element name.

## The universal selector

```text
count * -> 27
```

`*` matches every element, and it carries no specificity. It is useful in three places: a reset, a debugging outline, and a descendant combinator.

```css
* { box-sizing: border-box; }

* { outline: 1px solid red; }
```

The second one is the fastest way to see the real boxes on a page, and it is worth knowing before the box model chapter. The cost of `*` is that it matches every element the browser has built, including ones you have not thought about, so it is a poor way to set a default that should inherit. Setting `font-family` on `*` rather than on `body` means an element that should inherit a different font cannot, because the universal rule applies to it directly.

## Combining them

```css
a                /* every link                                     */
.card            /* every element with the class                    */
.card a          /* every link inside a card, at any depth          */
.card > a        /* every link that is a direct child of a card     */
p.card.wide      /* a paragraph with both classes                   */
```

A **simple selector** is one part; a **compound selector** is several with no space between them, all applying to the same element; a **complex selector** is several joined by combinators. The combinator lesson covers all four of those.

## Check yourself

Write a class list of three names on one element and four selectors that match it: one by class, one by element and class, one by two classes, and one that fails. Then find a page you have written, look for an id used in a selector, and work out what would have to be added to override it. Finish by explaining why `*` is a reasonable reset and a bad place for `font-family`.
