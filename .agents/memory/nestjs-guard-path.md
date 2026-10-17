---
name: NestJS guard import path
description: The correct relative import path for JwtAuthGuard from any module controller
---

## Rule
`JwtAuthGuard` lives at `src/common/guards/jwt-auth.guard.ts`.

All module controllers are at `src/modules/<name>/<name>.controller.ts`.

The correct import is:
```ts
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
```

**Why:** Previous controllers incorrectly used `'../auth/jwt-auth.guard'` which worked for modules next to the auth folder but fails for all others. The canonical path is `../../common/guards/jwt-auth.guard`.

**How to apply:** Any time a new NestJS module controller needs JWT protection, use `../../common/guards/jwt-auth.guard` — never `../auth/jwt-auth.guard`.
