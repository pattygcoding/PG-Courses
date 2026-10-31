---
title: Building and deploying
summary: One command produces the bundle, and the host serves hashed files forever while routing unknown paths to the app.
chapter: Shipping
minutes: 14
status: draft
---

## The build

```bash
ng build
```

```text
Initial chunk files | Names         |  Raw size | Estimated transfer size
main-XXXXXXXX.js    | main          | 294.73 kB |                82.08 kB
styles-XXXXXXXX.css | styles        |    0 bytes |                 0 bytes

Lazy chunk files    | Names         |  Raw size | Estimated transfer size
chunk-XXXXXXXX.js   | loan-form     |  64.27 kB |                16.20 kB
chunk-XXXXXXXX.js   | book-list     |   2.54 kB |                1.16 kB

Output location: dist/northside-library
```

`ng build` uses the production configuration by default, so the values that matter are the ones in
`angular.json` under `configurations.production`:

| Option | Effect |
| --- | --- |
| `outputHashing: all` | every file name carries a content hash |
| `optimization` | minify and tree-shake the JavaScript and CSS |
| `budgets` | fail the build when a bundle grows past a limit |
| `extractLicenses` | write third party licences to a file |

`outputHashing` is what makes the caching instructions easy: a hashed file never changes, so it can be
cached forever, and `index.html` carries no hash and must not be cached. Getting that pair the wrong way
round is the most common deployment bug in a single page application, and it presents as a stale page
that only a hard reload fixes.

```bash
ng build --configuration development
```

A development build keeps the source maps, skips the optimisation and writes to the same output folder,
so check which configuration your pipeline is running before you compare sizes.

## Deploying the static output

The browser folder is a set of static files with one requirement: a request for a path that has no file
must return `index.html`, because the router owns those URLs. That is the whole configuration for nginx:

```text
server {
  listen 80;
  root /usr/share/nginx/html;

  location /api/ {
    proxy_pass http://library-api:8080/;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  location ~* \.[0-9a-f]{8,}\.(js|css|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/northside-library/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

The API is proxied rather than called cross origin, so the browser sees one origin and there is no CORS
configuration and no preflight. Sealing `npm ci` before copying the source is what lets Docker reuse the
dependency layer across builds.

## Deploying the server

When a route is server rendered, the output has a second folder and the image runs node:

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY dist/northside-library ./dist
ENV PORT=4000
ENV NG_ALLOWED_HOSTS=library.example.com
EXPOSE 4000
CMD ["node", "dist/server/server.mjs"]
```

Three environment variables are worth knowing on that host: `PORT`, which the generated server reads
with a default of 4000, `NG_ALLOWED_HOSTS`, without which every request is refused with
`Header "host" with value ... is not allowed`, and whatever your API base needs if it is not the same
origin. The allow list is a security control rather than a formality, so it wants the real host name
rather than a wildcard in production.

Memory is the other difference. A node server rendering pages needs a few hundred megabytes of heap
because the framework is in the process, and the static image needs none. Prerender what you can and run
the server for the rest.

## The pipeline

```bash
npm ci
npm run build
npx ng test --watch=false
```

`npm ci` installs from the lock file without touching `package.json`, which is what a pipeline wants.
`ng test --watch=false` runs once and exits with a code, which the watcher version does not. Adding
`ng build` before the tests is deliberate: the compiler catches template type errors, and a failing
build should stop before ten minutes of tests.

Two things worth adding once the pipeline exists: a fresh clone (or a cleared `node_modules` and
`dist`) as a scheduled job, so a build that only works because of leftover files is found early, and the
bundle sizes from each build written somewhere you can chart them, because a bundle grows one dependency
at a time.

## Check yourself

Build for production and development and compare the output sizes and folder contents. Then serve the
browser folder with a plain static server, navigate to a deep link like `/books/dune`, and fix the 404
in the server configuration.
