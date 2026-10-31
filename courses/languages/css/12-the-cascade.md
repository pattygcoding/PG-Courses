---
title: The cascade
summary: The four comparisons in order, the six origins, and the keywords that put a value back.
chapter: Selectors and the cascade
minutes: 15
status: draft
---

## Four comparisons, in order

For each element and each property, the browser collects every declaration that could apply and sorts them by four criteria. The first one that separates any two declarations decides, and the rest are never consulted.

| Order | Compared | Covered by |
| --- | --- | --- |
| 1 | origin and importance | this lesson |
| 2 | cascade layer | this lesson |
| 3 | specificity | the previous lesson |
| 4 | order of appearance | this lesson |

Read that as a hierarchy and the confusing cases become ordinary. A rule with a lower specificity can beat a higher one because it sits in a later layer. A rule in a later layer can lose to one in an earlier layer because it is `!important`. Specificity is the third question asked, and treating it as the first is the source of most of the time people spend on a stylesheet that will not move.

## Origin

The origin is where the stylesheet came from, and there are three: the user agent's, the reader's, and yours. Each of the six combinations has its own priority:

| Priority | Origin and importance |
| --- | --- |
| 1 (highest) | user agent, important |
| 2 | user, important |
| 3 | author, important |
| 4 | author, normal |
| 5 | user, normal |
| 6 (lowest) | user agent, normal |

Two things fall out of that table. Your normal rules beat the browser's defaults, which is the entire premise of the language and the reason a stylesheet works at all. And your important rules beat a reader's normal rules, while your normal rules lose to a reader's important ones, which means a reader can always have the last word on their own browser and never has to argue with you.

The user agent's origin is the one I measured in the first chapter, where a heading's margin came out at `21.44px` because the browser's own rule says `0.67em`. I tried to load a stylesheet in the user origin to measure the rest of the table and the browser's headless mode ignored the flag, so the ordering above is the specification's rather than something I printed. Everything else in this lesson is measured.

## Importance

```text
#imp-id against .imp-class !important   -> class-important
.i-plain against the style attribute    -> inline
.i-vs-important !important against it   -> sheet-important
the style attribute with !important     -> inline-important
```

`!important` does not add specificity and it does not change which selector matched. It moves the declaration into a higher band of the origin comparison, and inside that band specificity resumes. The four measured lines above are the four bands for author declarations, in order: inline important, then important, then normal inline, then normal.

It follows that `!important` is not a fix for a specificity problem. It is a fix for exactly one situation, which is a declaration you cannot otherwise reach, and every use of it raises the stakes for the next person who has to override you.

## Layers

A layer is a named group of rules whose order you declare once:

```css
@layer reset, base, components, utilities;
```

The name list sets the order, and the blocks can appear anywhere after it. Three measurements on one page show what that buys:

```text
normal-probe        -> "theme-normal"    (a class in @layer theme beat an id in @layer base)
important-probe     -> "base-important"  (a class in @layer base beat an id in @layer theme)
unlayered-important -> "base-layer"      (a layered important beat an unlayered important)
```

The first line is the rule. `@layer base, theme` puts `theme` later, so `theme` wins for normal declarations and the id in `base` does not matter, because layers are compared before specificity. Making a specificity fight unnecessary is the whole point of a layer.

The second line is the same rule with the order reversed, and this is the part that catches people out: **for important declarations, the layer order is inverted**. The class in the earlier layer beat the id in the later one. The reasoning matches the origin inversion: importance is meant to protect whoever has the least control, and the layer meant to be easiest to override gets the strongest important declarations.

The third line follows from the second. A normal declaration outside every layer beats every normal declaration inside one, which is convenient because ad hoc rules still work. An important declaration outside every layer loses to a layered important one, which is the opposite of what the same author would expect from the line above it.

Layers are the tool for the problem `!important` used to be reached for. A reset in its own layer, a framework in another, and your own rules unlayered gives you an order you declared rather than one you discover.

## Appearance

The last comparison is the least interesting and the one people reach for first: if everything else is equal, the later declaration wins.

```text
.order winner -> "third"    (three identical rules)
```

Two rules with the same selector, the same specificity and no layers resolve by position, and a rule appearing twice in one file is the same situation across two files. Order matters across link elements as well, so where a `<link>` sits relative to a `<style>` element is a real decision.

## Inheritance happens before the cascade

Inheritance and the cascade are different mechanisms, and separating them explains a lot, because a property's behaviour depends on which one supplies its value.

**Inherited properties** take their value from the parent when nothing else supplies one: `color`, the `font-*` family, `line-height`, `visibility`, `cursor`, `list-style-*` and the `text-*` family. **Non-inherited properties** take their initial value instead: `margin`, `padding`, `border`, `display`, `background`, `width` and the rest of the box.

A margin defaults to `0` and a colour defaults to "whatever the parent is", and that single difference explains most of what looks arbitrary in a stylesheet. It also explains the `em` behaviour from the first chapter: `font-size` inherits, so a length in `em` resolves against a value that came from an ancestor, and `rem` is the escape from that chain.

The `inherit` keyword makes any property inherit, including one that does not by default, which is how a `button` or an `input` gets the page's font:

```css
button, input { font: inherit; }
```

## The keywords that put a value back

Every property accepts five keywords that reach outside the normal flow of the cascade:

| Keyword | Effect |
| --- | --- |
| `inherit` | the parent's computed value, inherited or not |
| `initial` | the property's initial value, from the specification |
| `unset` | `inherit` for inherited properties, `initial` for the rest |
| `revert` | roll back to the value from the previous origin |
| `revert-layer` | roll back to the value from the previous layer |

The four of them on one heading, where the user agent's own rule says `margin-top: 0.67em`:

```text
h1#kw-revert  -> margin-top=21.44px    (back to the browser's rule)
h1#kw-unset   -> margin-top=0px        (margin is not inherited, so initial)
h1#kw-initial -> margin-top=0px
h1#kw-inherit -> margin-top=8px        (the body's margin)
```

`revert` and `unset` differ, and this is the pair to understand. `unset` finds the initial value, which for `margin` is zero. `revert` rolls the declaration back to whatever the previous origin said, which for a heading is the browser's `0.67em`, so the margin returns as `21.44px`. In a stylesheet with no reset above it the difference is small. In one with a reset, `revert` is how you deliberately opt back out.

The `all` shorthand applies a keyword to every property at once, and it makes the distinction unmistakable:

```text
h1#all-initial -> margin-top=0px     font-size=16px    margin-bottom=0px
h1#all-unset   -> margin-top=0px     font-size=16px    margin-bottom=0px
h1#all-revert  -> margin-top=21.44px font-size=32px    margin-bottom=21.44px
```

`all: initial` gives a heading the initial font size of 16px, so it stops looking like a heading. `all: revert` gives back the browser's heading style, 32px with the wider margins. One of those is a debugging tool and the other is a way to hand a component back to the browser's defaults.

The place this matters in practice is form controls, which do not inherit their font. That is why a `button` on an otherwise styled page computes to Arial at 13.3333px from the first chapter's measurements while everything around it is in the page's own font. One rule fixes it for every control at once:

```css
button, input, select, textarea { font: inherit; }
```

That is `inherit` doing work no amount of specificity could, because the problem is not that a rule is losing. It is that no rule matched.

## Reading a value that is not what you wrote

The order to check, which is the cascade's own order:

1. Did the declaration survive parsing? In the Computed tab, a property that is absent entirely was dropped.
2. Is the value the initial or the inherited one? Then the declaration was dropped, or it is invalid after substitution.
3. Is another origin or a layer winning? The Styles pane marks the winning declaration and strikes through the losers, which answers this faster than reasoning about it.
4. Is it specificity, or order? Same pane, same answer.

That is a search that ends, which is the difference between this and trying rules until something moves.

## Check yourself

Put a reset in a layer and a component's own rule unlayered, then make the component's rule lose without changing its specificity. Take a heading with `all: initial` and add back the browser's values one at a time until it looks like a heading again. Finish by explaining why a layered `!important` beats an unlayered `!important`, and what that means for a reset whose rules use `!important`.
