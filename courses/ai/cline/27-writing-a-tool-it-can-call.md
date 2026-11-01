---
title: Writing a tool it can call
summary: A server in forty lines, and the schema that makes it callable.
chapter: Tools and judgement
minutes: 13
status: draft
---

## The smallest useful server

A tool server needs three things: a handshake, a list and a way to run a call. In Node, with no
dependencies, that is one file reading JSON on stdin and writing JSON on stdout.

The data comes first, then the tool list, which is where the schema lives:

```js
const tools = [
  {
    name: 'search_catalogue',
    description: 'Find books whose title contains the query, ignoring case.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Text to look for in a title.' } },
      required: ['query'],
      additionalProperties: false,
    },
  },
]
```

Four fields carry the weight. `name` is the identifier the model uses. `description` is what the model
reads when deciding whether to call it. `inputSchema` is what the arguments are validated against.
`additionalProperties: false` turns a typo in an argument name into an error rather than a silent
default.

## Running a call

The handler is an ordinary function, and it is where the real work happens:

```js
function callTool(name, args) {
  if (name === 'search_catalogue') {
    const query = String(args.query ?? '').toLowerCase()
    const found = books.filter((book) => book.title.toLowerCase().includes(query))
    return found.length
      ? found.map((book) => `${book.id}: ${book.title}`).join('\n')
      : 'No book matches that query.'
  }
  throw new Error(`unknown tool: ${name}`)
}
```

Two details matter more than the logic. The return value is text, because that is what the protocol
carries back to the model, so the output is a prompt rather than a data structure. And the function
throws on an unknown name rather than returning an empty string, because an empty result reads like a
successful search that found nothing.

## The transport

```js
let buffered = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  buffered += chunk
  let index = buffered.indexOf('\n')
  while (index !== -1) {
    const line = buffered.slice(0, index).trim()
    buffered = buffered.slice(index + 1)
    if (line.length > 0) {
      const reply = handle(JSON.parse(line))
      if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`)
    }
    index = buffered.indexOf('\n')
  }
})
```

The buffer is the part worth understanding. A pipe delivers bytes rather than lines, so one message can
arrive in two chunks and three messages can arrive in one. Reading a line at a time from a buffer is what
makes the framing correct, and getting it wrong produces failures that appear only under load.

## Registering it

The agent's configuration takes a command to start the server and the transport to speak. Once it is
registered, the tools from the list appear beside the built-in ones, and the model chooses between them
the way it chooses anything else.

## Check yourself

Write a server with one tool that answers a question about your own data, register it with your agent, and
ask a question that needs it. Then remove a field from the schema and see what the model does when the
call fails validation.
