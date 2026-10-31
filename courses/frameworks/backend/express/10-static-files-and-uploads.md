---
title: Static files and uploads
summary: express.static for assets, multer for a body that is not JSON, and the limits both need.
chapter: Middleware and the app
minutes: 14
status: draft
---

## Serving a folder

```ts
app.use(express.static("public", { maxAge: "1h" }));
```

```text
public/logo.svg      ->  GET /logo.svg
public/favicon.ico   ->  GET /favicon.ico
public/robots.txt    ->  GET /robots.txt
```

One line serves a folder at the root of the site. The middleware joins the request path onto the directory, refuses anything
that escapes it with `..`, guesses the content type from the extension, sets a `Last-Modified` and an ETag, and answers
`304` when a client already has the file.

That path check is the reason to use the middleware rather than reading the path yourself. The naive version is a directory
traversal:

```ts
response.sendFile(path.join("public", request.params.name));   // /../../etc/passwd
```

Express's static middleware resolves the path and refuses one that leaves the root, which is the bug you would otherwise
introduce while satisfying a request for `images/../logo.svg`.

## Caching static files

```ts
app.use(express.static("public", { maxAge: "1h" }));
```

`maxAge` becomes a `Cache-Control: public, max-age=3600` header, which is what stops every request for a logo from reaching
the server. Two other options matter for a site with HTML in front of it:

| Option | Effect |
| --- | --- |
| `etag: true` (default) | a conditional request can be answered with a 304 |
| `index: "index.html"` (default) | a request for a folder serves the file inside it |
| `extensions: ["html"]` | `/about` finds `about.html` |
| `immutable: true` | for filenames that contain a hash, which never change |

The last one is the pattern worth copying: a build that puts a content hash in the filename can tell clients to cache it
forever, because a new build produces a new name. Without hashes, a long `maxAge` on an HTML file is how a visitor sees last
week's page for a day.

## A multipart body

A file upload is not JSON. The body is a multipart document, and the parsers from the previous lesson ignore it, so it needs
its own middleware:

```ts
mkdirSync(directory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: directory,
    filename: (_request, file, callback) => {
      // The client's filename never becomes a path.
      callback(null, `${Date.now()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();

    callback(null, ALLOWED.has(extension));
  },
});

router.post("/covers", requireRole("librarian"), upload.single("cover"), (request, response) => {
  if (!request.file) {
    throw new UnsupportedMediaTypeError("Send a .jpg, .png or .webp file in a field named cover.");
  }

  response.status(201).json({
    data: { filename: request.file.filename, bytes: request.file.size, type: request.file.mimetype },
  });
});
```

```bash
curl -s -X POST http://localhost:3000/uploads/covers \
  -H "authorization: Bearer $TOKEN" -F 'cover=@scratch/cover.png'
```

```text
{"data":{"filename":"1793460656998.png","bytes":70,"type":"image/png"}}
```

Four decisions in that handler, and each one is a real risk in an upload endpoint:

| Decision | The risk it closes |
| --- | --- |
| the stored name is generated | a filename of `../../server.ts` writing where it should not |
| the extension is checked | a `.php` or `.html` file dropped into a served folder |
| two megabytes and one file | a client filling the disk, or a request that never ends |
| the role is required first | an anonymous client uploading anything at all |

The filename rule is the one people get wrong most often, because the client controls `file.originalname` entirely. It may
contain a path separator, a null byte that truncates later, or a name that collides with an existing file. Generating a name
from a timestamp and a validated extension removes the whole class of problem, and it makes the stored name unpredictable,
which is a small help against enumeration.

## Checking the type properly

An extension check is a cheap filter, and it is not a content check. A file called `cover.png` can contain anything, and if
anything downstream parses it, that is where the damage happens. The stronger version reads the first bytes:

```ts
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

function looksLikePng(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).equals(PNG);
}
```

For an image that a browser displays, an extension check plus a serving path that never executes files is usually enough.
For a document that a library parses, add a content check and parse it in a place that cannot run anything.

## Where the files live

```text
development   a folder beside the source, ignored by git
one server    a volume the container mounts
production    object storage, with the API handing out URLs
```

The middle row is where a single-container deployment stops scaling: two containers with their own disks have two sets of
files, and a load balancer sends the request for an image to whichever one it chooses. The last row is the answer, and the
change is small: the endpoint writes to a bucket rather than a disk and returns a URL instead of a filename.

## Check yourself

Add an endpoint that serves a file from a folder, then request `/../package.json` and read what happens. Then upload a file
whose name is `../../escape.png` and confirm what the server stored, and finally raise the size limit to something absurd and
explain why the limit is not the same decision as the disk size.
