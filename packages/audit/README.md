# @stacklance/envguard-audit

Static analysis tool that scans your codebase for `process.env` usage and audits it against your Zod schema. Catches undeclared env vars, unused schema keys, and dynamic access patterns — before they hit production.

## The Problem

Your schema declares `PORT`, `DB_URL`, and `NODE_ENV`. But somewhere deep in `src/utils/cache.ts`, someone wrote `process.env.REDIS_URL` — and it's not in the schema. Your app boots fine in dev (the variable happens to be set), but fails in staging. @stacklance/envguard-audit catches this at lint time.

## Installation

```bash
npm install @stacklance/envguard-audit
```

## CLI Usage

The audit command is available via `@stacklance/envguard-cli`:

```bash
# Basic audit
env-guard audit --dir ./src --schema ./env.schema.ts

# Scan multiple directories (monorepo)
env-guard audit --dir ./apps/api ./apps/web --schema ./env.schema.ts

# Auto-fix: add undeclared keys to schema
env-guard audit --dir ./src --schema ./env.schema.ts --fix

# JSON output for tooling integration
env-guard audit --dir ./src --schema ./env.schema.ts --json
```

## Programmatic API

```ts
import { audit } from '@stacklance/envguard-audit';

const result = await audit({
  dir: './src',
  schema: './env.schema.ts',
});

console.log(result.undeclared); // { key, file, line }[]
console.log(result.unused);    // string[]
console.log(result.unsafe);    // { expression, file, line }[]
```

## What It Detects

### Undeclared (`result.undeclared`)

Env vars used in code but **not declared** in the schema:

```ts
// env.schema.ts declares: PORT, DB_URL
// but in src/cache.ts:
const redis = process.env.REDIS_URL; // ← UNDECLARED
```

### Unused (`result.unused`)

Schema keys that are **never referenced** anywhere in the scanned code:

```ts
// env.schema.ts declares: PORT, DB_URL, LEGACY_FLAG
// LEGACY_FLAG is never used in any source file → UNUSED
```

### Unsafe / Dynamic Access (`result.unsafe`)

Dynamic `process.env[variable]` patterns that cannot be statically resolved. These are flagged as `DYNAMIC_ACCESS` for manual review — zero false positives on intentional dynamic access:

```ts
const key = getConfigKey();
const val = process.env[key]; // ← DYNAMIC_ACCESS: needs manual review
```

## Ignoring Specific Lines

Add `// envguard-ignore` on the same line to skip an access:

```ts
const legacy = process.env.OLD_FLAG; // envguard-ignore
const dyn = process.env[computed];   // envguard-ignore
```

## CI Integration with GitHub Actions

```yaml
# .github/workflows/ci.yml
jobs:
  audit-env:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: npx env-guard audit --dir ./src --schema ./env.schema.ts
```

When `CI=true`, the CLI automatically outputs GitHub Actions annotations:

```
::error file=src/utils/db.ts,line=14::UNDECLARED env var "REDIS_URL" is not in the schema
::warning file=src/config.ts,line=8::DYNAMIC_ACCESS process.env[key] cannot be statically verified
::warning::UNUSED schema key "LEGACY_FLAG" is never referenced in code
```

These show up as inline annotations on pull requests.

## `--fix` Mode

Automatically adds undeclared keys to your schema file as `z.string().optional()`:

```bash
env-guard audit --dir ./src --schema ./env.schema.ts --fix
```

Before:
```ts
export default {
  PORT: z.coerce.number().default(3000),
  DB_URL: z.string().url(),
};
```

After:
```ts
export default {
  PORT: z.coerce.number().default(3000),
  DB_URL: z.string().url(),
  REDIS_URL: z.string().optional(),
  API_SECRET: z.string().optional(),
};
```

## JSON Output

Use `--json` for machine-readable output, ideal for integration with other tools:

```json
{
  "undeclared": [
    { "key": "REDIS_URL", "file": "src/utils/db.ts", "line": 14 }
  ],
  "unused": ["LEGACY_FLAG"],
  "unsafe": [
    { "expression": "key", "file": "src/config.ts", "line": 8 }
  ],
  "summary": {
    "undeclared": 1,
    "unused": 1,
    "unsafe": 1
  }
}
```

## VS Code Terminal

Run the audit directly in the VS Code integrated terminal for clickable file:line links:

```bash
npx env-guard audit --dir ./src --schema ./env.schema.ts
```

Output includes file paths and line numbers that VS Code makes clickable:

```
✖ Undeclared env vars (1):
  ● REDIS_URL  src/utils/db.ts:14

⚠ Unused schema keys (1):
  ● LEGACY_FLAG

⚡ Dynamic access — manual review needed (1):
  ● process.env[key]  src/config.ts:8
```

## Exit Codes

| Code | Meaning |
| ---- | ------- |
| `0`  | All `process.env` accesses match the schema |
| `1`  | Undeclared env vars found (CI-friendly fail) |

Note: unused keys and dynamic accesses are warnings — they don't cause a non-zero exit.

## License

MIT
