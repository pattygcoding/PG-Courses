---
title: HTML
level: Beginner
summary: Write markup that means what it says, and know what the browser, a screen reader and a search engine do with it.
labels:
  - Language
  - Markup
  - Accessibility
minutes: 18
status: draft
---

## What this course is

HTML is the language a page is written in, and the one language in this catalogue that has no errors. A missing closing tag, a
misnested element and an attribute spelled wrong are all accepted by every browser, which then builds the document it thinks you
meant and says nothing. That forgiving behaviour is why the language is easy to start and why most pages are wrong in ways nobody
notices until a screen reader or a search engine reads them.

The course covers the language itself: the syntax and how the parser recovers from it, text, structure, links and URLs, images
and media, tables, forms, and accessibility. It finishes with encodings and language, metadata for machines, embedded SVG, and how
to validate a document against the standard.

Everything runs in a real browser. Every parse tree, error message, resolved URL, validation message and chosen image in these
pages came from running the markup in Chrome and in the standard's own parsing algorithm, and comparing the two. HTML has no
interpreter to invoke, so the browser is the interpreter, and the trick of the course is that the browser will tell you what it
built if you ask.

Two things are deliberately outside the course. CSS is a separate course: this one names where presentation lives and stops there.
The DOM and client-side scripting belong to the JavaScript course, so here JavaScript appears only as a measuring instrument and
never as the subject.

## Who it is for

You have made a page, or copied one, and you want to understand what the tags actually do. Nothing assumes CSS, JavaScript or a
build tool, and nothing assumes you have read a specification.

If you already write HTML comfortably, the interesting parts are where you least expect them: how the parser handles misnested
tags, why an `alt` attribute that is missing and one that is empty mean different things, which image a browser picks from a
`srcset`, and what a form does with your data before a server sees it.

## What you will build

A small site for the library that the SQL course uses, grown one page at a time. A home page, a catalogue, a page per book, a
loan table, a search form, a gallery of covers and an accessible data table. Along the way you will break it on purpose several
times, to see what the parser does with a misnested tag, a stray character, an unclosed list and a `div` inside a table.

Every page in the course is a single file you can open by double-clicking it, and most of the lessons are short enough to finish
with a working page.

## Prerequisites

A browser and a text editor. That is the whole list. No server, no build step and no tooling is required, and the two small Node
scripts used for the measurements in these pages exist only to show what the browser said and are not needed to follow along.

## How the pages are ordered

The first two chapters are the language and the parser, because HTML is unusual in having a defined recovery behaviour and most
of its surprises come from there. Then text, structure, links, and the URL rules that decide where an `href` points.

Images, tables and forms follow, in that order, because that is the order of how much goes wrong with them. Forms get the most
pages of any part of the language because a form is where HTML, the browser and a server meet.

Accessibility is next and it is not an appendix: the semantic elements in the earlier chapters exist for it, and the chapter
collects the practice rather than introducing a new subject. The last chapters are the document in the wider world and how to
check your own work.

Read them in order the first time. The pages build, and the library site grows as the course goes.
