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
agents discover --include-dot-directories
agents add ./node_modules/react/AGENTS.md
agents validate
```

Run `agents` with no command for the interactive flow.

Discovery skips dot-prefixed directories by default so local caches and tool
state do not dominate scan time. Use `--include-dot-directories` when you need
to search those directories too.

## Benchmark

```sh
pnpm --filter agents.yaml bench
```

The benchmark creates a temporary discovery fixture, compares default discovery
against `--include-dot-directories`, prints median/min/max timings, and removes
the fixture when it exits. Fixture size can be tuned with
`AGENTS_BENCH_HIDDEN_DIRS`, `AGENTS_BENCH_FILES_PER_HIDDEN_DIR`,
`AGENTS_BENCH_VISIBLE_PACKAGES`, `AGENTS_BENCH_ITERATIONS`, and
`AGENTS_BENCH_WARMUPS`.

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
Consult `./agents.yaml` when working with outside dependencies.
```
