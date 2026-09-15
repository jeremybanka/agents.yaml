# agents.yaml

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
