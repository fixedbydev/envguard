import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { isSensitive } from '@stacklance/envguard-core';

/** Whether running in a CI environment. */
export const isCI = Boolean(process.env['CI']);

/**
 * Parse a .env file into a map of key-value pairs.
 * @param filePath - Path to the env file.
 * @returns Map of key-value pairs.
 */
export function parseEnvFile(filePath: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!existsSync(filePath)) return result;

  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      result.set(key, value);
    }
  }
  return result;
}

/**
 * Parse a .env file into a set of keys.
 * @param filePath - Path to the env file.
 * @returns Set of key names.
 */
export function parseKeys(filePath: string): Set<string> {
  return new Set(parseEnvFile(filePath).keys());
}

/**
 * Mask a value if the key is sensitive.
 * @param key - The environment variable name.
 * @param value - The value.
 * @returns The original or masked value.
 */
export function maskDisplayValue(key: string, value: string): string {
  return isSensitive(key) ? '****' : value;
}

/**
 * Output a GitHub Actions error annotation.
 * @param key - The env key that failed.
 * @param message - The error message.
 */
export function ghAnnotation(key: string, message: string): void {
  console.log(`::error title=EnvGuard::${key}: ${message}`);
}

/**
 * Append missing keys to an env file.
 * @param envPath - Path to the .env file.
 * @param keys - Keys to append.
 */
export function appendMissingKeys(envPath: string, keys: string[]): void {
  if (keys.length === 0) return;

  const existingContent = existsSync(envPath)
    ? readFileSync(envPath, 'utf-8')
    : '';

  const needsNewline =
    existingContent.length > 0 && !existingContent.endsWith('\n');
  const newContent =
    (needsNewline ? '\n' : '') +
    keys.map((k) => `${k}=`).join('\n') +
    '\n';

  writeFileSync(envPath, existingContent + newContent, 'utf-8');
}
