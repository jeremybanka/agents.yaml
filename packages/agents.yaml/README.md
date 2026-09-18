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
agents add ./react/AGENTS.md "./my package/AGENTS.md"
agents remove ./react/AGENTS.md "./my package/AGENTS.md"
agents validate
agents validate --json
agents --help
agents --version
```

Run `agents` with no command for the interactive flow.

`add` and `remove` accept one or more paths. Use `--` before paths that start
with a dash. Unknown commands and flags, flags used with the wrong command,
and missing required paths produce an error before the command runs.

Boolean switches accept `true`, `false`, `1`, and `0`, either with `=` or as
the next argument. Repeated switches use the last value. Validation exits
with status 1 for an invalid document index, including with `--json`.

Discovery skips dot-prefixed directories by default so local caches and tool
state do not dominate scan time. Use `--include-dot-directories` when you need
to search those directories too.

## Shell Completion

Generate a completion script with `agents completion <target>`, or install it
into your shell's configured completion directory:

```sh
agents completion install bash
agents completion install zsh
agents completion install fish
agents completion install nushell
agents completion install carapace
```

Choose the target you use, then open a new shell. Completion setup requires
the target shell's completion system to be enabled; setup errors explain any
missing requirements. Commands and flags complete automatically. `add`
completes filesystem paths, and `remove` suggests paths listed in `agents.yaml`,
including after the first path.

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
