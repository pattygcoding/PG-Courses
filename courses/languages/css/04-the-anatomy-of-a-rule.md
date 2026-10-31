---
title: The anatomy of a rule
summary: Property, value and selector, and the three parts of a name that are case-sensitive.
chapter: Getting started
minutes: 12
status: draft
---

## Four parts

```css
a:hover {
  color: rgb(20, 110, 90);
  text-decoration-line: none;
}
```

| Part | Here | Notes |
| --- | --- | --- |
| selector | `a:hover` | which elements the block applies to |
| block | `{ ... }` | braces, required, one per rule |
| declaration | `color: rgb(20, 110, 90);` | property, colon, value, semicolon |
| at-rule | `@media ...` | a statement rather than a rule, covered later |

The semicolon separates declarations and the last one is optional:

```css
#no-semi { color: rgb(1, 2, 3) }
```

```text
p#no-semi -> color=rgb(1, 2, 3)
```

I write the final semicolon anyway. Leaving it off is legal and adds a diff to every later edit that appends a declaration, and it is the kind of decision worth making once rather than per rule.

## Props are case-insensitive, and hyphens are not decoration

```css
#lower { border-top-color: rgb(1, 1, 1); padding-top: 1px; }
#upper { BORDER-TOP-COLOR: rgb(2, 2, 2); PADDING-TOP: 2px; }
#toggled { Border-TOP-color: rgb(4, 4, 4); PADDING-top: 4px; }
```

```text
p#lower   -> border-top-color=rgb(1, 1, 1)  padding-top=1px
p#upper   -> border-top-color=rgb(2, 2, 2)  padding-top=2px
p#toggled -> border-top-color=rgb(4, 4, 4)  padding-top=4px
```

All three applied. Property names are compared without regard to the case of the letters, so `BORDER-TOP-COLOR` and `border-top-color` are the same property.

The hyphens are still part of the name, and this is where the rule bites:

```css
#camel { BorderTopColor: rgb(3, 3, 3); PaddingTop: 3px; }
```

```text
p#camel -> border-top-color=rgb(0, 0, 0)  padding-top=0px
supports BorderTopColor: rgb(3, 3, 3) -> false
supports BORDER-TOP-COLOR: rgb(2, 2, 2) -> true
```

Nothing applied. `BorderTopColor` is not a case variant of `border-top-color`; it is a different name, with no hyphens in it, and no such property exists. If you have written JavaScript or C#, your hands will type `BorderTopColor` before your brain catches up, and the failure is silent.

Values are case-insensitive for keywords and function names:

```text
border-top-style: SOLID        -> solid
border-top-width: 5PX          -> 5px
font-style: ITALIC             -> italic
text-transform: UPPERCASE      -> uppercase
color: RGB(9, 9, 9)            -> rgb(9, 9, 9)
width: CALC(100% - 50px)       -> 916px
```

Lowercase is the convention, and it is the only form that reads as CSS rather than as another language leaking in.

Selectors split down the middle:

```text
count p            -> 16     count P            -> 16
count .CaseClass   -> 1      count .caseclass   -> 0
count #CaseId      -> 1      count #caseid      -> 0
```

Element names are matched without regard to case, so `P` and `p` select the same elements. Class names and ids are matched exactly, because those are names your document chose, and the HTML standard makes them case-sensitive. A class of `Card` and a selector of `.card` will never meet, and there is no way to tell from the stylesheet which spelling the document used.

## Custom properties are case-sensitive, which is different

```css
#custom { --My-Prop: rgb(7, 7, 7); color: var(--my-prop, rgb(8, 8, 8)); }
#custom-exact { --My-Prop: rgb(9, 9, 10); color: var(--My-Prop, rgb(8, 8, 8)); }
```

```text
p#custom       -> color=rgb(8, 8, 8)
p#custom-exact -> color=rgb(9, 9, 10)
```

The first element defines `--My-Prop` and reads `--my-prop`, so it finds nothing and takes the fallback. The second matches the case and gets the value. Custom property names are compared exactly, so a case difference is a different name, and the silent-fallback behaviour from the previous lesson means you get the second argument of `var()` instead of an error.

## One bad declaration fails alone

```css
#drop-one { color: rgb(16, 17, 18); color: 19; border-top-color: rgb(20, 21, 22); }
```

```text
p#drop-one -> color=rgb(16, 17, 18)  border-top-color=rgb(20, 21, 22)
```

The middle declaration is invalid and dropped; the one before it and the one after it both apply. A block is parsed declaration by declaration, and this is why a stray character in a stylesheet usually costs you one line rather than the file.

Two other shapes are worth recognising while you are here. A duplicate property in the same block is not an error, and the later one wins:

```text
p.twice winner -> "last-in-block"
```

And a shorthand overwrites the longhands it can express, including resetting ones you did not mention:

```css
#shorthand {
  border-top-color: rgb(50, 51, 52);
  border-top-style: dashed;
  border-top-width: 9px;
  border: 2px solid rgb(53, 54, 55);
}
```

```text
p#shorthand -> border-top-color=rgb(53, 54, 55)  border-top-style=solid  border-top-width=2px
```

The dashed 9px border set three lines earlier is gone, because `border` supplies all three of its properties and unspecified parts of a shorthand take their initial value. The box model chapter returns to this, since `padding`, `margin` and `background` behave the same way.

## Check yourself

Write a rule using `border-top-color` in three different cases, one of them camelCase, and predict which two apply. Then write a block with five declarations where the second and fourth are invalid and see how many survive. Finish by explaining why `.Card` does not match `class="card"` while `DIV` does match `<div>`.
