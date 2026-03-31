import type { ZodIssue } from 'zod';

/** Detail for a single environment variable validation failure. */
export interface EnvErrorDetail {
  /** The environment variable key. */
  key: string;
  /** The Zod issues associated with the key. */
  issues: ZodIssue[];
}

/**
 * Typed error thrown when environment validation fails.
 * Contains per-key error details for programmatic access.
 */
export class EnvGuardError extends Error {
  /** Per-key validation error details. */
  readonly details: EnvErrorDetail[];

  constructor(details: EnvErrorDetail[]) {
    const message = details
      .map(
        (d) =>
          `  ${d.key}: ${d.issues.map((i) => i.message).join(', ')}`,
      )
      .join('\n');
    super(`Environment validation failed:\n${message}`);
    this.name = 'EnvGuardError';
    this.details = details;
  }
}
