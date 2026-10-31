---
title: The import system
summary: sys.path, the module cache, and why an import sometimes finds the wrong file.
chapter: Modules, tooling and packaging
minutes: 12
status: draft
---

## What an import does

An `import` looks in `sys.modules` first and only searches the filesystem when the name is missing. The
search path is `sys.path`, and its first entry is the directory of the script that started the
interpreter, or the current directory for `-c` and the REPL.

```pycon
>>> import sys
>>> sys.path[0]
''
```

An empty first entry means the current directory. That is why a file named `json.py` sitting next to
your script breaks every `import json` in the program, and it is worth recognising on sight, because
the error names a standard module that obviously exists.

## The module cache

```pycon
>>> import sys
>>> "json" in sys.modules
False
>>> import json
>>> "json" in sys.modules
True
```

The second import is a dictionary lookup, which is why imports are cheap after the first one and why a
module's top level code runs once per process. `importlib.reload` exists for interactive work and is a
bad idea in a running program, because other modules still hold references to the old objects.

## Which copy is loaded

```pycon
>>> import json
>>> json.__file__
'/usr/lib/python3.12/json/__init__.py'
>>> json.__name__
'json'
```

`__file__` answers the question you ask most often when two versions of a package are installed. Running
`python -c "import shop; print(shop.__file__)"` is the fastest way to find out which one an environment
resolved, and it works the same inside a container.

## Choosing an import form

```python
import shop.pricing  # bind the module
from shop.pricing import total  # bind the name
from shop.pricing import total as price  # bind it under a local name
```

`import module` keeps the namespace visible, so a later `pricing.total(...)` says where the function
came from. `from module import name` is shorter and loses that context, which is fine once and awkward
when five modules export similar names.

## Check yourself

Print `sys.path` from a script and from a REPL and compare the first entry. Then create a file that
shadows a standard library module and record the error, so you recognise it next time.
