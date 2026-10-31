---
title: Packaging a project with pyproject.toml
summary: One file declaring the build, the dependencies and the command the package installs.
chapter: Modules, tooling and packaging
minutes: 13
status: draft
---

## The single file that replaced three

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "shop"
version = "0.1.0"
description = "Pricing and inventory helpers"
readme = "README.md"
requires-python = ">=3.11"
dependencies = ["httpx>=0.27"]

[project.optional-dependencies]
dev = ["pytest>=8", "ruff>=0.6", "mypy>=1.11"]

[project.scripts]
shop = "shop.cli:main"
```

`pyproject.toml` replaces `setup.py`, `setup.cfg` and a hand written requirements file for most
projects. The build system says what builds the package, `project` says what it is, `optional-dependencies`
groups extras so `pip install -e ".[dev]"` brings in the tools, and `project.scripts` creates a command
that runs a function once the package is installed.

## Bounds: lower, and sometimes upper

```toml
dependencies = [
  "httpx>=0.27,<1",
]
```

A lower bound records what you tested against. An upper bound predicts what will break, and it is worth
adding only where a major release genuinely would. An application should install from a lock file so the
exact versions are reproduced. A library should keep ranges loose so it can share a dependency tree with
the projects that install it.

## Build, install, import

```bash
python -m build
python -m pip install dist/shop-0.1.0-py3-none-any.whl
python -c "import shop; print(shop.__file__)"
```

Installing the wheel into a fresh environment and importing it from another directory is the only
reliable check that every file is inside the package. Running from the source tree, or installing with
`-e`, hides a missing file until someone else installs it.

## Keep generated files out of git

```gitignore
dist/
build/
*.egg-info/
__pycache__/
.venv/
```

Anything built belongs in `.gitignore`. Anything that must ship belongs under the package directory, and
test data is the usual gap: it works in the source tree and disappears from the wheel.

## Check yourself

Add a console command, build a wheel, install it into a clean virtual environment, and run the command by
name. Then uninstall and confirm the command is gone and that no import from the source tree was being
used.
