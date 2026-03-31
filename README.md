# envguard

[![CI](https://github.com/your-org/envguard/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/envguard/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@envguard/core.svg)](https://www.npmjs.com/package/@envguard/core)
[![npm downloads](https://img.shields.io/npm/dm/@envguard/core.svg)](https://www.npmjs.com/package/@envguard/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Zod-based environment variable validation for Node.js. Type-safe, runtime-validated, developer-friendly.

## Packages

| Package | Description |
| --- | --- |
| [`@envguard/core`](./packages/core) | Zod-based env validation library |
| [`@envguard/cli`](./packages/cli) | CLI tool for validating and managing env files |
| [`@envguard/audit`](./packages/audit) | Static analysis: audit process.env usage against schema |
| [`@envguard/nestjs`](./packages/nestjs) | NestJS dynamic module integration |

## Quick Start

### Core Library

```bash
npm install @envguard/core zod
```

```ts
import { guard } from '@envguard/core';
import { z } from 'zod';

const env = guard({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DB_URL: z.string().url(),
  DB_SSL: z.coerce.boolean().default(false),
  DB_CERT: z.string().optional(),
});

// Fully typed!
// env.PORT      → number
// env.NODE_ENV  → 'development' | 'staging' | 'production'
// env.DB_URL    → string
// env.DB_SSL    → boolean
// env.DB_CERT   → string | undefined
```

### CLI Tool

```bash
npm install -g @envguard/cli

# Validate env against a schema
env-guard check --path .env --schema ./env.schema.ts

# Diff .env vs .env.example
env-guard diff

# Print env with secrets masked
env-guard mask

# Fix missing keys from .env.example
env-guard fix
```

### Static Audit

```bash
npm install @envguard/audit
```

```ts
import { audit } from '@envguard/audit';

const result = await audit({
  dir: './src',
  schema: './env.schema.ts',
});

console.log(result.undeclared); // { key, file, line }[] — used but not in schema
console.log(result.unused);    // string[]               — in schema but never used
console.log(result.unsafe);    // { expression, file, line }[] — dynamic access
```

CLI:

```bash
# Audit process.env usage against schema
env-guard audit --dir ./src --schema ./env.schema.ts

# Auto-fix: add undeclared keys to schema
env-guard audit --dir ./src --schema ./env.schema.ts --fix

# JSON output for tooling
env-guard audit --dir ./src --schema ./env.schema.ts --json

# Monorepo: scan multiple directories
env-guard audit --dir ./apps/api ./apps/web --schema ./env.schema.ts
```

### NestJS Module

```bash
npm install @envguard/nestjs @envguard/core zod
```

```ts
import { Module } from '@nestjs/common';
import { EnvGuardModule } from '@envguard/nestjs';
import { z } from 'zod';

@Module({
  imports: [
    EnvGuardModule.forRoot({
      schema: {
        PORT: z.coerce.number().default(3000),
        DB_URL: z.string().url(),
      },
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from '@nestjs/common';
import { EnvGuardService } from '@envguard/nestjs';

@Injectable()
export class AppService {
  constructor(private readonly envGuard: EnvGuardService) {}

  getPort(): number {
    return this.envGuard.get('PORT');
  }
}
```

## Features

- **Zod schema validation** with full TypeScript inference
- **Type coercion** — `"true"` → `boolean`, `"3000"` → `number` via `z.coerce`
- **Cross-field validation** via `.superRefine()` (e.g., if `DB_SSL=true` then `DB_CERT` required)
- **`.env` file loading** via dotenv with configurable path
- **Masked logging** — auto-redact keys containing `SECRET`, `KEY`, `TOKEN`, `PASSWORD`, `PASS`
- **Freeze** — `Object.freeze` the result so env can't be mutated
- **Watch mode** — `fs.watch` on `.env`, re-validate on change, emit events
- **`.env.example` sync** — warn on missing or extra keys
- **Pretty errors** — colored output with key name + Zod error message
- **CI-friendly** — GitHub Actions `::error::` annotations when `CI=true`
- **Static audit** — scan codebase for undeclared, unused, and dynamic `process.env` accesses
- **Auto-fix** — `--fix` appends undeclared keys to your schema as `z.string().optional()`
- **NestJS integration** — `forRoot()` / `forRootAsync()` with typed `EnvGuardService`

## Comparison

| Feature | envguard | dotenv-safe | envalid | t3-env |
| --- | :---: | :---: | :---: | :---: |
| Zod schemas | :white_check_mark: | :x: | :x: | :white_check_mark: |
| Full TypeScript inference | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: |
| Type coercion | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: |
| Cross-field validation | :white_check_mark: | :x: | :x: | :x: |
| `.env.example` sync | :white_check_mark: | :white_check_mark: | :x: | :x: |
| Watch mode | :white_check_mark: | :x: | :x: | :x: |
| Masked logging | :white_check_mark: | :x: | :x: | :x: |
| Freeze result | :white_check_mark: | :x: | :x: | :x: |
| CLI tool | :white_check_mark: | :x: | :x: | :x: |
| Static audit / linting | :white_check_mark: | :x: | :x: | :x: |
| Auto-fix undeclared keys | :white_check_mark: | :x: | :x: | :x: |
| NestJS module | :white_check_mark: | :x: | :x: | :x: |
| Pretty error output | :white_check_mark: | :x: | :white_check_mark: | :white_check_mark: |
| CI annotations | :white_check_mark: | :x: | :x: | :x: |
| Zero peer deps (except zod) | :white_check_mark: | :white_check_mark: | :white_check_mark: | :x: |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint
pnpm lint

# Create a changeset
pnpm changeset
```

## License

MIT
