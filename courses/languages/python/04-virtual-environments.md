---
title: Virtual environments and project layout
summary: Give every project its own interpreter and dependencies, and lay the folder out so the next person can find things.
chapter: Getting started
minutes: 12
status: draft
---

## One environment per project

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

On Windows, activate with `.venv\Scripts\activate`. The `.venv` folder holds an interpreter link and
its own `site-packages`, so installing a package there cannot affect another project. Add `.venv/`
to `.gitignore` and never commit it.

## Name your dependencies

```bash
python -m pip install requests
python -m pip freeze > requirements.txt
```

`pip freeze` records exact versions, which is what you want for reproducing a deployment. For a
library you intend others to install, declare loose ranges instead and let `pip freeze` produce a
separate lock file for your own development and CI.

## A layout that scales

```text
project/
  .venv/
  pyproject.toml
  README.md
  src/package_name/
    __init__.py
    cli.py
  tests/
    test_cli.py
```

The `src` directory keeps the importable package separate from the project root, so `import
package_name` only works once the package is installed. That catches packaging mistakes early,
before a build fails on someone else's machine.

## Keep secrets and junk out of git

```gitignore
.venv/
__pycache__/
*.pyc
.env
```

## Check yourself

Create a virtual environment, install a package into it, then deactivate and confirm the package is
not importable from the system interpreter.
