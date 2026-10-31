---
title: Specificity
summary: The four-part score, how each selector type scores, and the three that break the arithmetic.
chapter: Selectors and the cascade
minutes: 14
status: draft
---

## The score

Specificity is a four-part count, written as a tuple and compared left to right:

| Part | What scores |
| --- | --- |
| (a) | the `style` attribute, so 1 or 0 |
| (b) | id selectors |
| (c) | classes, attribute selectors, pseudo-classes |
| (d) | element names and pseudo-elements |

```text
p                    -> (0, 0, 0, 1)
p.card               -> (0, 0, 1, 1)
.card.wide           -> (0, 0, 2, 0)
#intro               -> (0, 1, 0, 0)
p#intro.card::before -> (0, 1, 1, 2)
```

The comparison is not a total you can add up. `(0, 1, 0, 0)` beats `(0, 0, 99, 99)`, because an id in the second column outranks anything in the third and fourth. That is the single most important property of the system: **no number of classes beats one id**, which is why an id is a poor styling hook.

The universal selector `*` scores `(0, 0, 0, 0)` and a combinator scores nothing, so `#outer span` and `#outer > span` have the same score. When both match, the later rule wins:

```text
count #combinators > p -> 2
p#comb-first -> border-top-color=rgb(25, 26, 27)
```

One rule had spaces around the `>`, one did not, and the second won on source order alone.

## What I measured

I put competing rules on single elements and had each rule set a custom property naming itself, so the value that survived is the cascade's answer rather than my reading of it:

| Competing rules | Winner | Why |
| --- | --- | --- |
| `#imp-id` against `.imp-class !important` | the class | importance outranks specificity |
| `#spec-id` against `.spec-class` and `p.spec-class` | the id | (0,1,0,0) beats (0,0,1,1) |
| `.i-plain` against the `style` attribute | the attribute | (1,0,0,0) beats a class |
| `.i-vs-important !important` against the `style` attribute | the sheet | importance outranks the attribute |
| the `style` attribute with `!important` | the attribute | nothing outranks it |
| three identical rules | the third | source order |

Read the first row and the fourth together, because between them they give the whole order of precedence for one property:

1. a declaration in a `style` attribute with `!important`
2. an important declaration in a stylesheet, compared by specificity
3. a normal declaration in a `style` attribute
4. a normal declaration in a stylesheet, compared by specificity

`!important` moves a declaration up two levels. It is not a trump card, it is a trump card against everything except the same flag worn by an attribute. That is why a stylesheet with three of them is a stylesheet whose author has stopped tracking the order.

## The three selectors that break the counting

`:is()`, `:not()` and `:where()` do not score the way they look like they should.

```text
:is(.isClass, #isProbe)  -> is-later   (the id's weight, though the class is what matched)
.not-arg-test:not(.zzz)  -> with-not   (the argument inside :not() counted)
:where(#whereProbe)      -> id-first   (:where contributed nothing)
```

`:is()` takes the highest argument's weight **whether or not that argument matched**. The element carried both the class and the id in this test, and the rule would have scored the same on an element with only the class, which is the surprising part.

`:not()` adds the specificity of whatever is inside it, so `:not(.zzz)` is worth a class and `:not(#x)` is worth an id. `:where()` is the only one of the three that contributes zero whatever it contains.

The practical shape of that:

```css
/* Always loses to a class rule, and is meant to. */
:where(ul, ol) { padding-inline-start: 0; }

/* Competes like a class list, and is used to shorten one. */
:is(.card, .panel) > h2 { font-size: 1.25rem; }
```

`!important` interacts with all of this in the way the table above describes. It does not change specificity; it changes which band of the comparison the declaration sits in, and inside a band specificity still decides.

## A selector list is judged one selector at a time

```css
#listProbe, .list-member { --winner: list-earlier; }
.list-member { --winner: single-class; }
```

```text
list-member winner -> "single-class"
```

The first rule contains an id and a class, and the element matched through the class. If the list scored by its most specific member, that rule would outrank `.list-member` and the first value would have won. It did not, so the score used was the **matching** selector's, `(0, 0, 1, 0)`, which tied with the second rule and lost on source order.

That is also why a selector list is a good way to group rules that should behave differently on different elements. Each selector carries its own weight to the elements it matches, and the comma does not let one part of the list lend weight to another.

## Where a layer sits

Specificity is one of four things compared and it is the third. The next lesson covers the order in full, and the part that belongs here is that a layer outranks it entirely:

```text
layerProbe     winner -> "theme-layer"   (a class in @layer theme beat an id in @layer base)
unlayeredProbe winner -> "unlayered"     (a class outside every layer beat an id in a layer)
```

Sit with those two lines for a moment. A `.layer-class` beat `#layerProbe` because its layer came later, and an unlayered class beat a layered id. No amount of specificity arithmetic reaches across a layer boundary in the direction people expect, and knowing that is what stops the next fight before it starts.

## Check yourself

Score `header nav ul li a.active::before`, writing the answer down before you work it out. Then write two selectors with the same specificity where one beats the other, and explain why. Finish by taking a rule in a project you have that uses `!important`, removing the flag, and working out what breaks and whether specificity could have fixed it instead.
