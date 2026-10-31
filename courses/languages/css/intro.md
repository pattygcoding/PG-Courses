---
title: CSS
level: Beginner
summary: Style a page with rules you can predict, and know which declaration wins and why.
labels:
  - Language
  - Design
  - Frontend
minutes: 18
status: draft
---

## What this course is

CSS is the language that decides how a page looks, and it is the one language in this catalogue where the browser
already has an answer before you write anything. A paragraph has a margin and a heading has a size because the
browser ships a stylesheet of its own, and I can ask it what that stylesheet says:

```text
body -> margin-top=8px  font-family="Times New Roman"  font-size=16px  color=rgb(0, 0, 0)
h1 -> font-size=32px  font-weight=700  margin-top=21.44px  margin-bottom=21.44px
ul -> padding-left=40px  list-style-type=disc
button -> font-family=Arial  font-size=13.3333px  background-color=rgb(240, 240, 240)
```

Every line there came from a real browser rather than from a specification, and that is the method of the whole
course. A stylesheet is a set of rules, the browser applies all of them, and for any element and any property one
declaration wins. Which one wins is decided by the cascade, and the cascade is a set of rules about rules. Most of
what people call CSS being difficult is a rule they did not know was competing with theirs.

The course covers the language in the order the problems appear: the cascade and selectors first, because a rule
that never applies and a rule that loses to another look identical. Then values and units, the box model, and the
two layout systems a modern page uses, flexbox and grid. Typography, responsive design and motion follow, and the
course finishes with the parts that decide whether a stylesheet survives a year of edits: layers, nesting,
organisation, and how to measure what the browser actually resolved.

## Who it is for

You can write HTML, or you have worked through the HTML course in this catalogue, and you want the stylesheet to do
what you meant rather than what you hoped. Nothing assumes a design background, a preprocessor, a framework or a
build step.

If you already write CSS by feel, the material that changes how you work is specificity and layers, the box model's
arithmetic, and flexbox and grid sizing. Those four are where the guesswork usually lives.

## What you will build

The library site from the HTML course, styled from a bare page to a finished one: a readable catalogue, a card grid
that reflows, a form that looks like it belongs to the site, a data table, and a dark theme built from custom
properties. The stylesheet grows the way a real one does, which means it starts as one file, gets reorganised once,
and picks up a layer boundary before the end.

Every measurement in these pages is a computed value printed by a browser, so the numbers are what your browser
will do with the same code.

## Prerequisites

A browser and a text editor. Every example is an HTML file with a `<style>` element or a stylesheet beside it, and
opening the file by double-clicking is enough to see the result. No preprocessor, no package manager and no build
step is used anywhere in the course.

The small Node script used to collect the measurements exists only to print what the browser said, and you do not
need it to follow along. Your browser's own inspector shows the same numbers in the Computed tab.

## How the pages are ordered

The cascade comes first, and it comes before layout, because a layout property that does not apply is a cascade
problem wearing a layout costume. Selectors and specificity are the same subject from the other side, so they are in
the same chapter.

Values and the box model follow, and the box model is the point where guessing stops being acceptable: `width` is
not the width of a box, and knowing what it is changes every layout you write afterwards. Flow and positioning,
then flexbox, then grid. Grid comes last of the three because it can express things the others cannot, which is not
the same as being the thing to reach for.

Typography, responsive design and motion are next, and the last chapter is structure: cascade layers, nesting,
naming, and how to read a computed value when a page misbehaves. Read them in order the first time, following the
contents list on this page. Each lesson ends with something to measure.
