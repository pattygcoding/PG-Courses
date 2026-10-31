---
title: Building and deploying
summary: What the build writes, the variable that is inlined, and the fallback a static host needs.
chapter: Shipping
minutes: 14
status: draft
---

## The build

```bash
npm run build
```

```text
vite v8.3.5 building client environment for production...
✓ 91 modules transformed.
dist/index.html                                    0.52 kB │ gzip:  0.32 kB
dist/assets/LoanFormView-DBGNbTML.css              0.12 kB │ gzip:  0.12 kB
dist/assets/BookDetailView-DCqnYpBh.css            0.23 kB │ gzip:  0.17 kB
dist/assets/ReportsView-W21aKi-X.css               0.24 kB │ gzip:  0.17 kB
dist/assets/index-DaDb2O8x.css                     2.64 kB │ gzip:  0.99 kB
dist/assets/NotFoundView-pWD7SJZw.js               0.46 kB │ gzip:  0.35 kB
dist/assets/LoanThanksView-c6Y6NR_w.js             0.59 kB │ gzip:  0.42 kB
dist/assets/loans-DcBpceIc.js                      0.63 kB │ gzip:  0.39 kB
dist/assets/ReportsView-Ck6mBkso.js                1.34 kB │ gzip:  0.74 kB
dist/assets/LoanFormView-DZAnBJ09.js               2.81 kB │ gzip:  1.41 kB
dist/assets/BookDetailView-DtBU2KXm.js             3.91 kB │ gzip:  1.75 kB
dist/assets/index-4NPJf2T2.js                     48.53 kB │ gzip: 19.26 kB
dist/assets/runtime-core.esm-bundler-D6CIsE30.js  64.30 kB │ gzip: 24.83 kB

✓ built in 285ms
```

Two files carry the application and eleven carry the pieces. The gzip column is the one that counts over a network:
24.83 kB for Vue itself, 19.26 kB for the application, and less than two kilobytes for every route chunk.

`npm run build` runs the type check in parallel with the bundling, so a type error fails the build rather than appearing
in the output. The hash in each filename is what lets a host cache assets for a year: a new build produces new names,
and the old files stop being requested. Two hundred and eighty-five milliseconds is the whole build, which is worth
knowing before reaching for more bundler configuration.

## The environment variable

```ts
const base = import.meta.env.VITE_API_BASE ?? '/api'
```

```bash
# .env.production
VITE_API_BASE=https://api.example.com
```

Vite replaces `import.meta.env.VITE_API_BASE` with the literal string while building, so the value is in the bundle and
reads as a constant at runtime. Two consequences:

- **A `VITE_` variable is public.** It ends up in JavaScript that anybody can read, so a token or a database URL does
  not belong there. Secrets live on the server the browser talks to.
- **A change needs a rebuild.** It is not read at runtime, so setting it in the host's environment after the build does
  nothing.

The `?? '/api'` matters for local work: with no environment file, the application asks the dev server for the same
origin path it uses in a static deployment.

## The development API stub

```ts
function apiStub(): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    if (request.method !== 'POST' || request.url === undefined) {
      next()
      return
    }

    if (request.url === '/api/loans') {
      void readJson(request).then((loan) => {
        const dueOn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        reply(response, 201, { id: `loan-${String(loan['member'] ?? 'member')}`, dueOn })
      })
      return
    }

    next()
  }

  return {
    name: 'library-api-stub',
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
```

The JSON files under `public/api` answer the reads, and that middleware answers the two writes. `configureServer` covers
`npm run dev` and `configurePreviewServer` covers `npm run preview`, so the demo works in both without a backend. It is
a development tool, and it is thirty lines in a config file rather than a dependency.

In an application with a backend, the same job is a proxy:

```ts
server: {
  proxy: {
    '/api': 'http://localhost:8080',
  },
},
```

That keeps the browser on one origin during development, which is what makes a session cookie work without CORS
configuration.

## Deploying static files

```text
dist/
  index.html
  assets/
    index-4NPJf2T2.js
    runtime-core.esm-bundler-D6CIsE30.js
    BookDetailView-DtBU2KXm.js
    index-DaDb2O8x.css
```

Those files go to any static host. The one thing the host has to do is serve `index.html` for a path that is not a
file, because `/books/dune` is a route in the application rather than a file on disk. Without that fallback, reloading on
a deep link returns the host's 404 page.

```conf
server {
  root /usr/share/nginx/html;
  index index.html;

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

Two blocks: the hashed assets can be cached for a year, and everything else falls back to the entry document. A host
that cannot be configured, such as a storage bucket with no rewrite rule, serves the application only from its root
path, which is why a project with deep links wants a host that supports rewrites.

A deployment under a subpath needs one more thing, and it is the step people miss:

```ts
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // ...
})
```

`BASE_URL` comes from Vite's `base` setting. Deploying to `https://example.com/library/` without setting `base` leaves
the router convinced it owns the root, and every generated link is wrong.

## The container

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

The build stage has Node and the toolchain, and the final image has neither: it is nginx with the built files in it,
which is what keeps the image small. `npm ci` installs from the lock file exactly, which is what a build machine needs.

```bash
docker build -t northside-library .
docker run --rm -p 8080:80 northside-library
```

## The pipeline

```bash
npm ci
npm run type-check
npm run test:unit -- --run
npm run build
```

Four commands, in that order. The type check first because it is the fastest failure, the tests second, and the build
last. A pipeline that builds before it tests spends its slowest step on a change that was going to fail anyway.

## Check yourself

Build the project, serve `dist` with a server that has no rewrite rule, and open a deep link. Then add the rewrite and
try again. Finally, set `VITE_API_BASE` to a wrong host, rebuild, and read the failure in the network panel to confirm
the value is baked into the bundle.
