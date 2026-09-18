# agents.yaml

## 0.3.0

### Minor Changes

- ab946b5: Reject unknown or misplaced options that were previously ignored, fail on unknown commands, and return exit status 1 when `validate --json` finds an invalid index. Scripts relying on the previous permissive parsing or successful exit status must be updated.

  Add generated command help and shell completion for Bash, Zsh, Fish, Nushell, and Carapace. Completion suggests filesystem paths for `add` and listed document paths for `remove`, including after the first path. Support explicit boolean values, use the last repeated switch value, treat paths after `--` literally, and report the installed package version.

  Refresh runtime dependencies and update the declared toolchain requirements to Node.js 26.9.0 and pnpm 12.4.2.

## 0.2.3

### Patch Changes

- fbd062e: Update Clack dependencies and use the specific cancellation symbol type for
  interactive document selection.

## 0.2.2

### Patch Changes

- 11a2cad: Speed up discovery by skipping dot-prefixed directories by default and add a benchmark harness for measuring discovery performance.

## 0.2.1

### Patch Changes

- aaf54f5: Show a visible cursor marker for the active document in the interactive enable picker.

## 0.2.0

### Minor Changes

- c7b4dfa: Add optional document descriptions to `agents.yaml` entries and populate them from package metadata during discovery and add flows.

### Patch Changes

- c7b4dfa: Shorten the generated root breadcrumb to an imperative prompt to consult `./agents.yaml` when working with outside dependencies.
