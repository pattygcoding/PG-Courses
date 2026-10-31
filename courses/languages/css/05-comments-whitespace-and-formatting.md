---
title: Comments, whitespace and formatting
summary: The one comment syntax, where a space changes meaning, and the two failures whitespace causes.
chapter: Getting started
minutes: 11
status: draft
---

## One comment syntax

```css
/* A section header. */
h1 {
  /* Every css comment looks like this. */
  font-size: 2rem;
}
```

There is no `//`, and this is the first thing to unlearn from JavaScript. A declaration block containing one loses more than the line:

```css
#slash-slash {
  color: rgb(4, 5, 6); // this is not a comment
  border-top-style: solid;
}
```

```text
p#slash-slash -> color=rgb(4, 5, 6)  border-top-style=none
```

The colour applied and the border style did not. A declaration runs from one semicolon to the next, so the browser read everything after the first `;` as one declaration whose property was `// this is not a comment border-top-style` and whose value was `solid`. That declaration is invalid and was dropped, and it took `border-top-style: solid` with it. The line you meant to comment out is not the only casualty, which is why a `//` in a stylesheet often costs two lines and reads as though CSS ignored a rule for no reason.

Comments do not nest:

```css
/* outer /* inner marker */ #not-nested { color: rgb(1, 2, 3); }
```

```text
p#not-nested -> color=rgb(1, 2, 3)
```

The rule applied, so the comment ended at the first `*/` rather than at the second. There is no way to comment out a block that already contains comments. Delete the rule, or wrap it in a `@media not all { }` if you need to keep it visible, and do not expect the nested `/*` to mean anything.

## Whitespace between tokens does not matter

```css
#combinators > p { border-top-color: rgb(22, 23, 24); }
#combinators>p { border-top-color: rgb(25, 26, 27); }
```

```text
count #combinators p -> 2
p#comb-first  -> border-top-color=rgb(25, 26, 27)
p#comb-second -> border-top-color=rgb(25, 26, 27)
```

Both selectors matched the same two elements and the second won on source order, so the spaces around `>` are free. The same holds for `+` and `~`, for the space between a property and its colon, and for the newlines inside a declaration block. Most differences in CSS formatting are therefore about reading, not about behaviour.

## Whitespace inside a value can matter a great deal

```css
#calc-spaced { width: calc(100% - 40px); }
#calc-unspaced { width: calc(100% -40px); }
```

```text
p#calc-spaced   -> width=926px
p#calc-unspaced -> width=966px
supports width: calc(100% -40px) -> false
```

The second rule did nothing. In `calc()`, a `-` is read as a minus sign only when it has whitespace on both sides; without the space before it, `-40px` is a negative length and the expression is `100%` followed by a length, which is not a valid sum. The declaration is dropped at parse time, `width` falls back to `auto`, and the element takes the full 966px. The `+` and `-` operators require the spaces and `*` and `/` do not, which is a rule worth keeping rather than rediscovering.

## A space in a selector changes the selector

```css
a.b   { }   /* an <a> that has the class b      */
a .b  { }   /* something with the class b inside an <a> */
```

```text
count #ws-selector.compound -> 1
count #ws-descendant span   -> 1
```

The first form is a compound selector and matches one element. The second is the descendant combinator and matches a different set entirely, usually the empty set when you meant the first. This is the second most common cause of a rule that silently does nothing, after a custom property with the wrong name.

## Whitespace inside a custom property value

A custom property's value is stored as a token sequence and substituted where you use it, so a value with several parts carries all of them:

```css
#custom-ws { --spaced: 10px   20px; --tidy: solid; }
#custom-ws-child {
  padding: var(--spaced);
  border-top: 2px var(--tidy) rgb(31, 32, 33);
}
```

```text
p#custom-ws-child -> padding-top=10px  padding-right=20px
                     border-top-width=2px  border-top-style=solid  border-top-color=rgb(31, 32, 33)
```

The extra spaces are collapsed, `--spaced` supplies the two values `padding` expects for a vertical and horizontal pair, and `--tidy` supplies the keyword inside a shorthand. The substitution is textual at the token level and the result is then parsed, which is also why a custom property can hold something that only becomes invalid once it lands:

```css
#custom-comma { --list: rgb(34, 35, 36), rgb(37, 38, 39); color: var(--list); }
```

```text
p#custom-comma -> color=rgb(0, 0, 0)
```

A comma-separated list is a fine custom property value and an impossible colour, and the failure happens after substitution rather than during parsing. The previous lesson covers what that does to the property.

## Formatting

Two conventions carry most of the weight, and neither is enforced by anything:

- One declaration per line, with a space after the colon, which makes a diff show one changed property rather than one changed line.
- A blank line between rules, and a comment at the top of each group of related rules.

Property order inside a block is a real question with no universal answer. Ordering by position in the box, from `display` through to `border`, means a reader finds `padding` in the same place in every rule, and that consistency is worth more than the specific order you pick. What matters is that the file has an order and that it is the same in every block.

## Check yourself

Put a `//` above a real declaration and work out which declarations are lost. Then write `width: calc(100% - 2rem)` and `width: calc(100% -2rem)` on two elements and explain the difference in the computed value. Finish by writing a selector that matches a `span` inside a `p` with a class, and one that matches a `span` that has that class itself, and say which one you get by accident when you forget a space.
