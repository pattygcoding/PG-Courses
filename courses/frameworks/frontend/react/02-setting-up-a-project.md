---
title: Setting up a project
summary: One command writes the project, and npm decides which major versions you get from the Node you have.
chapter: Getting started
minutes: 14
status: draft
---

## Node first

Vite 8 declares this in its `engines` field:

```json
"engines": { "node": "^20.19.0 || >=22.12.0" }
```

React Router 8 is stricter:

```json
"engines": { "node": ">=22.22.0" }
```

I ran the install on Node 22.21.0, which is below that floor, and npm did not error. It quietly resolved
an older major instead:

```text
$ npm install react-router
$ npm ls react-router
└── react-router@7.18.5
```

The package I asked for was `react-router`, the registry has 8.5.1 as `latest`, and the tree holds 7.18.5
because npm respects an `engines` field when it picks a version. `npm view react-router dist-tags` shows
both, and `npm install react-router@8` on a new-enough Node installs 8. Two things follow: check
`node --version` before you start, and read the version you actually got rather than the one you asked
for.

## Creating the project

```bash
npm create vite@latest northside-library -- --template react-ts --no-interactive
```

```text
Scaffolding project in northside-library...

Done. Now run:

  cd northside-library
  npm install
  npm run dev
```

The scaffolder asks two questions when you run it without those flags. It offers **Oxlint** or ESLint for
linting, defaulting to Oxlint, and it asks whether to install and start the dev server. `--no-interactive`
takes the defaults, `--eslint` picks the other linter, and `--no-immediate` skips the install.

```text
src/App.tsx          src/main.tsx        src/index.css
src/App.css          public/favicon.svg  index.html
vite.config.ts       tsconfig.json       tsconfig.app.json
tsconfig.node.json  .oxlintrc.json      package.json
```

## The scripts

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview"
}
```

`npm run build` type-checks before it bundles, which means a type error stops the build rather than
appearing in the output. `vite preview` serves the built files, and it is the closest thing to production
you get without a host.

## The TypeScript options

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Four of those are worth knowing by name:

- `"jsx": "react-jsx"` is what allows JSX without importing React into every file. The transform is the
  automatic runtime, so `import React from 'react'` at the top of a component is unnecessary and the
  linter will tell you so.
- `verbatimModuleSyntax` means a type import must say so: `import type { Book } from './book'`. A plain
  import of a type is an error rather than something the compiler removes for you.
- `noUnusedLocals` and `noUnusedParameters` fail the build on a variable nobody reads, which is the
  setting that keeps a component free of leftovers.
- `erasableSyntaxOnly` rules out enums, namespaces and parameter properties, which is what lets a bundler
  strip types without a full type checker.

## The Vite config

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
})
```

Everything in this course reaches that file eventually: the React plugin, the compiler, the test runner
and a development-only API stub.

## The entry point

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

`createRoot` finds the element and takes over. `StrictMode` renders every component twice in development
and runs each effect an extra time on purpose, so a mistake that only shows up on a slow second render
shows up in development. It does nothing in a production build, which is why a render count measured in
development looks doubled.

## Check yourself

Create a project, then run `npm ls --depth=0` and read every version you actually got. Compare the
`engines` field of anything that looks older than you expected with the Node you are running, and install
the package again with an explicit version.
