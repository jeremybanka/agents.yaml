---
"agents.yaml": minor
---

Reject unknown or misplaced options that were previously ignored, fail on unknown commands, and return exit status 1 when `validate --json` finds an invalid index. Scripts relying on the previous permissive parsing or successful exit status must be updated.

Add generated command help and shell completion for Bash, Zsh, Fish, Nushell, and Carapace. Completion suggests filesystem paths for `add` and listed document paths for `remove`, including after the first path. Support explicit boolean values, use the last repeated switch value, treat paths after `--` literally, and report the installed package version.

Refresh runtime dependencies and update the declared toolchain requirements to Node.js 26.9.0 and pnpm 12.4.2.
