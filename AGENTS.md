# Maintainer Instructions

Consult `./agents.yaml` when working with outside dependencies.

The publishable CLI package lives in `./packages/agents.yaml`.

Keep root-level files focused on repository maintenance. Package behavior, package documentation, and shipped agent guidance belong under `./packages/agents.yaml`.

## Changesets

Add or update a changeset whenever a change affects the functionality of a published package. Changesets should consolidate the consumer-visible differences between the current ref and the last release tag for that package.

Update existing changesets to describe the finished consumer-visible behavior as unshipped features evolve. A shipped feature is expected to work; defects fixed during its development are immaterial to consumers and should not be mentioned in changesets.

For packages below version 1.0.0:

- use a patch bump for non-breaking changes, including features and fixes
- use a minor bump for breaking changes

## Markdown

Do not manually wrap Markdown prose at a fixed line width. Keep each paragraph and each list item's prose on a single source line. Preserve structural line breaks for headings, lists, tables, and code blocks.

## Vite Plus Upgrades

Use the target release's official `vp migrate --no-interactive` for Vite Plus upgrades. Preserve the old lockfile until migration runs, and let the migrator own toolchain version alignment and supported source/configuration changes. Review its manual migration findings and run the repository's formatter and checks; do not maintain a separate dependency synchronization implementation.
