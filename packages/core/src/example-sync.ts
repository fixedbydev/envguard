import { readFileSync, existsSync } from 'node:fs';
import chalk from 'chalk';

/**
 * Parse a .env file into a set of keys (ignoring comments and blank lines).
 * @param filePath - Path to the env file.
 * @returns A Set of key names found in the file.
 */
function parseKeys(filePath: string): Set<string> {
  const keys = new Set<string>();
  if (!existsSync(filePath)) return keys;

  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      keys.add(trimmed.slice(0, eqIdx).trim());
    }
  }
  return keys;
}

/** Result of comparing env keys against an example file. */
export interface ExampleSyncResult {
  /** Keys present in .env.example but missing from .env */
  missing: string[];
  /** Keys present in .env but not in .env.example */
  extra: string[];
}

/**
 * Compare loaded env keys against a .env.example file and warn about differences.
 * @param envPath - Path to the .env file.
 * @param examplePath - Path to the .env.example file.
 * @returns The sync result with missing and extra keys.
 */
export function syncExample(
  envPath: string,
  examplePath: string,
): ExampleSyncResult {
  if (!existsSync(examplePath)) {
    return { missing: [], extra: [] };
  }

  const envKeys = parseKeys(envPath);
  const exampleKeys = parseKeys(examplePath);

  const missing = [...exampleKeys].filter((k) => !envKeys.has(k));
  const extra = [...envKeys].filter((k) => !exampleKeys.has(k));

  if (missing.length > 0) {
    console.warn(
      chalk.yellow(
        `⚠ Missing from .env (present in .env.example): ${missing.join(', ')}`,
      ),
    );
  }

  if (extra.length > 0) {
    console.warn(
      chalk.yellow(
        `⚠ Extra in .env (not in .env.example): ${extra.join(', ')}`,
      ),
    );
  }

  return { missing, extra };
}
