import {
  Project,
  SyntaxKind,
  type SourceFile,
  type Node,
} from 'ts-morph';
import type { EnvReference, UnsafeAccess } from './types.js';

const IGNORE_COMMENT = 'envguard-ignore';

/** Collected scan results from source files. */
export interface ScanResult {
  /** Static `process.env.KEY` / `process.env['KEY']` references. */
  references: EnvReference[];
  /** Dynamic `process.env[expr]` accesses. */
  unsafe: UnsafeAccess[];
}

/**
 * Check whether a node's line has an `// envguard-ignore` trailing comment.
 */
function hasIgnoreComment(node: Node): boolean {
  const sourceFile = node.getSourceFile();
  const lineNumber = node.getStartLineNumber();
  const lineText = sourceFile.getFullText().split('\n')[lineNumber - 1]!;
  return lineText.includes(IGNORE_COMMENT);
}

/**
 * Check whether a PropertyAccess or ElementAccess node's object is `process.env`.
 *
 * Must only be called on PropertyAccessExpression or ElementAccessExpression nodes.
 */
function isProcessEnvAccess(
  node: import('ts-morph').PropertyAccessExpression | import('ts-morph').ElementAccessExpression,
): boolean {
  return node.getExpression().getText() === 'process.env';
}

/**
 * Scan a single source file for all `process.env` accesses.
 */
function scanFile(sourceFile: SourceFile): ScanResult {
  const references: EnvReference[] = [];
  const unsafe: UnsafeAccess[] = [];
  const filePath = sourceFile.getFilePath();

  // Find all PropertyAccessExpressions: process.env.KEY
  sourceFile
    .getDescendantsOfKind(SyntaxKind.PropertyAccessExpression)
    .forEach((node) => {
      if (!isProcessEnvAccess(node)) return;
      if (hasIgnoreComment(node)) return;

      const key = node.getName();
      references.push({
        key,
        file: filePath,
        line: node.getStartLineNumber(),
      });
    });

  // Find all ElementAccessExpressions: process.env['KEY'] or process.env[var]
  sourceFile
    .getDescendantsOfKind(SyntaxKind.ElementAccessExpression)
    .forEach((node) => {
      if (!isProcessEnvAccess(node)) return;
      if (hasIgnoreComment(node)) return;

      const arg = node.getArgumentExpression()!;

      // String literal → static key
      if (arg.isKind(SyntaxKind.StringLiteral)) {
        references.push({
          key: arg.getLiteralText(),
          file: filePath,
          line: node.getStartLineNumber(),
        });
        return;
      }

      // NoSubstitutionTemplateLiteral → static key
      if (arg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
        references.push({
          key: arg.getLiteralText(),
          file: filePath,
          line: node.getStartLineNumber(),
        });
        return;
      }

      // Everything else is a dynamic access
      unsafe.push({
        expression: arg.getText(),
        file: filePath,
        line: node.getStartLineNumber(),
      });
    });

  return { references, unsafe };
}

/**
 * Scan directories for all `process.env` accesses using ts-morph AST traversal.
 *
 * @param dirs - Directories to scan.
 * @param include - Glob patterns for files to include.
 * @param exclude - Glob patterns for files to exclude.
 * @returns Aggregated scan results.
 */
export function scan(
  dirs: string[],
  include: string[],
  exclude: string[],
): ScanResult {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: true,
    },
  });

  for (const dir of dirs) {
    for (const pattern of include) {
      project.addSourceFilesAtPaths(`${dir}/${pattern}`);
    }
  }

  // Remove excluded files
  const sourceFiles = project.getSourceFiles().filter((sf) => {
    const path = sf.getFilePath();
    return !exclude.some((ex) => {
      // Simple glob matching for common patterns
      if (ex.includes('**/')) {
        const segment = ex.replace(/\*\*\//g, '');
        return path.includes(`/${segment.replace(/\/?\*\*$/, '')}`);
      }
      return path.includes(ex);
    });
  });

  const allReferences: EnvReference[] = [];
  const allUnsafe: UnsafeAccess[] = [];

  for (const sourceFile of sourceFiles) {
    const result = scanFile(sourceFile);
    allReferences.push(...result.references);
    allUnsafe.push(...result.unsafe);
  }

  return { references: allReferences, unsafe: allUnsafe };
}
