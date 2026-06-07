# agents.yaml CLI Guidance

This package provides the `agents` CLI for maintaining an `agents.yaml` file.

`agents.yaml` is a curated table of contents for active agent-readable documentation. It does not define a new instruction language, replace `AGENTS.md`, or automatically load every dependency document.

The file format is intentionally small:

```yaml
version: 1

documents:
  - path: ./node_modules/example-package/AGENTS.md
```

Agents should treat only the paths listed in `documents` as active supplemental guidance for the project.

The CLI can help discover package and local `AGENTS.md` files, add selected paths to `agents.yaml`, remove paths, initialize the root breadcrumb, and validate that referenced files still exist.

Discovery only considers direct dependencies under a project's `node_modules`; nested dependency `AGENTS.md` files are not automatically activated.
