---
title: The global attributes
summary: The attributes every element has, what each one does, and the two that carry your own data.
chapter: The syntax
minutes: 13
status: draft
---

## Attributes every element accepts

Most attributes belong to one element: `href` to `a`, `src` to `img`, `type` to `input`. A smaller set is **global** and works on
anything, and that set is worth knowing because it is where the behaviour a layout cannot express lives.

```html
<p id="one" class="a b" lang="fr" dir="rtl" tabindex="3" hidden title="A tooltip">One</p>
<div id="two" contenteditable="true">Two</div>
<span id="four" spellcheck="false" draggable="true">Four</span>
<span id="five" data-user-id="42" data-role="admin">Five</span>
```

Asking the browser about each of those gives:

```text
P one:     lang="fr" dir="rtl" tabIndex=3 hidden=true display=none classList=["a","b"]
DIV two:   tabIndex=-1 hidden=false display=block editable=true
SPAN four: tabIndex=-1 spellcheck=false draggable=true
SPAN five: dataset={"check":"globals","userId":"42","role":"admin"}
```

## The identity and style attributes

| Attribute | Job |
| --- | --- |
| `id` | a unique name for one element in the document |
| `class` | a space-separated list of names, shared freely |
| `style` | CSS written on the element, which the CSS course covers |
| `title` | advisory text, shown as a tooltip and used as a name only when nothing else provides one |

`id` has the one hard rule: **unique in the document**. It is the target of a fragment link, the argument to `getElementById` and
the anchor for a label's `for`, and a duplicate makes all three behave unpredictably. In the output above, `classList` is
`["a","b"]` from `class="a b"`, which is the split that makes the class attribute a list rather than a string.

`title` deserves a warning, because it is the attribute beginners reach for to add a description and it is the wrong tool. A
tooltip needs a mouse, is invisible to a touch screen, is not reliably announced, and becomes an element's accessible name only
when nothing else gives it one. For a control, the name belongs in a label; for extra information, in text on the page.

## The attributes that change behaviour

| Attribute | Effect |
| --- | --- |
| `hidden` | removes the element from rendering entirely |
| `tabindex` | joins the keyboard order, or leaves it |
| `contenteditable` | makes the element's content editable |
| `spellcheck` | turns the spelling checker on or off |
| `draggable` | makes the element draggable |
| `autofocus` | focuses the element when the page loads |

```text
DIV two:   editable=true
P one:     hidden=true display=none
```

Two verified details. `hidden` gave `display=none`, so a hidden element is not merely invisible: it takes no space and is not
rendered. And `contenteditable="true"` and `contenteditable=""` both gave `editable=true`, because `contenteditable` accepts the
empty string as true in the same way a boolean attribute does.

`tabindex` needs the most care of the six, because it has three behaviours depending on its value:

| Value | Effect |
| --- | --- |
| absent | the element's native focusability decides |
| `0` | focusable, in document order |
| a positive number | focusable, **before** everything with `0`, in ascending order |
| `-1` | focusable by script, not by the keyboard |

Positive values are the trap. A `tabindex="3"` jumps ahead of the page's natural order, so a page with two positive tabindexes and
a third added later has a keyboard order nobody can predict. The rule that holds up: use `0` when an element needs to be focusable,
`-1` when it needs to be focusable by script, and never a positive number.

```text
P one:     tabIndex=3
SPAN four: tabIndex=-1
```

The `-1` on the span is the default for an element that is not natively focusable. It does not mean "no focus", it means "not in
the tab order", which is the state every `div` and `span` is in.

## Language and direction

```text
P one:   lang="fr" dir="rtl"
P six:   nearest lang ancestor="en-GB"
```

`lang` sets the language of an element's content and it **inherits**: a `span` with no `lang` has the nearest ancestor's value,
which the last line shows by walking up the tree. The document's language goes on `<html>`, and a passage in another language gets
its own `lang`, which is what a screen reader uses to change pronunciation mid-page.

`dir` sets the text direction, with `ltr`, `rtl` and `auto`. `auto` derives the direction from the first character with a known
direction, which is the right setting for user-generated content whose language you cannot know. A bug report in Arabic in a form
textarea is the case that makes `dir="auto"` worth knowing.

## The two that carry your own data

```html
<span data-user-id="42" data-role="admin">Five</span>
```

```text
dataset={"userId":"42","role":"admin"}
```

`data-*` is the only extension mechanism HTML has for attributes. The name starts with `data-`, contains no uppercase letters, and
becomes a property in `dataset` with the hyphens converted to camelCase: `data-user-id` is `dataset.userId`.

The rules that keep them from becoming a dumping ground:

- **Use them for data, not for styling.** A `data-` attribute that only CSS reads is a class with a worse name.
- **Use them for a value, not for state the DOM already tracks.** `data-checked="true"` on a checkbox duplicates what the element
  knows, and the two will disagree.
- **One attribute per value**, so `data-user-id="42"` rather than `data-user="id:42;role:admin"`, which is a string format where a
  schema belongs.

Scripts read them too, which is the JavaScript course's side of it, and they are why a component can carry its own configuration
without inventing an element for it.

## The ones to avoid

| Attribute | Why not |
| --- | --- |
| `style` | CSS on the element, invisible to the stylesheet and impossible to override cleanly |
| `on*` such as `onclick` | JavaScript in an attribute, which the JavaScript course covers |
| `accesskey` | a keyboard shortcut that collides with the browser's and the screen reader's |
| `title` for a description | see above; it is a tooltip and nothing more |

The first two are the ones that matter. A page with `style` and `onclick` attributes is a page with its three languages tangled
together, and the tangle is what makes a page that cannot be restyled, tested or read by anyone but its author.

## Check yourself

Put `id`, `class`, a `data-` attribute and a `title` on one element and inspect each in the browser. Add `hidden` and confirm the
element takes no space, then `tabindex="0"` and confirm it joins the keyboard order. Finish by putting a French sentence inside an
English page with its own `lang` and explaining which element needs the attribute.
