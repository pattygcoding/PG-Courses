---
title: Installing and signing in
summary: The extension, the account, and the four settings that change what the tool does.
chapter: How the tool sees your code
minutes: 11
status: draft
---

## The extension and the account

Copilot is an extension, so the first step is installing it for your editor and signing in with the
account that carries the subscription. Two states matter after that. One is whether completions are on
for the language you are editing, and the other is whether the code you are writing is sent at all.
For a repository whose code cannot leave the building, the second question is answered before the
first one is useful.

Check both before you evaluate anything. A session where the extension is installed but disabled for
your file type looks exactly like a session where the model had nothing useful to say.

## The settings worth knowing

Four settings change the experience more than the rest:

```text
github.copilot.enable                     which languages get inline suggestions
github.copilot.inlineSuggest.enable       the grey text itself
github.copilot.chat.localeOverride        the language chat answers in
github.copilot.editor.enableAutoCompletions
```

The first one is a map from language to a boolean. Turning completions off for a language you are
learning is a reasonable choice while you are learning it, because accepting a suggestion before you
could have written it yourself removes the exercise.

## Working in a repository you do not own

The setting that decides whether your code may be sent lives with the account and the organisation,
not in the editor. If the answer is no, the rest of this course still applies to code you are allowed
to send, and the chapters on chat and tests are where the value is anyway.

## Keeping the suggestions honest

Two habits are worth forming here. Keep the repository under version control, so accepting a
suggestion is one `git diff` away from being undone. And read the diff before you commit, which in a
repository with tests means running them first. The tool has no idea what passing means in your
project.

## Check yourself

Install the extension, sign in, and open a file in a language you use daily. Confirm that a suggestion
appears. Then turn completions off with `github.copilot.enable` for that language, reload the editor,
and confirm it stops. Switch it back on. Knowing where that switch is matters more than the default
you leave it at.
