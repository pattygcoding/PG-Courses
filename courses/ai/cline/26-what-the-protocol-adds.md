---
title: What the protocol adds
summary: A standard way to hand an agent tools it was not shipped with.
chapter: Tools and judgement
minutes: 12
status: draft
---

## The problem it solves

An agent ships with four tools. Anything else your project needs, such as searching the catalogue or
reading a ticket, has to be reached through a shell command, which means the model has to remember the
exact syntax and parse the output.

A protocol for tools replaces that with a description. The server says what it can do and what arguments
each operation takes, and the agent calls it in a shape it already understands.

## The exchange

Everything travels as JSON messages over a pipe. A client asks what the server can do, and the server
answers with a list. Below are two real replies from a small server written for this course, formatted
across lines so they can be read:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "tools": {} },
    "serverInfo": { "name": "northside-library", "version": "0.1.0" }
  }
}
```

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "search_catalogue",
        "description": "Find books whose title contains the query, ignoring case.",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string", "description": "Text to look for in a title." }
          },
          "required": ["query"],
          "additionalProperties": false
        }
      },
      {
        "name": "available_copies",
        "description": "How many copies of one book are free right now.",
        "inputSchema": {
          "type": "object",
          "properties": { "bookId": { "type": "integer", "description": "The book id." } },
          "required": ["bookId"],
          "additionalProperties": false
        }
      }
    ]
  }
}
```

Two replies, each an answer to a question the client asked. The first is the handshake, which establishes
the protocol version and the server's name. The second is the tool list, which is the catalogue of what
the agent can now do.

## What the descriptions are for

The `description` strings are read by the model rather than by a person. That makes them part of the
prompt, and the rules that apply to any instruction apply here: say what the tool does, say what the
argument means, and say what the argument does not accept.

A tool with a vague description gets called with the wrong arguments, and the fix is a better sentence
rather than a better schema.

## What changes for you

Two things. The tool list grows without the prompt growing, because the agent asks for the list rather
than carrying it. And the tool runs wherever the server runs, which may be another process on the same
machine or something on the network, so the boundary questions from the terminal chapter apply to
whatever the server can reach.

## Check yourself

Write down one thing your project does with a shell command whose syntax the agent has to remember.
Describe it as a tool, with a description and an argument schema, in the same shape as the reply above.
