# agents.yaml CLI Guidance

This package provides the `agents` CLI for maintaining an `agents.yaml` file.

`agents.yaml` is a curated table of contents for promoted agent-readable documentation. It does not define a new instruction language, replace `AGENTS.md`, or automatically load every dependency document.

The file format is intentionally small:

```yaml
version: 1

documents:
  - path: ./node_modules/example-package/AGENTS.md
    description: Useful package context from example-package's package.json.
```

Agents should treat paths listed in `documents` as promoted supplemental guidance for the project. Descriptions are human-readable breadcrumbs that explain why the package guidance may be relevant; they are not additional instructions.

The CLI can help discover package and local `AGENTS.md` files, add selected paths to `agents.yaml`, remove paths, initialize the root breadcrumb, and validate that referenced files still exist.

Discovery only considers direct dependencies under a project's `node_modules`; nested dependency `AGENTS.md` files are not automatically activated.

Discovery skips dot-prefixed directories by default. Use `agents discover --include-dot-directories` when hidden project directories should be scanned too.
