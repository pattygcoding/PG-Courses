---
title: Setting up a project
summary: One scaffolder, the flags that answer its questions, and the config files that decide how the build and the tests behave.
chapter: Getting started
minutes: 14
status: draft
---

## Node first

The scaffolded project declares what it needs:

```json
"engines": {
  "node": "^22.18.0 || >=24.12.0"
}
```

`npm install` warns when the running Node does not satisfy it, and a project with `engine-strict=true` in its
`.npmrc` fails the install instead. Checking `node --version` before the first install saves a confusing minute
later, because Vite, the router and the test runner each declare their own floor and npm resolves the newest
version whose requirements are met.

## The scaffolder

```bash
npm create vue@latest northside-library -- --ts --router --pinia --vitest --eslint
```

```text
Vue.js - The Progressive JavaScript Framework

Scaffolding project in northside-library...

Done. Now run:

   cd northside-library
   npm install
   npm run dev
```

Run without the flags and it asks a series of yes and no questions: TypeScript, JSX, the router, Pinia, Vitest,
end to end testing, ESLint, Prettier. The flags above are the answers, which is the part worth keeping for a
scripted setup. Two details from the run are easy to miss:

- `--help` lists an `--oxlint` flag under deprecated, with the note that **Oxlint is always included when ESLint
  is selected**. The generated project carries both: Oxlint for speed on every file, ESLint for the Vue and
  TypeScript rules that need a type checker.
- `--vue-rc` would scaffold against the Vue 3.6 release candidate, and `--tsgo` against the native TypeScript
  port. Neither is what this course measured.

## What it writes

```text
env.d.ts                  tsconfig.app.json       src/main.ts
eslint.config.ts          tsconfig.json           src/router/index.ts
index.html                tsconfig.node.json      src/stores/
package.json              tsconfig.vitest.json    src/views/
vite.config.ts            vitest.config.ts        src/components/
.oxlintrc.json            .editorconfig           src/assets/
```

Four of those files decide how everything else behaves, and the rest of this page quotes three of them.

## The scripts

```json
"scripts": {
  "dev": "vite",
  "build": "run-p type-check \"build-only {@}\" --",
  "preview": "vite preview",
  "test:unit": "vitest",
  "build-only": "vite build",
  "type-check": "vue-tsc --build",
  "lint": "run-s \"lint:*\"",
  "lint:oxlint": "oxlint . --fix",
  "lint:eslint": "eslint . --fix --cache"
}
```

`run-p` and `run-s` come from `npm-run-all2`: `npm run build` runs the type check and the bundle in parallel,
and `npm run lint` runs the two linters in order. `vue-tsc --build` is the type check, and it is a different
program from `tsc` because a `.vue` file has to be read before the types inside it exist.

## The Vite config

```ts
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

Three things: the plugin that compiles `.vue` files, the devtools plugin that adds the inspector panel in
development, and an `@` alias pointing at `src`. `fileURLToPath` is what turns a module URL into a path, which is
what a Windows build needs.

## The test config

```ts
import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
```

The tests run through the same Vite config as the application, merged rather than copied, so a component under
test is compiled by the same plugin that compiles it in the build. `environment: 'jsdom'` provides `document`,
`jsdom` is the dependency that makes it work, and `e2e/**` is excluded so a browser suite added later does not
run twice.

## The TypeScript configs

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "include": ["env.d.ts", "src/**/*", "src/**/*.vue"],
  "exclude": ["src/**/__tests__/*"],
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "paths": { "@/*": ["./src/*"] },
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  }
}
```

```json
{
  "extends": "./tsconfig.app.json",
  "include": ["src/**/__tests__/*", "env.d.ts"],
  "exclude": [],
  "compilerOptions": {
    "lib": [],
    "types": ["node", "jsdom"],
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.vitest.tsbuildinfo"
  }
}
```

Two decisions are visible in those lines:

- **Tests live in `__tests__` directories.** The vitest config includes only those, with `jsdom` and Node types.
  A test file elsewhere is compiled with the application config and fails on `document` and on the test runner's
  globals. That is a constraint rather than a style preference, and it is why every test in this project sits
  beside what it covers inside a `__tests__` folder.
- **`noUncheckedIndexedAccess`** makes `books[0]` a `Book | undefined`. It catches a class of bug in a catalogue
  or a table, and it costs an explicit check at the few places that know an index is valid.

## The entry point

```ts
import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

`createApp` takes the root component and returns an application that plugins can be installed on before it is
mounted. The order matters for one thing in this project: Pinia goes on before the router, because a router guard
reads a store.

## The dev loop

```text
npm run dev

  VITE v8.3.5  ready in 247 ms
  ➜  Local:   http://localhost:4290/
  ➜  Vue DevTools: Open http://localhost:4290/__devtools__/ as a separate window
```

Editing a `.vue` file replaces the component in the running page without a reload. Editing a `.ts` file reloads
the page, unless only components that can take the change import it, which the plugin decides. When a change does
not appear, the browser console names the module it could not hot replace.

## Check yourself

Create the project with those flags, then run `npm run type-check`, `npm run test:unit -- --run` and
`npm run build`. Read the versions npm actually installed rather than the ranges the scaffolder wrote, and compare
them with the table at the end of the first page.
