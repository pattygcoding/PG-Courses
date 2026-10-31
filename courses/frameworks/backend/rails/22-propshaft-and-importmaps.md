---
title: Propshaft and importmaps
summary: Assets served as they are, JavaScript with no build step, and what that costs.
chapter: Hotwire
minutes: 14
status: draft
---

## Propshaft serves files

```erb
<%= stylesheet_link_tag :app, "data-turbo-track": "reload" %>
```

```html
<link rel="stylesheet" href="/assets/application-8f3c1b0e.css" data-turbo-track="reload">
```

Propshaft takes `app/assets/stylesheets/application.css`, serves it at a path with a digest in the name, and does
nothing else to it. The stylesheet for this application is plain CSS with no preprocessor, and the `:app` in the tag
means "the application's stylesheet" rather than a file called `app.css`.

The digest in the filename is the cache strategy: a file whose contents change gets a new name, so a browser can cache
it forever and a deploy does not need to be synchronised with a purge.

```text
app/assets/stylesheets/application.css   served at /assets/application-<digest>.css
app/assets/images/logo.svg               served at /assets/logo-<digest>.svg
```

`image_tag "logo.svg"` builds that URL, and `asset_path` does the same for a path written by hand. In development the
digests are still there and the files are recompiled on request; in production they are written once at deploy, which
is why the build has an `assets:precompile` step.

## What replaced Sprockets

Sprockets, the previous pipeline, compiled SCSS, ran a minifier, resolved `//= require` comments and handled several
JavaScript toolchains. Rails 8 uses Propshaft and expects the browser to be told about ES modules instead. The costs of
the change are worth naming:

| Lost | Gained |
| --- | --- |
| SCSS compiled in the pipeline | one less dependency; use `cssbundling-rails` or plain CSS |
| `//= require` concatenation | ES modules, which are in every browser |
| minification by default | smaller pipeline; add `cssbundling-rails` when you need it |
| asset fingerprint manifest by default | digest filenames on the files themselves |

For a project that needs Sass, the answer is one of two gems rather than a return to Sprockets:
`cssbundling-rails` runs `sass` through the asset pipeline's output, and `tailwindcss-rails` does the same for
Tailwind.

## Importmaps

```ruby
# config/importmap.rb
# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
```

An importmap is a browser feature, and it is the whole build step:

```html
<script type="importmap">
{
  "imports": {
    "application": "/assets/application-<digest>.js",
    "@hotwired/turbo-rails": "/assets/turbo.min-<digest>.js",
    "controllers": "/assets/controllers/index-<digest>.js"
  }
}
</script>
```

`import "controllers"` in a module resolves through that map to a URL the browser fetches. No bundler, no
`node_modules`, no compilation: the file written is the file served, and a change is visible on reload.

```js
// app/javascript/application.js
import "@hotwired/turbo-rails"
import "controllers"
```

`bin/importmap` is the tool:

```bash
bin/importmap pin chart.js           # add a package from the CDN
bin/importmap pin chart.js --download # download it into vendor/javascript
bin/importmap unpin chart.js
bin/importmap json                    # the map, as JSON
```

`--download` is the option that matters for a project that cannot depend on a CDN at runtime: the file lands in
`vendor/javascript` and is served from the application like any other asset.

## What the map cannot do

| Need | Importmaps | A bundler |
| --- | --- | --- |
| TypeScript | no | yes |
| JSX | no | yes |
| importing a CommonJS package | only if it has an ES module build | yes, with interop |
| tree shaking | no | yes |
| npm's full resolution rules | no | yes |
| a build step in CI | none | one |

The trade is honest: Rails' default gets a small application running with no build, and a large front-end eventually
wants `jsbundling-rails` with esbuild or Vite. A Rails application can switch when it gets there, and the templates do
not change: the importmap tags are replaced by one `javascript_include_tag`.

A middle path that covers most real applications is importing a prebuilt module from the CDN in a Stimulus controller,
which is what the previous page's chart example does. The dependency is a script tag's worth of risk and the build stays
empty.

## Where the JavaScript is not

There is no `<script>` tag in any template in this application, and only two lines in `application.js`. Everything
interactive is Turbo and Stimulus, configured through HTML attributes, which is the reason the asset pipeline can be
this simple.

The one thing to watch is a script that assumed a page load. With Turbo Drive the page rarely loads, so an initialiser
written as `document.addEventListener("DOMContentLoaded", ...)` runs once and then never again. The equivalent in this
world is a Stimulus `connect`, or a `turbo:load` listener:

```js
document.addEventListener("turbo:load", () => {
  // runs after every Turbo visit as well as the first load
})
```

## Check yourself

Look at the rendered catalogue page and find the importmap, then explain what `pin_all_from "app/javascript/controllers",
under: "controllers"` did to the map. Then add a second stylesheet, confirm it appears as link elements in the head
with a digest, and change one rule to see the digest change.
