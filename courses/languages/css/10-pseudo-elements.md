---
title: Pseudo-elements
summary: Boxes you can style that are not in the document, and the elements that refuse them.
chapter: Selectors and the cascade
minutes: 13
status: draft
---

## A box that is not an element

```css
.gen::before { content: "[note]"; color: rgb(2, 3, 4); }
.gen::after  { content: " (end)"; color: rgb(5, 6, 7); }
```

```text
gen::before -> content="[note]"  color=rgb(2, 3, 4)  display=inline
gen::after  -> content=" (end)"  color=rgb(5, 6, 7)  display=inline
```

Both are real boxes with the usual properties, and the default `display` is `inline`, which is why generated text flows with the paragraph. `::before` is inserted as the first child and `::after` as the last, which is the whole of the difference between them.

Because the display is yours to set, a pseudo-element can be a full block:

```css
.box::before {
  content: "";
  display: block;
  width: 40px;
  height: 10px;
  background-color: rgb(8, 9, 10);
}
```

```text
box::before -> content=""  display=block  width=40px  height=10px  background-color=rgb(8, 9, 10)
```

An empty `content` and a `display` other than `inline` is the standard way to make a decorative shape: a divider, an icon placeholder, a coloured bar. It needs no extra markup and no empty `div`, which is the reason it exists.

## content is required

```css
.no-content::before { color: rgb(11, 12, 13); }
```

```text
no-content::before -> content=none  color=rgb(11, 12, 13)
```

The rule matched and the computed colour is the one I asked for, and no box was generated, because `content` defaults to `normal`, which generates nothing. This is worth knowing when a pseudo-element "does not work": the inspector shows your declarations applied, the element is missing, and the only thing wrong is that `content` is not there. `content: ""` is enough, and it generates an empty box.

Setting a colour on a pseudo-element that generates nothing is not harmless. It is a rule that will apply the moment someone adds `content`, which makes it a trap rather than a no-op.

## Pseudos can be selected, but not scripted

```text
count p::before -> 0
count p:before  -> 0
```

A pseudo-element is not a node, so `querySelectorAll` never returns one and no script can reach it. It is drawn from the stylesheet and exists only in the rendered tree. Anything that a user needs to read, copy or select belongs in the markup, and a pseudo-element is for the parts that are decoration.

The single-colon form is the older syntax and it still works:

```css
.legacy:before { content: "legacy"; color: rgb(30, 31, 32); }
```

```text
legacy::before -> content="legacy"  color=rgb(30, 31, 32)
```

`:before` and `::before` are the same thing. The double colon is the modern spelling and the one to write, and the single colon is worth recognising in older stylesheets. Note that `:before` and `:hover` are told apart by nothing except a list of known names, which is why the double colon was introduced.

## The ones that are not before or after

```css
.marker li::marker { color: rgb(14, 15, 16); font-weight: 700; }
.ordered li::marker { content: "-> "; }
```

```text
li#standard-marker::marker -> content=normal  color=rgb(14, 15, 16)  font-weight=700
li#custom-marker::marker   -> content="-> "   color=rgb(0, 0, 0)
```

`::marker` is the bullet or number itself, and it takes `content`, `color` and a small set of font properties. The first measurement shows `content=normal`, which means the browser's own marker is being used and only its colour and weight were changed. The second replaces the marker with an arrow, which is how a custom list style is written without removing the list semantics.

Each of these accepts a limited set of properties, and it rejects the rest silently:

```text
first-line::first-line -> color=rgb(33, 34, 35)  letter-spacing=3px  padding-left=0px
li::marker             -> color=rgb(36, 37, 38)  font-size=22px      padding-left=0px
sel-limit::selection   -> background-color=rgb(39, 40, 41)  color=rgb(42, 43, 44)  padding-left=0px
```

I declared `padding-left: 40px` on all three and every one computed to `0px`, which is the initial value. Colour, font and letter-spacing applied. `::first-letter` takes a similar set and also takes `float`, which is how a drop cap is built. `::selection` takes colour and background and little else, and it only affects the user's own selection, so it never appears in a screenshot of an unselected page.

## Pseudo-elements on elements that have their own content

Whether a `::before` box appears depends on the element, and the honest way to decide is to measure. I compared two identical containers, one with the pseudo-element rule and one without, so the height difference is the pseudo-element's contribution:

| Element | Without | With | Difference |
| --- | --- | --- | --- |
| `span` | 16px | 46px | 30px |
| `div` | 16px | 46px | 30px |
| `img` | 22px | 52px | 30px |
| `button` | 21px | 51px | 30px |
| `input` | 21px | 21px | 0 |
| `textarea` | 38px | 38px | 0 |
| `select` | 19px | 19px | 0 |
| `video` | 22px | 22px | 0 |

Every declared a 30px block. The first four grew by exactly 30px, so the box was generated. The last four did not move, so nothing was generated: form controls and `video` do not render pseudo-elements. `img` and `button` do, in this browser.

That last sentence is the point of the table. The usual summary is that pseudo-elements do not work on replaced elements, and `img` in this build contradicts it. Where a pseudo-element is the cleanest way to do something on an element of an uncertain kind, measure it rather than assuming, and prefer a real child element when the content matters.

## Check yourself

Add a decorative bar above a heading with `::before` and no extra markup. Then put a `::before` on an `input` and explain why nothing appears. Finish by writing a custom list marker with `::marker` and saying what a screen reader will announce for that item.
