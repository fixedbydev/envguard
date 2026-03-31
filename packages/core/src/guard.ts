import { config as dotenvConfig } from 'dotenv';
import { z, type ZodRawShape, type ZodObject } from 'zod';
import { EnvGuardError, type EnvErrorDetail } from './error.js';
import { printMasked, printErrors } from './format.js';
import { syncExample } from './example-sync.js';
import { EnvWatcher } from './watch.js';

/** Options for the `guard()` function. */
export interface GuardOptions {
  /** Path to the .env file. Defaults to `'.env'`. */
  path?: string;
  /** Path to the .env.example file for key comparison. Defaults to `'.env.example'`. */
  examplePath?: string;
  /** Whether to freeze the result object. Defaults to `true`. */
  freeze?: boolean;
  /** Whether to enable file watch mode. Defaults to `false`. */
  watch?: boolean;
  /** Whether to print masked env values after validation. Defaults to `false`. */
  masked?: boolean;
}

/** Return type when watch mode is enabled. */
export interface GuardResultWithWatcher<T> {
  /** The validated and typed environment variables. */
  env: T;
  /** The file watcher instance. Call `.close()` to stop watching. */
  watcher: EnvWatcher;
}

/**
 * Validate environment variables against a Zod schema.
 *
 * Loads variables from a .env file (via dotenv), validates them against
 * the provided Zod object schema, and returns a fully-typed, optionally
 * frozen result.
 *
 * @param schema - A Zod object shape defining expected env vars.
 * @param options - Configuration options.
 * @returns The validated env object, or an object with `env` and `watcher` if watch mode is enabled.
 * @throws {EnvGuardError} If validation fails.
 *
 * @example
 * ```ts
 * import { guard } from '@envguard/core';
 * import { z } from 'zod';
 *
 * const env = guard({
 *   PORT: z.coerce.number().default(3000),
 *   NODE_ENV: z.enum(['development', 'staging', 'production']),
 *   DB_URL: z.string().url(),
 * });
 *
 * // env.PORT is typed as number
 * // env.NODE_ENV is typed as 'development' | 'staging' | 'production'
 * ```
 */
export function guard<T extends ZodRawShape>(
  schema: T,
  options: GuardOptions & { watch: true },
): GuardResultWithWatcher<z.infer<ZodObject<T>>>;

export function guard<T extends ZodRawShape>(
  schema: T,
  options?: GuardOptions,
): z.infer<ZodObject<T>>;

export function guard<T extends ZodRawShape>(
  schema: T,
  options: GuardOptions = {},
): z.infer<ZodObject<T>> | GuardResultWithWatcher<z.infer<ZodObject<T>>> {
  const {
    path: envPath = '.env',
    examplePath = '.env.example',
    freeze = true,
    watch: watchMode = false,
    masked = false,
  } = options;

  const zodSchema = z.object(schema);

  const validate = (): z.infer<ZodObject<T>> => {
    // Load .env file
    dotenvConfig({ path: envPath, override: true });

    // Sync with .env.example
    syncExample(envPath, examplePath);

    // Validate against process.env
    const result = zodSchema.safeParse(process.env);

    if (!result.success) {
      const details: EnvErrorDetail[] = [];
      const grouped = new Map<string, z.ZodIssue[]>();

      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'unknown');
        const existing = grouped.get(key) ?? [];
        existing.push(issue);
        grouped.set(key, existing);
      }

      for (const [key, issues] of grouped) {
        details.push({ key, issues });
      }

      printErrors(details);
      throw new EnvGuardError(details);
    }

    const env = result.data as z.infer<ZodObject<T>>;

    if (masked) {
      printMasked(env as Record<string, unknown>);
    }

    if (freeze) {
      return Object.freeze(env);
    }

    return env;
  };

  const env = validate();

  if (watchMode) {
    const watcher = new EnvWatcher(envPath, validate);
    watcher.start();
    return { env, watcher };
  }

  return env;
}
