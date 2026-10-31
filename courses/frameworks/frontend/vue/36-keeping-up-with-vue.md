---
title: Keeping up with Vue
summary: How the version line works, what 3.5 added, and reading a dependency's requirements before it reads you.
chapter: Shipping
minutes: 12
status: draft
---

## The version line

Vue releases a minor version every few months, and a minor does not break the API. The project this course was written
against is at 3.5.44:

```text
3.5.x   new features and deprecations, no breaking changes
3.6     the next minor, and the release candidate the scaffolder can opt into
4.0     the next major, and the migration guide that would go with it
```

The scaffold can target the next minor before it is stable:

```bash
npm create vue@latest northside-library -- --vue-rc
```

`--vue-rc` generates a project against the Vue 3.6 release candidate. Vue 3.6's headline feature is **Vapor mode**, an
alternative compilation that produces code without a virtual DOM, aimed at the cases where the diffing work is the
cost. It is a compilation target rather than a new API, and nothing in this course depends on it. I have not built
against it either, so treat this paragraph as a pointer to the release notes rather than as a recommendation.

## What 3.5 added, and what this course used

| Feature | Where it appears here |
| --- | --- |
| reactive props destructure with defaults | lesson 11, and the props in `ScratchCheck` |
| `useTemplateRef` | lesson 9, and the exposed-method pattern in lesson 15 |
| `defineModel` stable | `AppField`, which is the one that fixed a real bug |
| improved `defineExpose` typing | `InstanceType<typeof Child>` in lesson 15 |

`defineModel` is the one that changed how a component is written: one declaration in place of a prop and an emit that
had to be spelled the same. A project on Vue 3.3 or earlier has the two declarations instead, and both styles are
valid for as long as the older version is supported.

## The versions around Vue move faster

```bash
npm view vue-router@5.4.0 peerDependencies
```

```json
{
  "vue": "^3.5.34 || ^4.0.0",
  "vite": "^7.3.0 || ^8.0.0",
  "pinia": "^3.0.4 || ^4.0.2",
  "@pinia/colada": ">=0.21.2",
  "@vue/compiler-sfc": "^3.5.34 || ^4.0.0"
}
```

```bash
npm view pinia@4.1.0 peerDependencies
```

```json
{
  "vue": "^3.5.11",
  "typescript": ">=5.6.0",
  "@vue/devtools-api": "^8.2.1"
}
```

That is where an upgrade actually breaks: not in Vue, but in the packages around it declaring a floor. Reading those
two blocks tells you three things before you install anything: the router needs Vue 3.5.34 or later, it works with
Vite 7 or 8, and Pinia 4 wants TypeScript 5.6 or newer.

```json
"engines": {
  "node": "^22.18.0 || >=24.12.0"
}
```

The project's own `engines` field, from the scaffolder, is the third floor. `npm install` warns when the running Node
does not satisfy it, and a project with `engine-strict=true` fails the install instead. Node is the requirement that
catches people out, because a toolchain upgrade is usually the reason for the dependency upgrade in the first place.

## How to follow it

- **The changelog on GitHub** for the minor releases, which is where a deprecation appears a long time before it
  becomes an error.
- **The release post** for a minor with a headline feature, which is where the reasoning behind it is written down.
- **`npm outdated`** on a schedule, so a major is never a surprise the day before a release.
- **The migration guide and the codemods** for a major. Vue's codemods handle the mechanical renames, and a diff read
  line by line is worth more than the time it takes.

## Upgrading without drama

```bash
npm outdated
npm install vue@latest vue-router@latest pinia@latest
npm run type-check
npm run test:unit -- --run
npm run build
```

The type check catches the API changes, the tests catch the behaviour, and the build catches the compile step. Then
read the lock file diff for anything that moved a major without being asked, which is how a transitive dependency
turns into a surprise.

Four things make that cheap, and all of them are decisions made long before the upgrade:

- **Types on every prop and every emit**, so a renamed API is a compile error rather than a runtime one.
- **Tests on behaviour**, so a render change is caught rather than reported by a user.
- **A small dependency tree.** This project has three runtime dependencies, which is why an upgrade is one command.
- **A pin on what matters.** `"vue": "^3.5.42"` takes patches and minors, which is what the release model promises,
  and a package you do not trust gets an exact version.

## What has not changed

The part of Vue this course is really about has been stable since 3.0: a template compiles to a render function, a ref
is a wrapper with a `.value`, a computed is cached, a watcher reacts, a prop goes down and an event goes up, and a
route is a component chosen by a URL. The syntax around those has changed at the edges, and the ideas have not, which
is why the pages here explain the model before the API.

Five years of releases have added the Composition API, `defineModel`, `useTemplateRef`, data loaders and a Vapor mode,
and every one of them landed on the same handful of concepts. That is the argument for learning this part properly
rather than tracking the newest thing each quarter.

## Check yourself

Run `npm outdated` in a project of yours and read the peer requirements of the two packages with the largest jumps.
Then do the smallest upgrade that is also valuable, in the order above, and write down which step caught the problem
if one appeared.
