---
name: compression CJS fix
description: The compression npm package must be required via require(), not imported as ES module default
---

## Rule
In NestJS main.ts, do NOT use:
```ts
import compression from 'compression';
```

DO use:
```ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const compression = require('compression');
```

**Why:** `compression` is a CommonJS module. TypeScript compiles the default import to `compression_1.default` which is `undefined` at runtime, causing `TypeError: (0, compression_1.default) is not a function`. The `require()` form gets the callable function directly.

**How to apply:** Any time compression middleware is added to a NestJS app.
