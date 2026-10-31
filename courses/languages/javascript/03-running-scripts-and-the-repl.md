---
title: Running scripts and the REPL
summary: The commands worth knowing, where output goes, and how a script reports whether it worked.
chapter: Getting started
minutes: 12
status: draft
---

## Four ways to run code

```bash
node report.js                 # a file
node --watch report.js         # restart on change
node -e "console.log(1 + 1)"   # one expression
node -p "process.version"      # evaluate and print the result
node                           # the REPL
```

`--watch` restarts the process when a file it loaded changes, which is what makes the edit and run loop
bearable. `-e` and `-p` are for checking a single expression without creating a file, and the difference
between them is that `-p` prints the value where `-e` prints only what you ask it to.

## The REPL

```text
$ node
Welcome to Node.js v22.21.0.
Type ".help" for more information.
> const records = [{ key: 'a', value: 1 }]
undefined
> records.map((record) => record.value)
[ 1 ]
> _
[ 1 ]
> .exit
```

Every expression prints its value, `_` holds the last one, and `await` works at the top level. `.help` lists
the dot commands, and `.editor` starts a multi line input mode when you want to paste a function. The REPL is
the fastest way to find out what a method does to a value you already have.

## Standard output and standard error

```js
console.log('records loaded');      // stdout
console.error('cannot read file');  // stderr
```

Two streams, and the difference matters in a shell. `node report.js > out.txt` captures the first and lets the
second reach the terminal, so a message the user needs to see does not end up in a file of data. Progress and
errors go to `console.error`, results go to `console.log`.

```bash
node report.js > report.txt 2> errors.txt
```

## Exit codes

```js
if (!records.length) {
  console.error('no records found');
  process.exitCode = 1;
}
```

Setting `process.exitCode` lets the current work finish and reports the failure at the end, which is what a
script that has cleanup to do wants. `process.exit(1)` stops immediately and can cut a write in half, so it is
for the case where continuing would be wrong.

```bash
node report.js; echo $?
```

```text
1
```

A shell, a build step and a test runner all read that number, which is why a script that fails should not
happily exit with zero.

## Arguments and input

```js
const [input, ...flags] = process.argv.slice(2);

console.log(input, flags);
```

```bash
node report.js data.csv --verbose
```

```text
data.csv [ '--verbose' ]
```

`process.argv` starts with the executable and the script path, so the arguments a person typed begin at index
two. Anything more elaborate than a couple of positional arguments wants a parser, and the standard library has
one in `node:util`:

```js
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  options: { verbose: { type: 'boolean', short: 'v' } },
  allowPositionals: true,
});
```

## Reading input line by line

```js
import { createInterface } from 'node:readline/promises';

const lines = createInterface({ input: process.stdin });
let count = 0;

for await (const line of lines) {
  if (line.trim()) count += 1;
}

console.log(`${count} lines`);
```

Streams are a Node subject rather than a language one, and this is the shape a script needs when it reads a
pipe. The `for await` loop is the language feature doing the work, and this course covers it in the generators
chapter.

## Debugging without a debugger

```bash
node --inspect report.js
node --inspect-brk report.js
```

`--inspect` starts a debugging port and `--inspect-brk` stops on the first line, which is what lets a browser or
an editor attach and set breakpoints in the real source rather than in a copy. A `debugger;` statement in the
code does nothing unless a debugger is attached, so it can stay in a file.

## Check yourself

Run a script with `-p`, with `--watch`, and through a pipe. Set a failing exit code and check it with `echo $?`.
Then start the REPL, paste a function with `.editor`, and use `_` to build on the previous result.
