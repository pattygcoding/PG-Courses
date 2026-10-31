---
title: What CSS is
summary: The browser styles your page before you write anything, and CSS is how you override it.
chapter: Getting started
minutes: 12
status: draft
---

## The browser brings a stylesheet of its own

Here is a page with no styling in it at all. I printed what the browser decided for each element:

```html
<h1>Northside Library</h1>
<p>Books, members and loans.</p>
<ul><li>Books</li><li>Members</li></ul>
<p><a href="#nowhere">Members</a></p>
```

```text
body   -> margin-top=8px  font-family="Times New Roman"  font-size=16px  color=rgb(0, 0, 0)
h1     -> font-size=32px  font-weight=700  margin-top=21.44px  margin-bottom=21.44px
ul     -> margin-top=16px  padding-left=40px  list-style-type=disc
li     -> display=list-item
a      -> color=rgb(0, 0, 238)  text-decoration-line=underline  cursor=pointer
strong -> font-weight=700
em     -> font-style=italic
code   -> font-family=monospace  font-size=13px
button -> font-family=Arial  font-size=13.3333px  background-color=rgb(240, 240, 240)
small  -> font-size=13.3333px
mark   -> background-color=rgb(255, 255, 0)
```

Every value there came from a browser with no stylesheet of mine in the document. A plain HTML file is styled by the **user agent stylesheet**, the one the browser ships, and everything in this course is an override of it. That reframing is worth keeping, because it answers the question people ask most often about CSS: nothing is being drawn from nowhere, and a property you never touched has a value you can look up.

`margin-top=21.44px` is worth pausing on. The rule is `margin: 0.67em` and the heading's font size is 32px, so 0.67 times 32 gives 21.44. A margin with two decimal places is a signal that a value is being scaled by a font size, which is the first thing to check when a number is not the one you typed.

Two of those defaults surprise people later:

- An `li` computes to `display: list-item`, not `display: block`. The marker belongs to the element's own box, which is why a bullet moves with its text rather than being a separate thing you place.
- A `button` does not inherit the page's font. It computes to Arial at 13.3333px, which is why a button on a carefully styled page looks like it arrived from a different site.

## A stylesheet is a list of rules

```css
h1 {
  font-size: 2rem;
  margin-top: 0.5em;
}

a {
  color: rgb(20, 110, 90);
}
```

A rule is a **selector** (`h1`), a **declaration block** in braces, and one or more declarations. A declaration is a **property**, a colon and a **value**.

None of that says where anything goes on the screen. A declaration states a fact about every `h1`: the font size is 2rem. The browser decides what that means for each one, in each context. You describe the result and the browser chooses the algorithm, which is what makes the language declarative and also what makes a rule's effect depend on things you did not write.

## Three ways to attach it

```html
<link rel="stylesheet" href="first.css">

<style>
  h1 { color: rgb(20, 110, 90); }
</style>

<h1 style="color: rgb(20, 110, 90)">Northside Library</h1>
```

The first is a separate file, linked from the head. This is what a real page uses, because one file can be linked from every page, downloaded once and cached.

The second is the same CSS written in the document, which saves a request and loses reuse. It is fine for a single page and a single rule, and it is what the examples in this course use so each one is one file you can open.

The third is the `style` attribute, and it applies to exactly one element. It reads as the convenient option and it is the one to avoid: I measured earlier that an inline style wins over the stylesheet, so it cannot be overridden from the file you maintain, and a page with a dozen of them has a dozen places to look when a colour is wrong.

| Where | Scope | Wins over |
| --- | --- | --- |
| a linked file | every element it selects | the user agent |
| a `<style>` element | every element it selects | a link that comes before it |
| a `style` attribute | one element | both of the above |

## What CSS does not do

CSS has no loop, no variable in the programming sense and no way to read the document. Custom properties look like variables and are not: they hold a value, they are substituted, and they cannot be computed from other elements' sizes.

It also cannot overrule the reader. A user stylesheet and the operating system's settings for contrast and text size sit above yours in the cascade's order of origin, which the next chapter makes precise. A user who has asked for 24px text gets 24px text, and that is a feature of the platform rather than an obstacle.

The next page writes a stylesheet and attaches it properly, then measures what changed.

## Check yourself

Open a page with no stylesheet of your own and inspect a heading and a button. Find the rule each of their values comes from, which in most browsers is shown as the user agent stylesheet in the inspector. Then set `font-family` on the `button` and see how much of the page's look was being decided by that one missing inheritance.
