---
name: NestJS + lib/db CJS runtime resolution
description: lib/db must be compiled to CommonJS for NestJS to require it at runtime; tsconfig paths alias must point to compiled declarations not source
---

## Rule
When a NestJS (CommonJS) app imports a shared workspace package (`@workspace/db`), that package must expose compiled CJS JavaScript — TypeScript source files cannot be required at runtime.

## Steps that work
1. Add `lib/db/tsconfig.cjs.json` with `"module": "commonjs"`, `"rootDir": "./src"`, `"outDir": "./dist"`, `"esModuleInterop": true` — do NOT extend from `tsconfig.base.json` (which uses `"module": "esnext"`).
2. Run `tsc -p lib/db/tsconfig.cjs.json` to produce `lib/db/dist/index.js` + declarations.
3. Update `lib/db/package.json`: add `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, and dual `exports` with `"require"` pointing to dist and `"import"` pointing to src. Remove `"type": "module"` if present (or ensure dist CJS files are recognized as CJS by Node).
4. In `artifacts/api-server/tsconfig.json`, set paths alias to `"@workspace/db": ["../../lib/db/dist/index"]` (the compiled declarations, NOT `../../lib/db/src/index.ts`).

**Why:** If the api-server tsconfig paths alias points to the TypeScript source file `../../lib/db/src/index.ts`, TypeScript includes that source in its compilation and auto-expands `rootDir` to the workspace root. This causes compiled output to land at `dist/artifacts/api-server/src/main.js` instead of `dist/main.js`, breaking `nest start` which always runs `node dist/main`.

**Why path alias must use dist:** Using the compiled `.d.ts` path means TypeScript uses declarations for type-checking only — no source inclusion, no rootDir expansion. At runtime, Node.js resolves `@workspace/db` through pnpm symlink → `lib/db/package.json#main` → `dist/index.js`.

## How to apply
Any time a new NestJS artifact is added that imports `@workspace/db` (or any other shared TS-source-only workspace package), apply these four steps before attempting `nest start`.
