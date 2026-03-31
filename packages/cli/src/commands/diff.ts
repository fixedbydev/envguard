import { existsSync } from 'node:fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { parseKeys, isCI, ghAnnotation } from '../utils.js';

/**
 * Compare keys between a .env file and a .env.example file.
 * Shows missing and extra keys in a CI-friendly format.
 *
 * @param options - Command options.
 * @param options.env - Path to the .env file.
 * @param options.example - Path to the .env.example file.
 */
export function diffCommand(options: {
  env: string;
  example: string;
}): void {
  const { env: envPath, example: examplePath } = options;

  if (!existsSync(examplePath)) {
    console.error(chalk.red(`✖ Example file not found: ${examplePath}`));
    process.exit(1);
  }

  const envKeys = parseKeys(envPath);
  const exampleKeys = parseKeys(examplePath);

  const missing = [...exampleKeys].filter((k) => !envKeys.has(k));
  const extra = [...envKeys].filter((k) => !exampleKeys.has(k));

  if (missing.length === 0 && extra.length === 0) {
    console.log(chalk.green('✔ .env and .env.example are in sync.'));
    return;
  }

  const table = new Table({
    head: [chalk.bold('Key'), chalk.bold('Status')],
    style: { head: [] },
  });

  for (const key of missing) {
    table.push([chalk.red(key), chalk.red('Missing from .env')]);
    if (isCI) {
      ghAnnotation(key, 'Missing from .env (present in .env.example)');
    }
  }

  for (const key of extra) {
    table.push([chalk.yellow(key), chalk.yellow('Extra (not in .env.example)')]);
  }

  console.log(
    chalk.bold('\nDiff: .env vs .env.example\n'),
  );
  console.log(table.toString());
  console.log('');

  if (missing.length > 0) {
    process.exit(1);
  }
}
