import { existsSync } from 'node:fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { parseEnvFile, maskDisplayValue } from '../utils.js';

/**
 * Print all env vars with sensitive values redacted.
 *
 * @param options - Command options.
 * @param options.path - Path to the .env file.
 */
export function maskCommand(options: { path: string }): void {
  const { path: envPath } = options;

  if (!existsSync(envPath)) {
    console.error(chalk.red(`✖ .env file not found: ${envPath}`));
    process.exit(1);
  }

  const envVars = parseEnvFile(envPath);

  if (envVars.size === 0) {
    console.log(chalk.yellow('No environment variables found.'));
    return;
  }

  const table = new Table({
    head: [chalk.bold('Key'), chalk.bold('Value')],
    style: { head: [] },
  });

  for (const [key, value] of envVars) {
    const masked = maskDisplayValue(key, value);
    table.push([chalk.cyan(key), masked === '****' ? chalk.yellow(masked) : chalk.green(masked)]);
  }

  console.log(chalk.bold('\nEnvironment Variables (masked):\n'));
  console.log(table.toString());
  console.log('');
}
