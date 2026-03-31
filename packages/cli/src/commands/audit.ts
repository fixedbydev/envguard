import { resolve } from 'node:path';
import chalk from 'chalk';
import {
  audit,
  fixSchema,
  formatText,
  formatGitHub,
  formatJSON,
} from '@envguard/audit';
import { isCI } from '../utils.js';

/**
 * Audit process.env usage in source code against a schema file.
 *
 * @param options - Command options.
 * @param options.dir - Directories to scan (can be multiple).
 * @param options.schema - Path to the Zod schema file.
 * @param options.fix - If true, append undeclared keys to the schema.
 * @param options.json - If true, output JSON instead of text.
 */
export async function auditCommand(options: {
  dir: string[];
  schema: string;
  fix: boolean;
  json: boolean;
}): Promise<void> {
  const { dir, schema, fix, json } = options;

  const result = await audit({
    dir: dir.map((d) => resolve(d)),
    schema: resolve(schema),
  });

  // Output
  if (json) {
    console.log(formatJSON(result));
  } else if (isCI) {
    const annotations = formatGitHub(result);
    for (const line of annotations) {
      console.log(line);
    }
    // Also print summary
    if (annotations.length > 0) {
      console.log('');
    }
    console.log(
      `Audit: ${result.undeclared.length} undeclared, ${result.unused.length} unused, ${result.unsafe.length} dynamic`,
    );
  } else {
    console.log(formatText(result));
  }

  // --fix: append undeclared keys to schema
  if (fix && result.undeclared.length > 0) {
    try {
      const added = fixSchema(resolve(schema), result.undeclared);
      console.log(
        chalk.green(`\n✔ Added ${added.length} key(s) to ${schema}:`),
      );
      for (const key of added) {
        console.log(`  ${chalk.cyan(key)}: z.string().optional()`);
      }
    } catch (err) {
      console.error(
        chalk.red(`\n✖ Failed to fix schema: ${(err as Error).message}`),
      );
      process.exit(1);
    }
  }

  // Exit with code 1 if undeclared found
  if (result.undeclared.length > 0) {
    process.exit(1);
  }
}
