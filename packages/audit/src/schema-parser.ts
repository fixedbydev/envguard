import { Project, SyntaxKind } from 'ts-morph';

/**
 * Parse a schema file to extract declared environment variable keys.
 *
 * Supports multiple export forms:
 * - `export default { PORT: z.coerce.number(), ... }`
 * - `export const schema = { PORT: z.coerce.number(), ... }`
 * - `export const env = guard({ PORT: z.coerce.number(), ... })`
 * - Plain object literal as the default export
 *
 * Falls back to regex extraction if AST parsing can't find keys.
 *
 * @param schemaPath - Absolute or relative path to the schema file.
 * @returns Set of declared environment variable key names.
 */
export function parseSchemaKeys(schemaPath: string): Set<string> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { allowJs: true },
  });

  const sourceFile = project.addSourceFileAtPath(schemaPath);
  const keys = new Set<string>();

  // Strategy 1: Find object literals that look like env schemas
  // (keys whose values are zod-like call expressions)
  const objectLiterals = sourceFile.getDescendantsOfKind(
    SyntaxKind.ObjectLiteralExpression,
  );

  for (const obj of objectLiterals) {
    const properties = obj.getProperties();
    let looksLikeSchema = false;

    for (const prop of properties) {
      if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;

      const name = prop.getName();
      // Schema keys are typically UPPER_SNAKE_CASE
      if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
        const initializer = prop.getInitializer();
        if (initializer) {
          const text = initializer.getText();
          // Check if the value looks like a Zod expression
          if (
            text.includes('z.') ||
            text.includes('zod.') ||
            text.includes('.string(') ||
            text.includes('.number(') ||
            text.includes('.boolean(') ||
            text.includes('.enum(') ||
            text.includes('.coerce.')
          ) {
            looksLikeSchema = true;
            keys.add(name);
          }
        }
      }
    }

    // If this object looks like a schema, also add non-zod UPPER_SNAKE keys
    // (they might use aliases or custom validators)
    if (looksLikeSchema) {
      for (const prop of properties) {
        if (!prop.isKind(SyntaxKind.PropertyAssignment)) continue;
        const name = prop.getName();
        if (/^[A-Z][A-Z0-9_]*$/.test(name)) {
          keys.add(name);
        }
      }
    }
  }

  // Strategy 2: Regex fallback for simple patterns
  if (keys.size === 0) {
    const text = sourceFile.getFullText();
    const regex = /(['"]?)([A-Z][A-Z0-9_]+)\1\s*:\s*z\./g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      keys.add(match[2]!);
    }
  }

  return keys;
}
