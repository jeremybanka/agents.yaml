# agents.yaml

A lightweight CLI for discovering and curating agent-readable documentation.

`agents.yaml` is a curated table of contents. It points agents at dependency-specific and supplemental `AGENTS.md` documents without copying, flattening, or auto-loading every file in a dependency tree.

## Install

```sh
mise install
pnpm install
pnpm run build
```

## Usage

```sh
agents init
agents discover
agents add ./node_modules/react/AGENTS.md
agents validate
```

Run `agents` with no command for the interactive flow.

## File Format

```yaml
version: 1

documents:
  - path: ./node_modules/react/AGENTS.md
    description: React is a JavaScript library for building user interfaces.
```

Descriptions are optional breadcrumbs, usually copied from the package's `package.json`, that make lesser-known package guidance easier to recognize at a glance. Only `path` activates a supplemental guidance document.

Add this breadcrumb to your root `AGENTS.md`:

```md
For dependency-specific and supplemental guidance, consult `./agents.yaml`.

Only the documents listed there should be considered active external guidance for this project.
```
