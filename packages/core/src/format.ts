import chalk from 'chalk';
import type { EnvErrorDetail } from './error.js';

/** Sensitive key patterns that should be masked in output. */
const SENSITIVE_PATTERNS = [
  'SECRET',
  'KEY',
  'TOKEN',
  'PASSWORD',
  'PASS',
];

/**
 * Determine if a key name should be treated as sensitive.
 * @param key - The environment variable name.
 * @returns `true` if the key contains a sensitive pattern.
 */
export function isSensitive(key: string): boolean {
  const upper = key.toUpperCase();
  return SENSITIVE_PATTERNS.some((p) => upper.includes(p));
}

/**
 * Mask a value if the key is sensitive.
 * @param key - The environment variable name.
 * @param value - The value to potentially mask.
 * @returns The original value or `'****'` if masked.
 */
export function maskValue(key: string, value: string): string {
  return isSensitive(key) ? '****' : value;
}

/**
 * Print all env vars in a formatted table, auto-redacting sensitive values.
 * @param env - Record of validated environment variables.
 */
export function printMasked(env: Record<string, unknown>): void {
  const maxKeyLen = Math.max(...Object.keys(env).map((k) => k.length), 0);

  console.log(chalk.bold('\nEnvironment Variables:'));
  console.log(chalk.gray('─'.repeat(maxKeyLen + 20)));

  for (const [key, value] of Object.entries(env)) {
    const displayValue = isSensitive(key)
      ? chalk.yellow('****')
      : chalk.green(String(value));
    console.log(`  ${chalk.cyan(key.padEnd(maxKeyLen))}  ${displayValue}`);
  }

  console.log(chalk.gray('─'.repeat(maxKeyLen + 20)));
}

/**
 * Print validation errors with colors and formatting.
 * @param details - Array of per-key error details.
 */
export function printErrors(details: EnvErrorDetail[]): void {
  console.error(chalk.bold.red('\n✖ Environment validation failed:\n'));

  for (const detail of details) {
    console.error(`  ${chalk.red('●')} ${chalk.bold(detail.key)}`);
    for (const issue of detail.issues) {
      console.error(`    ${chalk.gray('→')} ${issue.message}`);
    }
  }

  console.error('');
}
