# @stacklance/envguard-cli

CLI tool for validating, diffing, masking, and fixing environment variables.

## Installation

```bash
npm install -g @stacklance/envguard-cli
# or use with npx
npx @stacklance/envguard-cli check
```

## Commands

### `env-guard check`

Validate a `.env` file against a schema.

```bash
env-guard check --path .env --schema ./env.schema.ts
```

Exits with code 1 on validation failure. In CI environments (`CI=true`), outputs GitHub Actions `::error::` annotations.

### `env-guard diff`

Show missing and extra keys between `.env` and `.env.example`.

```bash
env-guard diff --env .env --example .env.example
```

Output:

```
┌──────────┬───────────────────────────────┐
│ Key      │ Status                        │
├──────────┼───────────────────────────────┤
│ REDIS_URL│ Missing from .env             │
│ LEGACY   │ Extra (not in .env.example)   │
└──────────┴───────────────────────────────┘
```

### `env-guard mask`

Print all env vars with sensitive values redacted.

```bash
env-guard mask --path .env
```

Keys containing `SECRET`, `KEY`, `TOKEN`, `PASSWORD`, or `PASS` are auto-masked.

### `env-guard fix`

Append missing keys (from `.env.example`) to `.env` with empty values.

```bash
env-guard fix --path .env --example .env.example
```

### `env-guard audit`

Statically audit `process.env` usage in your codebase against a Zod schema file.

```bash
env-guard audit --dir ./src --schema ./env.schema.ts
```

Options:

| Flag | Description | Default |
| --- | --- | --- |
| `--dir <paths...>` | Directories to scan (supports multiple) | `./src` |
| `--schema <path>` | Path to Zod schema file | `./env.schema.ts` |
| `--fix` | Add undeclared keys to schema as `z.string().optional()` | `false` |
| `--json` | Output JSON instead of formatted text | `false` |

Exits with code 1 if any undeclared env vars are found. In CI, outputs `::error::` and `::warning::` annotations.

## CI Integration

When `CI=true` is set, failed validations output GitHub Actions annotations:

```
::error title=EnvGuard::DB_URL: Invalid url
```

## License

MIT
