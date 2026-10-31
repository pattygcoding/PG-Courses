---
title: Typed arrays and binary data
summary: Bytes in buffers, the views over them, and the encoding that turns text into both.
chapter: Arrays and data
minutes: 13
status: draft
---

## A buffer holds bytes

```js
const buffer = new ArrayBuffer(8);

console.log(buffer.byteLength);        // 8
```

An `ArrayBuffer` is a fixed length block of bytes with no way to read or write it directly. A view over it decides how
those bytes are interpreted, and there are two kinds:

```js
const bytes = new Uint8Array(buffer);
const words = new Uint32Array(buffer);

bytes[0] = 255;

console.log(bytes.length, words.length);      // 8 2
console.log(words[0]);                          // 255 on a little endian machine
```

Both views share the same eight bytes, so writing through one is visible through the other. `Uint8Array` gives eight
one byte elements, `Uint32Array` gives two four byte elements, and the element count follows from the buffer size.

The typed array constructors are `Int8Array`, `Uint8Array`, `Uint8ClampedArray`, `Int16Array`, `Uint16Array`,
`Int32Array`, `Uint32Array`, `Float32Array`, `Float64Array` and `BigInt64Array`, which is the set a binary format
needs.

## A typed array is not an array

```js
const bytes = new Uint8Array(4);

console.log(Array.isArray(bytes));        // false
console.log(bytes.length);                 // 4
console.log(typeof bytes.push);             // 'undefined'
```

A typed array has a fixed length and no `push` or `pop`, so it is the wrong container for a collection that grows. It
does have `map`, `filter`, `slice`, `sort`, `at`, `includes` and iteration, and it converts to a real array with
`Array.from` or a spread.

```js
const values = Uint8Array.from([1, 2, 300]);

console.log(values);        // Uint8Array(3) [ 1, 2, 44 ]
```

The value that did not fit was truncated, silently, because a typed array keeps the low bits of a number rather than
refusing it. That is the behaviour a binary format wants and a surprise the first time it happens.

## Reading mixed types in a defined order

```js
const view = new DataView(new ArrayBuffer(8));

view.setUint32(0, 0x12345678);
view.setFloat32(4, 1.5, true);

console.log(view.getUint32(0));              // depends on the default order
console.log(view.getFloat32(4, true));        // 1.5
```

A `DataView` reads and writes at any offset with any type and takes the endianness as an argument, which a typed array
does not: a typed array uses the platform order, and that differs between architectures. Reading a field at a byte
offset in a file or a network packet means `DataView`, because the format says which order the bytes are in and the
platform might disagree.

```js
const little = new DataView(new ArrayBuffer(4));
little.setUint32(0, 0x01020304, true);

console.log(little.getUint8(0));        // 4, the lowest byte first
```

## Text and bytes

```js
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytes = encoder.encode('héllo');

console.log(bytes.length);                 // 6, one character is two bytes
console.log(decoder.decode(bytes));         // 'héllo'
```

`TextEncoder` always produces UTF-8, and `TextDecoder` reads it. A character above the ASCII range takes more than
one byte, which is why the length of the encoded text is not the length of the string, and why a byte count is what a
protocol or a storage limit cares about.

`TextDecoder` takes a label for other encodings, which is what reading a legacy file needs:

```js
const latin1 = new TextDecoder('windows-1252');
```

## Hex and base64

```js
const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

console.log(Buffer.from(bytes).toString('hex'));           // 'deadbeef'
console.log(Buffer.from('héllo').toString('base64'));        // 'aMOpbGxv'
console.log(new Uint8Array(Buffer.from('deadbeef', 'hex')));   // Uint8Array(4) [ 222, 173, 190, 239 ]
```

`Buffer` is the Node type and it is a `Uint8Array` with helpers added, which is why the conversions above work. The
conversion methods on `Uint8Array` itself are recent and not in every runtime, so a library that has to run in both
Node and a browser does the conversion by hand or depends on a small helper.

Base64 is what a binary value becomes when it has to travel inside text, such as a JSON field or a header. It is a
third larger than the bytes, and it is not encryption, which is the mistake worth naming.

## When a typed array earns its place

| Task | Container |
| --- | --- |
| Reading a binary file format | `DataView` over the buffer |
| Sending or receiving bytes | `Uint8Array` |
| Numeric work over a large array | `Float64Array` |
| Text to bytes and back | `TextEncoder` and `TextDecoder` |
| A growing collection of numbers | a plain array |

A `Float64Array` of a million values is about eight megabytes in one allocation, where a JavaScript array of a million
numbers is a boxed structure many times larger, and a loop over it is faster because the engine knows the element type.
That is the case to reach for a typed array in code that is not about binary data at all: a large numeric array in a
hot loop.

## Check yourself

Write four bytes into a `Uint8Array`, read them back as a `Uint32Array`, and print both. Then encode a string with a
non-ASCII character, print the byte length and the string length, and convert the bytes to hex.
