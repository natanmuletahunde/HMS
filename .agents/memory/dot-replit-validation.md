---
name: Validated .replit updates
description: Workspace configuration changes must go through the validated replacement flow rather than direct edits
---

Direct edits to `.replit` are rejected by the workspace tooling. For a needed configuration change, write the complete intended TOML to a temporary workspace file and submit it through the platform's validated `.replit` replacement callback.

**Why:** The workspace enforces schema validation for run commands, deployment settings, modules, and service configuration; bypassing it can leave the project in an invalid or unintended state.

**How to apply:** Preserve unrelated TOML entries, validate the complete replacement, and remove the temporary file after the replacement succeeds.