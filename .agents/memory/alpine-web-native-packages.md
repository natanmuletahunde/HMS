---
name: Alpine web native packages
description: Non-obvious pnpm and native optional-dependency constraints for Node Alpine production images
---

Node 20 Alpine container builds must pin a Node-20-compatible pnpm release. Do not let Corepack select the newest major implicitly.

The Next.js/Tailwind build also needs the x64-musl optional packages for Tailwind Oxide and Lightning CSS. Workspace overrides that remove those packages make local glibc builds pass while Alpine builds fail with missing native bindings.

**Why:** The container build passed dependency installation but failed successively in `next/font`/Tailwind because each musl binary had been excluded from the lockfile. Pinning pnpm and retaining the musl optionals made both production images build.

**How to apply:** Whenever Node Alpine, pnpm, Tailwind, Lightning CSS, or native-package overrides change, build the web image—not only the host Next.js build—and verify the musl packages remain represented in the lockfile.