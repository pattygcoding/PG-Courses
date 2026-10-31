---
title: A first stylesheet
summary: Link one file from one page and see which values change and which the browser keeps.
chapter: Getting started
minutes: 11
status: draft
---

## The page

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Northside Library</title>
    <link rel="stylesheet" href="first.css">
  </head>
  <body>
    <h1>Northside Library</h1>
    <p>Books, members and loans.</p>
    <ul>
      <li>Books</li>
      <li>Members</li>
    </ul>
    <p><a href="#nowhere">Members</a></p>
  </body>
</html>
```

## The stylesheet

```css
body {
  font-family: system-ui, sans-serif;
  font-size: 18px;
  line-height: 1.6;
  color: rgb(20, 22, 26);
  background-color: rgb(250, 250, 248);
  margin: 0;
}

h1 {
  font-size: 2rem;
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

a {
  color: rgb(20, 110, 90);
}

ul {
  padding-inline-start: 1.2em;
}
```

Save it beside the page as `first.css` and open the page. Here is the same markup measured twice, once with the link present and once with it deleted:

| Element | No stylesheet | With `first.css` |
| --- | --- | --- |
| `h1` font-family | `"Times New Roman"` | `system-ui, sans-serif` |
| `h1` font-size | `32px` | `32px` |
| `h1` margin-top | `21.44px` | `16px` |
| `p` font-size | `16px` | `18px` |
| `p` line-height | `normal` | `28.8px` |
| `p` color | `rgb(0, 0, 0)` | `rgb(20, 22, 26)` |
| `ul` padding-left | `40px` | `21.6px` |
| `a` color | `rgb(0, 0, 238)` | `rgb(20, 110, 90)` |

Read the third row and the third column together, because the heading's font size did not move. The stylesheet asks for `2rem` and the user agent asks for `2em`, the root font size is the default 16px, and both come out at 32px. A rule that agrees with the browser is invisible, and finding that out requires asking rather than reading the CSS.

The other rows are the arithmetic worth checking yourself:

- `line-height: 1.6` on an 18px font gives **28.8px**. A bare number is a multiple of the font size, and the computed value is the product.
- `padding-inline-start: 1.2em` gives **21.6px**, which is 1.2 times the `ul`'s own inherited 18px.
- `h1 { margin-top: 0.5em }` gives **16px**, which is 0.5 times the heading's own 32px, not the body's 18px.
- `font-size: 2rem` on the heading is 2 times the **root** element's 16px, so 32px. `rem` reads the root, which is what makes it predictable, and `em` reads the element, which is what makes it relative.

## Why a separate file

A linked sheet is downloaded once and reused by every page that links it, and the browser caches it. A `<style>` element is downloaded with the page every time, and a `style` attribute cannot be shared at all.

The cost of the separate file is a request before the page can be drawn correctly, which is a real cost and the subject of the chapter on delivery. For a site of more than one page the trade is not close.

## Order matters, and a later sheet wins

Two linked sheets, or a link and a `<style>` element, both apply. When they disagree on the same property for the same element, the one that comes later in the document wins, provided nothing else separates them. The next two chapters are about everything that counts as "something else", and this is the base case to hold on to:

```css
p { --winner: first; }
p { --winner: second; }
```

```text
p winner -> "second"
```

The property there is a custom property used as a marker so the browser will tell me which rule survived. Two rules, identical selectors, and the second one wins with no complaint from either.

## What not to write yet

```html
<h1 style="color: rgb(20, 110, 90)">Northside Library</h1>
```

That works, and it beats both files above it. It also cannot be overridden from either file without adding `!important` to a fight you started, so the rule lives on the element and nowhere else. When a colour is wrong on a page with a dozen of these, the answer is in one of a dozen attributes rather than in one stylesheet.

## Check yourself

Add `first.css` to a page of your own and predict the four values it will change before you look. Then put the same declaration in a `<style>` element above the link and below it, and predict which wins in each case. Finally, set `font-size: 2em` on the `h1` in place of `2rem`, and work out why the heading grows when the body's font size changes and does not grow when you change the root's.
