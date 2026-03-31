import { resolve } from 'node:path';
import { scan } from './scanner.js';
import { parseSchemaKeys } from './schema-parser.js';
import type { AuditOptions, AuditResult } from './types.js';

const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
const DEFAULT_EXCLUDE = ['**/node_modules/**', '**/dist/**'];

/**
 * Audit `process.env` usage in source code against a Zod schema file.
 *
 * Scans the specified directories for all `process.env` accesses,
 * compares them against keys declared in the schema, and reports:
 * - **undeclared**: keys used in code but missing from the schema
 * - **unused**: keys declared in the schema but never used in code
 * - **unsafe**: dynamic `process.env[variable]` accesses that cannot
 *   be statically resolved (flagged as `DYNAMIC_ACCESS` for manual review)
 *
 * @param options - Audit configuration.
 * @returns The audit result.
 *
 * @example
 * ```ts
 * import { audit } from '@envguard/audit';
 *
 * const result = await audit({
 *   dir: './src',
 *   schema: './env.schema.ts',
 * });
 *
 * console.log(result.undeclared); // { key, file, line }[]
 * console.log(result.unused);    // string[]
 * console.log(result.unsafe);    // { expression, file, line }[]
 * ```
 */
export async function audit(options: AuditOptions): Promise<AuditResult> {
  const {
    schema: schemaPath,
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
  } = options;

  // Normalize dirs
  const rawDirs = options.dir ?? ['./src'];
  const dirs = (Array.isArray(rawDirs) ? rawDirs : [rawDirs]).map((d) =>
    resolve(d),
  );

  const resolvedSchema = resolve(schemaPath);

  // Parse schema keys
  const schemaKeys = parseSchemaKeys(resolvedSchema);

  // Scan source files
  const { references, unsafe } = scan(dirs, include, exclude);

  // Compute undeclared: keys found in code but not in schema
  const undeclared = references.filter((ref) => !schemaKeys.has(ref.key));

  // Compute used keys
  const usedKeys = new Set(references.map((ref) => ref.key));

  // Compute unused: keys in schema but never referenced in code
  const unused = [...schemaKeys].filter((key) => !usedKeys.has(key));

  return {
    undeclared,
    unused,
    unsafe,
  };
}
