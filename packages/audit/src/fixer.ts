import { readFileSync, writeFileSync } from 'node:fs';
import type { EnvReference } from './types.js';

/**
 * Append undeclared keys to a schema file as `z.string().optional()`.
 *
 * Inserts new keys into the first object literal that looks like an env
 * schema (contains `z.` expressions). Preserves existing formatting.
 *
 * @param schemaPath - Path to the schema file.
 * @param undeclared - Undeclared env references to add.
 * @returns The list of keys that were added.
 */
export function fixSchema(
  schemaPath: string,
  undeclared: EnvReference[],
): string[] {
  if (undeclared.length === 0) return [];

  const content = readFileSync(schemaPath, 'utf-8');

  // Deduplicate keys
  const keysToAdd = [...new Set(undeclared.map((r) => r.key))];

  // Find the last property in the schema object by looking for the last
  // line that matches KEY: z. pattern, then insert after it
  const lines = content.split('\n');
  let insertIndex = -1;
  let indent = '  ';

  // Find lines that look like schema properties to determine where to insert
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    const match = line.match(/^(\s+)([A-Z][A-Z0-9_]*)\s*:\s*z\./);
    if (match) {
      insertIndex = i;
      indent = match[1]!;
      break;
    }
  }

  // Fallback: find closing brace of an object that contains z.
  if (insertIndex === -1) {
    let inSchema = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.includes('z.')) {
        inSchema = true;
        const wsMatch = line.match(/^(\s+)/);
        if (wsMatch) indent = wsMatch[1]!;
      }
      if (inSchema && /^\s*[})]/.test(line)) {
        insertIndex = i - 1;
        break;
      }
    }
  }

  if (insertIndex === -1) {
    throw new Error(
      `Could not find a suitable location to insert keys in ${schemaPath}`,
    );
  }

  // Build new lines
  const newLines = keysToAdd.map(
    (key) => `${indent}${key}: z.string().optional(),`,
  );

  // Ensure the previous line has a trailing comma
  const prevLine = lines[insertIndex]!;
  if (prevLine.trimEnd().match(/[^,]\s*$/) && prevLine.trim() !== '') {
    lines[insertIndex] = prevLine.replace(/(\S)\s*$/, '$1,');
  }

  // Insert after the last schema property
  lines.splice(insertIndex + 1, 0, ...newLines);

  writeFileSync(schemaPath, lines.join('\n'), 'utf-8');

  return keysToAdd;
}
