import { existsSync } from 'node:fs';
import chalk from 'chalk';
import { parseKeys, appendMissingKeys } from '../utils.js';

/**
 * Append missing keys (from .env.example) to the .env file with empty/placeholder values.
 *
 * @param options - Command options.
 * @param options.path - Path to the .env file.
 * @param options.example - Path to the .env.example file.
 */
export function fixCommand(options: {
  path: string;
  example: string;
}): void {
  const { path: envPath, example: examplePath } = options;

  if (!existsSync(examplePath)) {
    console.error(chalk.red(`✖ Example file not found: ${examplePath}`));
    process.exit(1);
  }

  const envKeys = parseKeys(envPath);
  const exampleKeys = parseKeys(examplePath);

  const missing = [...exampleKeys].filter((k) => !envKeys.has(k));

  if (missing.length === 0) {
    console.log(chalk.green('✔ No missing keys. .env is complete.'));
    return;
  }

  appendMissingKeys(envPath, missing);

  console.log(
    chalk.green(`✔ Added ${missing.length} missing key(s) to ${envPath}:`),
  );
  for (const key of missing) {
    console.log(`  ${chalk.cyan(key)}=`);
  }
}
