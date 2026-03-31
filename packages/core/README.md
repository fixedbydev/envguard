# @envguard/core

Zod-based environment variable validation with full TypeScript inference, `.env` file loading, watch mode, and pretty error output.

## Installation

```bash
npm install @envguard/core zod
```

## Usage

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

// Fully typed! env.PORT is number, env.NODE_ENV is 'development' | 'staging' | 'production'
console.log(env.PORT); // 3000
```

## Options

```ts
const env = guard(schema, {
  path: '.env',              // Path to .env file (default: '.env')
  examplePath: '.env.example', // Path to .env.example for key sync (default: '.env.example')
  freeze: true,              // Object.freeze the result (default: true)
  watch: false,              // Watch .env for changes (default: false)
  masked: false,             // Print masked env table (default: false)
});
```

## Watch Mode

```ts
const { env, watcher } = guard(schema, { watch: true });

watcher.on('change', (newEnv) => {
  console.log('Env updated:', newEnv);
});

watcher.on('error', (err) => {
  console.error('Validation failed:', err);
});

// Stop watching
watcher.close();
```

## Masked Logging

Automatically redacts values for keys containing `SECRET`, `KEY`, `TOKEN`, `PASSWORD`, or `PASS`:

```ts
guard(schema, { masked: true });
// Prints:
// API_KEY       ****
// PORT          3000
// DB_URL        postgres://localhost/mydb
```

## .env.example Sync

Automatically warns when keys differ between `.env` and `.env.example`:

```
⚠ Missing from .env (present in .env.example): REDIS_URL
⚠ Extra in .env (not in .env.example): LEGACY_FLAG
```

## Error Handling

```ts
import { guard, EnvGuardError } from '@envguard/core';

try {
  const env = guard(schema);
} catch (err) {
  if (err instanceof EnvGuardError) {
    for (const detail of err.details) {
      console.log(detail.key, detail.issues);
    }
  }
}
```

## API

### `guard(schema, options?)`

Validate `process.env` against a Zod schema shape. Returns a frozen, fully-typed object.

### `GuardOptions`

| Option       | Type      | Default          | Description                        |
| ------------ | --------- | ---------------- | ---------------------------------- |
| `path`       | `string`  | `'.env'`         | Path to .env file                  |
| `examplePath`| `string`  | `'.env.example'` | Path to .env.example               |
| `freeze`     | `boolean` | `true`           | Freeze the result object           |
| `watch`      | `boolean` | `false`          | Watch .env file for changes        |
| `masked`     | `boolean` | `false`          | Print masked env values            |

### `EnvGuardError`

Error class with a `details` array of `{ key: string, issues: ZodIssue[] }`.

## License

MIT
