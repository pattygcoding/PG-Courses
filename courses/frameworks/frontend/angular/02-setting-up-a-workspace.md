---
title: Setting up a workspace
summary: The CLI writes the build, the tests and the style rules before your first component exists.
chapter: Getting started
minutes: 14
status: draft
---

## The Node version is not optional

Angular 22.2.5 declares this in its `engines` field:

```json
"node": "^22.22.3 || ^24.15.0 || >=26.0.0"
```

I tried to scaffold on Node 22.21.0, which is five patch releases below the first range, and the CLI
stopped before it wrote anything:

```text
Node.js version v22.21.0 detected.
The Angular CLI requires a minimum Node.js version of v22.22.3 or v24.15.0 or v26.0.0.
```

That is the whole failure mode: an old runtime gives you a version error, not a strange build. Check
`node --version` before you start and update if the first two numbers do not match.

## Creating the project

```bash
npx @angular/cli@22 new northside-library --style=css --routing --package-manager=npm
```

```text
CREATE northside-library/angular.json
CREATE northside-library/package.json
CREATE northside-library/tsconfig.json
CREATE northside-library/tsconfig.app.json
CREATE northside-library/tsconfig.spec.json
CREATE northside-library/src/main.ts
CREATE northside-library/src/index.html
CREATE northside-library/src/styles.css
CREATE northside-library/src/app/app.ts
CREATE northside-library/src/app/app.html
CREATE northside-library/src/app/app.css
CREATE northside-library/src/app/app.config.ts
CREATE northside-library/src/app/app.routes.ts
CREATE northside-library/src/app/app.spec.ts
CREATE northside-library/public/favicon.ico
```

Four of those files carry the decisions for the whole project, so it is worth knowing what each one
holds before you change anything.

## package.json holds four scripts

```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve",
    "build": "ng build",
    "watch": "ng build --watch --configuration development",
    "test": "ng test"
  }
}
```

`ng serve` runs a dev server with live reload on port 4200. `ng build` writes the production bundle.
`ng test` runs the unit tests, and the generated project uses Vitest with the `@angular/build:unit-test`
builder, so `describe`, `it`, `expect` and `vi` are global through `tsconfig.spec.json`.

## angular.json holds the build configuration

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "browser": "src/main.ts",
    "tsConfig": "tsconfig.app.json",
    "assets": [{ "glob": "**/*", "input": "public" }],
    "styles": ["src/styles.css"]
  },
  "configurations": {
    "production": {
      "budgets": [
        { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
        { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
      ],
      "outputHashing": "all"
    },
    "development": { "optimization": false, "extractLicenses": false, "sourceMap": true }
  },
  "defaultConfiguration": "production"
}
```

Two things are worth noticing. The `assets` entry copies everything in `public/` to the output, which
is where the demo API for this course lives. The budgets fail the build rather than warn it alone,
so an accidental import of a large library stops the deploy instead of shipping 3 MB.

## tsconfig checks more than you wrote

```json
{
  "compilerOptions": {
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "target": "ES2022",
    "module": "preserve"
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true
  }
}
```

The word `strict` is missing from that file, and the checks still apply, because TypeScript 6 turns
them on by default. I added a function that read `.length` on a `string | undefined` and the build
failed:

```text
X [ERROR] TS18048: 'value' is possibly 'undefined'
```

`strictInjectionParameters` and `strictInputAccessModifiers` are the Angular-specific additions: a
component input without an access modifier is an error, and a dependency that cannot be resolved at
construction time is too.

## Generating code

```bash
ng generate component library/book-list
```

```text
CREATE src/app/library/book-list/book-list.ts
CREATE src/app/library/book-list/book-list.html
CREATE src/app/library/book-list/book-list.css
CREATE src/app/library/book-list/book-list.spec.ts
UPDATE src/app/app.ts
```

Recent versions of the style guide drop the `.component` suffix, so the class is `BookList` in
`book-list.ts`. The generator also edits the importing component, which is convenient for a small
project and worth reviewing once a file has been reorganised by hand.

## The dev server and a proxy

```bash
ng serve --open
```

The server compiles on change and reloads the page. Deep links work without extra configuration: a
request for `/books/dune` returns `index.html` and the router takes over, which is also how the
production host has to be configured.

When the API runs on another port, `angular.json` takes a proxy entry and you point the app at
relative URLs:

```json
"serve": {
  "builder": "@angular/build:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "changeOrigin": true
  }
}
```

Relative URLs plus a proxy during development is the arrangement I keep coming back to, because the
same code then works behind a reverse proxy in production with no rebuild.

## Check yourself

Generate a project, then run `ng serve`, `ng build` and `ng test` in three terminals and read what
each one prints. Then set `"maximumWarning": "50kB"` in the initial budget and build again to see the
warning turn into a number you have to deal with.
