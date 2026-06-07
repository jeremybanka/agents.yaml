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
agents add ./node_modules/react/AGENTS.md --reason "React component, hooks, and rendering guidance"
agents validate
```

Run `agents` with no command for the interactive flow.

## File Format

```yaml
version: 1

documents:
  - path: ./node_modules/react/AGENTS.md
    reason: React component, hooks, and rendering guidance
```

Add this breadcrumb to your root `AGENTS.md`:

```md
For dependency-specific and supplemental guidance, consult `./agents.yaml`.

Only the documents listed there should be considered active external guidance for this project.
```
