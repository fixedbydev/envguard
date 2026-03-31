import { existsSync } from 'node:fs';
import chalk from 'chalk';
import Table from 'cli-table3';
import { z } from 'zod';
import { parseEnvFile, isCI, ghAnnotation } from '../utils.js';

/**
 * Validate a .env file against a schema file.
 * Exits with code 1 on validation failure.
 *
 * @param options - Command options.
 * @param options.path - Path to the .env file.
 * @param options.schema - Path to the schema file (TypeScript module exporting a schema).
 */
export async function checkCommand(options: {
  path: string;
  schema: string;
}): Promise<void> {
  const { path: envPath, schema: schemaPath } = options;

  if (!existsSync(envPath)) {
    console.error(chalk.red(`✖ .env file not found: ${envPath}`));
    process.exit(1);
  }

  if (!existsSync(schemaPath)) {
    console.error(chalk.red(`✖ Schema file not found: ${schemaPath}`));
    process.exit(1);
  }

  // Load the schema module
  let schemaModule: Record<string, unknown>;
  try {
    schemaModule = await import(schemaPath);
  } catch (err) {
    console.error(
      chalk.red(`✖ Failed to load schema: ${(err as Error).message}`),
    );
    process.exit(1);
  }

  const shape = (schemaModule['default'] ?? schemaModule['schema'] ?? schemaModule) as z.ZodRawShape;

  // Parse the .env file into process.env-like object
  const envVars = parseEnvFile(envPath);
  const envObj: Record<string, string> = {};
  for (const [key, value] of envVars) {
    envObj[key] = value;
  }

  const zodSchema = z.object(shape);
  const result = zodSchema.safeParse(envObj);

  if (result.success) {
    console.log(chalk.green('✔ All environment variables are valid.'));
    return;
  }

  // Format errors
  const table = new Table({
    head: [chalk.bold('Key'), chalk.bold('Error')],
    style: { head: [] },
  });

  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'unknown');
    table.push([chalk.red(key), issue.message]);

    if (isCI) {
      ghAnnotation(key, issue.message);
    }
  }

  console.error(chalk.bold.red('\n✖ Environment validation failed:\n'));
  console.error(table.toString());
  console.error('');
  process.exit(1);
}
