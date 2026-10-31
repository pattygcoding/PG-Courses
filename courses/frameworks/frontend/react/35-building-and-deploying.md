---
title: Building and deploying
summary: What the build writes, the environment variable that is inlined, and the fallback a static host needs.
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
transforming...
✓ 118 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                    0.46 kB │ gzip:   0.30 kB
dist/assets/index-KvZSNVjN.css     0.77 kB │ gzip:   0.41 kB
dist/assets/Reports-B2zP5pvk.js    2.36 kB │ gzip:   1.02 kB
dist/assets/index-BxJgBDjW.js    337.24 kB │ gzip: 106.72 kB

✓ built in 132ms
```

Two files carry the application and one carries the lazy route. React, ReactDOM and React Router are most of the
337 kB, and gzip takes it to 107 kB, which is the number that matters over a network.

`tsc -b` runs first, so a type error stops the build before a bundle is written. The hash in each filename is what
lets a host cache assets forever: a new build has a new name, and the old file stops being requested.

## The API address

```ts
const base = import.meta.env.VITE_API_BASE ?? '/api';
```

```bash
# .env.production
VITE_API_BASE=https://api.example.com
```

Vite replaces `import.meta.env.VITE_API_BASE` with the literal string while building, so the value is in the
bundle and reads as a constant at runtime. Two consequences:

- A variable that starts with `VITE_` is public. It ends up in JavaScript that anybody can read, so an API key,
  a token or a database URL does not belong there. Secrets live on the server the browser talks to.
- A change to the value needs a rebuild. It is not read at runtime, so setting it in the host's environment after
  the build does nothing.

The `?? '/api'` matters for local work: with no environment file the app asks the dev server for the same origin
path it uses in the deployed static build.

## The dev API stub

```ts
function apiStub(): Plugin {
  const middleware: Connect.NextHandleFunction = (request, response, next) => {
    if (request.method !== 'POST' || request.url === undefined) {
      next();
      return;
    }

    if (request.url === '/api/loans') {
      void readJson(request).then((loan) => {
        const dueOn = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        reply(response, 201, { id: `loan-${String(loan['member'] ?? 'member')}`, dueOn });
      });
      return;
    }

    next();
  };

  return {
    name: 'library-api-stub',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}
```

The JSON files under `public/api` answer the reads, and this middleware answers the two writes. `configureServer`
covers `npm run dev` and `configurePreviewServer` covers `npm run preview`, so the same demo works in both without
a real backend.

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
    index-BxJgBDjW.js
    index-KvZSNVjN.css
    Reports-B2zP5pvk.js
```

Those files go to any static host. The one thing the host has to do is serve `index.html` for a path that is not
a file, because `/books/dune` is a route in the application rather than a file on disk. Without that fallback, a
reload on a deep link returns the host's 404 page.

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

Two blocks: the hashed assets can be cached for a year, and everything else falls back to the entry document. A
host that cannot be configured, such as a storage bucket with no rewrite rule, serves the app only from its root
path, which is the reason a project with deep links wants a host that supports rewrites.

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

The build stage has Node and the toolchain, and the final image has neither: it is nginx with four static files in
it, which is what makes the image small. `npm ci` installs from the lock file exactly, which is what a build
machine needs.

```bash
docker build -t northside-library .
docker run --rm -p 8080:80 northside-library
```

## The pipeline

```bash
npm ci
npm run build
npx vitest run
```

Three commands, in that order. `npm run build` includes the type check, which is the fastest failure, and the
test suite runs after a bundle exists so a broken transform is caught by the build rather than by a test file.

## Check yourself

Build the project, serve `dist` with a static server that has no rewrite rule, and navigate to a deep link. Then
add the rewrite and repeat. Finally, set `VITE_API_BASE` to a wrong host, rebuild, and read the failure in the
network panel to confirm the value is baked into the bundle.
