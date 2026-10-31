---
title: The template compiler
summary: The render function a template becomes, the patch flags it carries, and what hoisting removes.
chapter: Performance
minutes: 15
status: draft
---

## What the template becomes

A throwaway script in this project prints the compiler's output for one component:

```js
// scripts/compiled-template.mjs
import { readFile } from 'node:fs/promises'
import { compileTemplate, parse } from 'vue/compiler-sfc'

const file = process.argv[2] ?? 'src/components/BookCard.vue'
const source = await readFile(file, 'utf8')
const { descriptor } = parse(source, { filename: file })
const compiled = compileTemplate({ source: descriptor.template.content, filename: file, id: 'probe' })

console.log(compiled.code)
```

```bash
node scripts/compiled-template.mjs src/components/BookCard.vue
```

That is the same compiler the build runs, called directly, and the interesting part is the annotation. Here is what
it printed for `BookCard.vue`, trimmed to the parts worth reading:

```js
const _hoisted_1 = { class: "copies" }
const _hoisted_2 = { class: "renders" }

export function render(_ctx, _cache) {
  const _component_RouterLink = _resolveComponent("RouterLink")

  return (_openBlock(), _createElementBlock("li", {
    class: _normalizeClass(["card", { highlighted: _ctx.highlighted === true }])
  }, [
    _createVNode(_component_RouterLink, {
      to: { name: 'book', params: { id: _ctx.book.id } },
      onClick: _cache[0] || (_cache[0] = $event => (_ctx.emit('chosen', _ctx.book.id)))
    }, {
      default: _withCtx(() => [
        _createTextVNode(_toDisplayString(_ctx.book.title), 1 /* TEXT */)
      ]),
      _: 1 /* STABLE */
    }, 8 /* PROPS */, ["to"]),
    _createElementVNode("p", null, "by " + _toDisplayString(_ctx.book.author) + " - " + _toDisplayString(_ctx.genreLabel(_ctx.book.genre)), 1 /* TEXT */),
    _createCommentVNode(" The caller decides what goes under the title, and gets the copies to do it. "),
    _renderSlot(_ctx.$slots, "footer", {
      copies: _ctx.book.copies
    }, () => [
      _createElementVNode("span", _hoisted_1, _toDisplayString(_ctx.book.copies) + " on the shelf", 1 /* TEXT */)
    ]),
    _createElementVNode("span", _hoisted_2, "card renders " + _toDisplayString(_ctx.cardRenderCount()), 1 /* TEXT */)
  ], 2 /* CLASS */))
}
```

Five things in that function are the reason a Vue update is cheap, and each one is a decision the compiler made by
reading the template.

## Static content is hoisted

```js
const _hoisted_1 = { class: "copies" }
const _hoisted_2 = { class: "renders" }
```

The props object for the two static spans is created once, outside the render function, and every render reuses it.
A template with a large static subtree hoists the whole subtree, so a render that changes one text node does not
recreate a hundred objects to do it.

## Patch flags

```js
_createTextVNode(_toDisplayString(_ctx.book.title), 1 /* TEXT */)
```

```js
_createVNode(_component_RouterLink, { /* props */ }, { /* slots */ }, 8 /* PROPS */, ["to"])
```

```js
_createElementBlock("li", { class: _normalizeClass([...]) }, [...], 2 /* CLASS */)
```

The trailing number is a bitmask of what in that vnode can change, and the runtime reads it instead of guessing:

| Flag | Name | What the runtime does |
| --- | --- | --- |
| 1 | TEXT | compares the children as text |
| 2 | CLASS | compares the class attribute |
| 8 | PROPS | compares the props listed after it, and only those |
| 16 | STYLE | compares the style |
| 32 | NEEDS_PATCH | the whole vnode, for a `v-bind` spread |

`8 /* PROPS */, ["to"]` is the strongest of those: the `RouterLink` vnode can only have changed its `to` prop, so
the runtime checks `to` and skips the rest of the object. That is the dynamic-attribute list, and it is why a
template with one reactive attribute on an element with ten attributes costs one comparison rather than ten.

## Slots carry their own marking

```js
{
  default: _withCtx(() => [ /* ... */ ]),
  _: 1 /* STABLE */
}
```

`_: 1 /* STABLE */` says the slot's compiled content is stable, so a child does not need to re-render for it. A slot
with a `v-if` inside carries a different marker, and that difference is exactly the measurement on the next page:
a card that receives a slot with a condition in it re-renders with its parent, while a card receiving no slot at all
does not.

## Comments are compiled out of a production build

```js
_createCommentVNode(" The caller decides what goes under the title, and gets the copies to do it. ")
```

In development the comment is a node so the browser inspector can show it. In a production build the compiler drops
comments, so that line disappears and the template comment costs nothing over the wire. The same setting drops the
whitespace between elements.

## Why a template beats hand-written code

```ts
h('p', null, ['by ', toDisplayString(ctx.book.author)])
```

A hand-written render function gives the compiler nothing to read, so the runtime has to assume everything can
change. The compile-time annotation is the trade Vue makes: templates are less expressive than arbitrary code, and
in exchange the runtime knows which parts can change before the application runs.

```vue
<p v-if="loading">Loading</p>
<BookCard v-for="book in visible" :key="book.id" :book="book" />
```

Structure directives compile to structure too: `v-if` becomes a branch with its own blocks, and `v-for` becomes a
keyed fragment with a child per item. That is why `v-if` on a big subtree costs nothing when the condition is
false, and why a key is read by the runtime rather than by the component.

## Check yourself

Run the script against `CatalogueView.vue` and read the flags on the `BookCard` vnode: there should be several, and
the list after them names the props that can change. Then add a static wrapper element around the list, compile
again, and find the hoisted node.
