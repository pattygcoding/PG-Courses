---
title: The doctype and standards mode
summary: One line that changes how the parser and the engine behave, and the difference it is still making.
chapter: Getting started
minutes: 12
status: draft
---

## One line with one job

```html
<!doctype html>
```

That is the whole thing for a modern page. It has no closing tag, it is not an element, and it does not appear in the tree. Its
only job is to tell the parser to use **standards mode** rather than the quirks mode that HTML inherited from the 1990s.

The line is not decoration, and leaving it out changes how a browser behaves. Asking a browser for its own answer about a document
gives the two modes a name:

```text
with <!doctype html>:   document.compatMode: CSS1Compat
without any doctype:    document.compatMode: BackCompat
```

`CSS1Compat` is standards mode and `BackCompat` is quirks mode. Every browser has reported it under those names since the 1990s,
which is why the property is still called `compatMode` and why its values mention CSS 1.

## What quirks mode changes

The name suggests layout, and most of it is: the box model, the way a line box is measured around an image, the sizing of a table
cell. Those are CSS and they are covered in the CSS course.

What matters here is that quirks mode changes the **DOM** as well, and one difference is easy to demonstrate. Take two elements,
one with `class="Foo"` and one with `class="foo"`, and ask for the class selector:

```text
                                    standards mode   quirks mode
dot-foo selector .foo                       1               2
exact attribute selector [class="Foo"]      1               1
```

In standards mode `.foo` matched the element whose class is exactly `foo`, and one element matched. In quirks mode the class
selector was matched **case-insensitively**, so the same selector matched both elements.

That is a rule from the DOM standard rather than from CSS: in quirks mode, class and id matching ignores case. It is the kind of
difference that turns a working page into a mysterious one, and it is entirely caused by a missing line at the top of the file.

## The doctypes that are still around

There are three groups, and a browser puts a document into a mode from the doctype it finds:

| Doctype | Mode |
| --- | --- |
| `<!doctype html>` | standards |
| HTML 4.01 Transitional with a system identifier | almost standards, reported as `CSS1Compat` |
| HTML 4.01 Strict, or XHTML 1.0 Strict | standards |
| anything unrecognised, or nothing at all | quirks |

The old ones are worth recognising because you will meet them in old code and in generated exports. This one is HTML 4.01
Transitional, and a browser reports it as `CSS1Compat`:

```html
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
```

That is "almost standards mode", a third mode whose only difference from standards mode was the layout of images inside table
cells. It is not worth knowing the rule that separates it from the other two, and it is worth knowing that the mode is decided by
matching the doctype against a list rather than by parsing it.

## The uppercase version

```html
<!DOCTYPE html>
```

That is the same doctype. HTML is case-insensitive, so `<!DOCTYPE html>` and `<!doctype html>` are identical, and both are
recognised. Pick one and be consistent, and the lowercase version is what the standard itself writes.

The one thing you cannot do is write a doctype that looks plausible and is not recognised:

```html
<!DOCTYPE html5>
<!DOCTYPE>
```

Both of those put the document into quirks mode, silently, because neither matches a recognised form. A doctype is not a version
number you can invent; it is a magic string from a list.

## Why it is still here

Given that the modern doctype is one fixed string with no content, a reasonable question is why HTML has one at all. The honest
answer is that it was kept for compatibility: pages written in 2005 already had doctypes, browsers already switched modes on
them, and a language with no way to distinguish a new page from an old one would have had to choose between breaking old pages and
never fixing the old behaviour.

So `<!doctype html>` is a flag rather than a declaration. Its name is a historical accident and its only content is "this is not
1998".

## The rule

Write `<!doctype html>` as the first line of every HTML file, before anything else, including comments.

```html
<!-- A copyright header before the doctype is fine -->
<!doctype html>
```

That last point is worth knowing because it is the one place a comment can cause trouble: a comment before the doctype is allowed,
and if it contains anything that looks like a doctype, that is the one the parser may act on instead. The first thing in the file
being the doctype is the habit that avoids the question.

## Check yourself

Open a page you have and read `document.compatMode` in the browser console, both with and without the doctype line. Then add an
element with a mixed-case class and confirm the selector behaviour changes between the two modes. Finish by finding a page in the
wild with an HTML 4 doctype and saying which mode it is in.
