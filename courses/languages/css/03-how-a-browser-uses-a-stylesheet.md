---
title: How a browser uses a stylesheet
summary: Rules are parsed, matched, cascaded and resolved, and a bad declaration fails at one of two different points.
chapter: Getting started
minutes: 13
status: draft
---

## The path from file to pixels

Five stages, and each one can fail differently:

1. **Parse.** The HTML becomes a DOM tree and the CSS becomes a second structure, one entry per rule.
2. **Match.** For each element, the browser collects every rule whose selector matches it.
3. **Cascade.** For each property, the collected declarations are sorted by origin, importance, layer and specificity, and one wins.
4. **Resolve.** The winning value is turned into a computed value. Percentages and font-relative units are resolved here.
5. **Layout, then paint.** Computed values that depend on the box's position and size become used values, and the result is drawn.

A declaration that is nonsense fails at stage 1 or at stage 4, and the two failures look different. Knowing which one you have is worth more than knowing the cascade, because the fix differs.

## Failure at stage 1: the declaration is dropped

```css
#unitless-nonzero {
  margin-top: 5;
  border-top-color: rgb(30, 31, 32);
}
```

```text
p#unitless-nonzero -> margin-top=16px  border-top-color=rgb(30, 31, 32)
```

`margin-top: 5` needs a unit, so the declaration is discarded when the rule is parsed. Its neighbour in the same block applies untouched, which is the important part: one bad declaration does not take the block with it. The `16px` is not from my stylesheet at all. It is the user agent's `margin: 1em` on a paragraph, and the computed value is the same as if I had never written the line.

The same is true of a property that does not exist:

```css
#bogus { colr: rgb(11, 11, 11); margin-top: 12px; }
```

```text
p#bogus -> color=rgb(0, 0, 0)  margin-top=12px
```

The typo is dropped, `margin-top` survives, and the colour falls back to the inherited black. No console warning is printed for either case in this build of Chrome, so `CSS.supports` is the tool for checking a declaration before you rely on it:

```text
supports margin-top: 5 -> false
supports margin-top: 0 -> true
```

## Failure at stage 4: the value is invalid after substitution

```css
#custom-comma { --list: rgb(34, 35, 36), rgb(37, 38, 39); color: var(--list); }
```

```text
p#custom-comma -> color=rgb(0, 0, 0)
```

Nothing here is thrown away during parsing, because `var(--list)` is a perfectly good value at that point. The custom property is substituted during resolution, producing `color: rgb(34, 35, 36), rgb(37, 38, 39)`, and only then does the browser discover that a colour cannot be a comma-separated list. A declaration that becomes invalid here behaves as `unset`: on an inherited property such as `color`, that means the value is inherited, so this paragraph is black because the body is black.

A missing custom property with no fallback does the same thing:

```text
color: var(--missing)  ->  rgb(0, 0, 0)
```

The consequence is worth stating plainly: a mistyped custom property name does not error, and does not fall back to the nearest sensible colour. It silently makes the declaration vanish and the property inherit. This is the most common way a themed stylesheet loses a colour, and looking at the rule will not show it.

## Computed values, and used values

The Computed tab in a browser's inspector shows what the cascade produced. For most properties that is the **computed value**, and for anything involving the box's actual size it is the **used value**, which is why a percentage comes back as pixels:

```css
#pct-parent { width: 300px; font-size: 20px; }
#pct-child {
  width: 50%;
  margin-top: 10%;
  font-size: 200%;
  line-height: 1.5;
  padding-top: 2em;
}
```

```text
p#pct-child -> width=150px  margin-top=30px  font-size=40px  line-height=60px  padding-top=80px
```

Five lines, and four of them are worth understanding:

- **`width=150px`** from `50%` of a 300px parent. The declaration holds a percentage and the computed value holds pixels, so the inspector is reporting the result and not the declaration.
- **`margin-top=30px`** from `10%`, resolved against the parent's **width**, not its height. Vertical percentages read the horizontal dimension, which catches everyone once and is worth remembering rather than deriving each time.
- **`font-size=40px`** from `200%` of the parent's 20px, and **`line-height=60px`** from `1.5` times the element's own resolved 40px.
- **`padding-top=80px`** from `2em`, and `em` here reads the element's own font size, which by that point is 40px. Padding is measured in the element's own text size, so setting a large font-size inflates its own padding. That coupling is the reason `rem` is often the safer choice for spacing.

The distinction to carry forward: a value can be correct in the source, correct after the cascade, and still not be the number you expected, because resolution is where units and percentages become pixels.

## Recalculation is the browser's problem

Change a class on one element and the browser redoes as much of stages 2 to 5 as that change can affect. It is good at narrowing this down, and it is not worth optimising on a hunch. It is worth knowing that the pipeline exists, because the answer to "why is this slow" is usually an animation of a property that requires layout rather than one that the compositor can handle alone.

## Check yourself

Write a rule with three declarations where the middle one is invalid, and predict which two survive before you look. Then set a colour with `var(--brand)` on an element, remove the definition on `:root`, and explain why the element turns black rather than staying whatever it was. Finally, put `width: 50%` on an element inside a relative parent and say whether the Computed tab will show a percentage or a length.
