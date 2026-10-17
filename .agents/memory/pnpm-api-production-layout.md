---
name: pnpm API production layout
description: Reliable production dependency packaging for the NestJS API in this non-injected pnpm workspace
---

For this non-injected pnpm workspace, production packaging must preserve the API package's dependency links and the compiled workspace database package. Keep production filtering lockfile-driven, offline after installation, and scoped to the API dependency graph.

**Why:** pnpm stores package content and package links separately, so a production transform can leave content present while breaking runtime resolution. Image build success alone does not prove the linked runtime graph works.

**How to apply:** Preserve the linked monorepo runtime layout and gate releases with a container startup smoke test as the non-root runtime user.