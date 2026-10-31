---
title: Images and fonts
summary: Two components that fix layout shift and font loading, and neither needs a third-party package.
chapter: The app around the pages
minutes: 12
status: draft
---

## The two problems

An `<img>` shipped without dimensions reserves no space, so the page shifts when the image arrives. A font loaded from a
third-party host adds a connection and a flash of unstyled text. Both have one-line fixes in Next.js, and both fixes are worth
understanding rather than copying.

## next/image

```tsx
import Image from "next/image";

<Image src="/covers/dune.jpg" alt="The cover of Dune" width={320} height={480} />
```

`width` and `height` are required for an image of known size, and they are what lets the browser reserve the space before the
file arrives. That alone removes the shift.

The component also:

- serves the image in a modern format when the browser supports one;
- resizes it per device, so a phone does not download a desktop-size file;
- lazy-loads everything below the fold, by default;
- takes a `sizes` value so the browser can pick the right candidate from the `srcset`.

```tsx
<Image
  src="/covers/dune.jpg"
  alt="The cover of Dune"
  width={320}
  height={480}
  sizes="(max-width: 640px) 100vw, 320px"
  priority
/>
```

`priority` is the one prop to spend deliberately. It tells the framework this image is above the fold, so it is preloaded
rather than lazy-loaded, and it should be on one image per page at most. Marking three images as priority is the same as
marking none and slower.

## A remote image

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "covers.example.com", pathname: "/**" }],
  },
};
```

A remote host has to be named in the config, because the optimiser itself would otherwise be an open proxy that any page
could aim at any URL. The older `images.domains` option is deprecated in favour of `remotePatterns`, which can constrain the
protocol, the host and the path.

A local file imported rather than referenced is measured for you, so `width` and `height` can be left out:

```tsx
import cover from "@/public/covers/dune.jpg";

<Image src={cover} alt="The cover of Dune" placeholder="blur" />
```

## next/font

The scaffold writes the font setup for the application:

```tsx
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

Running `next build` with that layout downloads the font at build time and self-hosts it, which is visible in the output:

```text
.next/static/media/07935285219a259d-s.1qq4vpdcun5oj.woff2
.next/static/media/07a39a8a4660cc7c-s.p.0r6juujl39pe6.woff2
```

Four things follow from that, and they are the reason to use it rather than a `<link>` to a font CDN:

| What | Why it matters |
| --- | --- |
| no request to the font host at runtime | one less connection, and no third party in the path |
| no layout shift | the fallback metrics are adjusted to match the font |
| a CSS variable per font | the font is available in the stylesheet and in Tailwind |
| the build needs the network once | a build on a machine with no internet fails here |

A font of your own is `next/font/local` with a path instead of a family name:

```tsx
import localFont from "next/font/local";

const sans = localFont({ src: "./fonts/Northside.woff2", variable: "--font-sans" });
```

## Where they belong

Both components are for the layout and the pages. Two rules keep an application out of trouble:

- **Fonts in the root layout.** Loading a font in a page means the font changes when you navigate.
- **Images sized.** An `alt` on every one of them, `width` and `height` on every one with a fixed size, and `sizes` on
  anything that fills a column.

Neither is a framework feature so much as a habit the framework makes easy, and both are measured: the images page of the
docs and the Core Web Vitals lesson later cover the numbers.

## Check yourself

Add a cover image to the book data, render it on the catalogue with `sizes` and on the book page without, and compare the
`srcset` the browser receives in each case. Then check the network panel to confirm the font arrives from your own domain
rather than from Google.
