---
title: Combinators
summary: The four ways to join selectors, and the difference between a space and a greater-than sign.
chapter: Selectors and the cascade
minutes: 12
status: draft
---

## The four combinators

```css
#outer span     { }   /* a span anywhere inside #outer        */
#outer > span   { }   /* a span that is a direct child        */
#p1 + p         { }   /* the p immediately after #p1          */
#p1 ~ p         { }   /* every p after #p1, same parent       */
```

The markup behind these is one container with a paragraph, a second paragraph holding a nested `span`, a `span` that is a sibling of the paragraphs, and a third paragraph:

```html
<div id="outer">
  <p id="p1">first <span id="s1">direct span</span></p>
  <p id="p2"><em><span id="s2">nested span</span></em> second</p>
  <span id="s3">a sibling span</span>
  <p id="p3">third <span id="s4">span in p3</span></p>
</div>
```

```text
count #outer span   -> 4
count #outer > span -> 1
```

Four against one, from the same two words. The descendant combinator reaches to any depth, so it found both `span`s that are direct children of paragraphs, the one inside an `em`, and the sibling `span`. The child combinator found only the one that is a child of `#outer`.

This is the single most consequential difference in the selector language, and it usually shows up as a rule that leaks. `#outer span` styles every link in a footer inside `#outer`, and the footer's own spacing rules then have to fight it.

Where the two agree is worth seeing too:

```text
count #outer p   -> 3
count #outer > p -> 3
```

Every paragraph in that container happens to be a direct child, so the two selectors match the same three elements. A stylesheet can therefore switch between them with no visible change and no test failure, and the difference appears the first time someone wraps a paragraph in a `div`.

## Sibling combinators

```text
count #p1 + p     -> 1
count #p1 ~ p     -> 2
count #p1 ~ span  -> 1
count span + p    -> 1
```

`+` is the next-sibling combinator and it means the immediately following element, sharing a parent. `#p1 + p` found the second paragraph and nothing else. `~` is the subsequent-sibling combinator and reaches every later sibling, so `#p1 ~ p` found the second and the third.

`#p1 ~ span` found one element, the `span` that comes after `#p1` at the same level, and it did not find the `span` buried in a paragraph, because a sibling has to share the parent.

`span + p` found one element as well, and it is the interesting one: the `span` is `#s3`, and the paragraph after it is `#p3`. The selector ignores which `span` the browser chose and asks only whether a paragraph follows one.

The sibling combinators are what make spacing rules work without touching the markup:

```css
.card + .card { margin-top: 1rem; }
```

Every card except the first gets a top margin, which is the usual way to space a list of items whose gaps you cannot express as padding on the container. The selector is exactly "a card that follows a card", so changing the order or inserting something else changes the spacing rather than breaking it.

`~` is the one to use when the items are not adjacent:

```css
h2 ~ p { }
```

Every paragraph that follows an `h2` at the same level, which is a section's body copy in a document without wrapper elements.

## Combinators add nothing to specificity

A combinator carries no weight and is not a selector in its own right. `#outer span` and `#outer > span` have the same specificity, an id and an element, so if both match an element the later one wins. This surprises people who expect the more precise selector to win a tie, and the reason is that precision and specificity are different properties.

## The universal selector with a sibling combinator

```css
* + * { margin-top: 1rem; }
```

Every element that has a preceding sibling gets a top margin, which spaces a vertical stack without knowing what is in it. It is a legitimate technique and it needs one caveat: the property you choose has to be one that does not interact with something else. `margin-top` on a heading with a large bottom margin gives you the larger of the two once margins collapse, which the box model chapter covers.

## Selecting a parent

There was no way to ask for an element because of what it contains, and now there is:

```text
supports selector(:has(> .owl)) -> true
supports selector(p:has(+ span)) -> true
count .has-child-parent:has(> .has-child) -> 1
```

`:has()` takes a **relative** selector, which is the part that makes it different from anything before it. The combinator inside it is read from the element you are testing, so `p:has(+ span)` means a paragraph that a `span` follows, and `:has(> .owl)` means an element with an owl as a direct child. On a page with two containers where only one has the child, exactly one matched, which is the whole point.

`:has()` belongs in the pseudo-class lesson, and it is here because it is the answer to a question the four combinators cannot express.

## Check yourself

Write a selector for every paragraph inside an article, and a second one for direct children only. Then add a `div` around one paragraph and predict how many elements each of the two matches afterwards. Finish by writing a selector for a list item that follows another list item, and one for a list item that follows a heading, and say which combinator each uses.
