---
title: What not to leave in context
summary: Secrets, generated files and unrelated tabs all reach the model.
chapter: How the tool sees your code
minutes: 11
status: draft
---

## Files that should not be open

The context that reaches the model comes from your editor, so a file that is open is a file that can
be sent. An `.env` holding a database password, a key file, a dump of customer rows pasted into a
scratch buffer: these belong to one problem, and they are solved the same way, by not having them open
while you work.

Version control already knows most of this. A path in `.gitignore` is a strong hint about what should
not be lying around in an editor either.

## Machine-written files

Generated output is the other category. A lock file, a build directory, a migration generated from a
schema, a minified bundle. These are large, they are not the code you are reasoning about, and they
push the useful part of the window out of view. Closing them improves the suggestion and reduces what
leaves the machine at the same time.

The same argument applies to a lock file you have open to read one version number out of. Search for
the line instead, then close the file.

## The settings that narrow it

Two mechanisms exist for this and both are worth knowing about even if you never change them. The
first is the language switch from the second lesson, which turns inline suggestions off for a file
type. The second is a repository-level ignore file, named for the tool, listed in the repository root,
which keeps whole paths from being read.

Names and locations change between releases, so check the documentation for your editor version. What
matters is that the control is per repository. A repository that holds customer data should say so in
a file everyone can read, rather than leaving it to each developer to remember.

## A rule that survives an upgrade

There is a test that does not depend on any of the settings above. If a file would be embarrassing in
a pull request, it should not be open while the tool runs. That covers a credential, a generated
bundle and the scratch buffer from last week's incident, and it keeps working after the next release
renames the setting that was supposed to handle it.

## Check yourself

List the files open in your editor and mark the ones that are generated, ignored by version control,
or hold a credential. Close them and open the file you were working on. Then add one line to your
repository that tells the next person which paths must stay closed while the tool is running.
