import { relative } from 'node:path';
import chalk from 'chalk';
import type { AuditResult } from './types.js';

/**
 * Format an audit result as a human-readable text report with colors.
 *
 * @param result - The audit result.
 * @param cwd - Base directory for relative paths. Defaults to `process.cwd()`.
 * @returns Formatted string.
 */
export function formatText(result: AuditResult, cwd: string = process.cwd()): string {
  const lines: string[] = [];
  const rel = (p: string) => relative(cwd, p);

  if (result.undeclared.length > 0) {
    lines.push(chalk.bold.red(`\n✖ Undeclared env vars (${result.undeclared.length}):\n`));
    for (const ref of result.undeclared) {
      lines.push(
        `  ${chalk.red('●')} ${chalk.bold(ref.key)} ${chalk.gray(`${rel(ref.file)}:${ref.line}`)}`,
      );
    }
  }

  if (result.unused.length > 0) {
    lines.push(chalk.bold.yellow(`\n⚠ Unused schema keys (${result.unused.length}):\n`));
    for (const key of result.unused) {
      lines.push(`  ${chalk.yellow('●')} ${chalk.bold(key)}`);
    }
  }

  if (result.unsafe.length > 0) {
    lines.push(
      chalk.bold.magenta(`\n⚡ Dynamic access — manual review needed (${result.unsafe.length}):\n`),
    );
    for (const acc of result.unsafe) {
      lines.push(
        `  ${chalk.magenta('●')} process.env[${chalk.italic(acc.expression)}] ${chalk.gray(`${rel(acc.file)}:${acc.line}`)}`,
      );
    }
  }

  if (
    result.undeclared.length === 0 &&
    result.unused.length === 0 &&
    result.unsafe.length === 0
  ) {
    lines.push(chalk.green('\n✔ All process.env accesses match the schema.\n'));
  } else {
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format an audit result as GitHub Actions `::error::` / `::warning::` annotations.
 *
 * @param result - The audit result.
 * @param cwd - Base directory for relative paths.
 * @returns Array of annotation lines.
 */
export function formatGitHub(result: AuditResult, cwd: string = process.cwd()): string[] {
  const annotations: string[] = [];
  const rel = (p: string) => relative(cwd, p);

  for (const ref of result.undeclared) {
    annotations.push(
      `::error file=${rel(ref.file)},line=${ref.line}::UNDECLARED env var "${ref.key}" is not in the schema`,
    );
  }

  for (const acc of result.unsafe) {
    annotations.push(
      `::warning file=${rel(acc.file)},line=${acc.line}::DYNAMIC_ACCESS process.env[${acc.expression}] cannot be statically verified`,
    );
  }

  // Unused keys don't map to a file, so output as a general warning
  for (const key of result.unused) {
    annotations.push(
      `::warning::UNUSED schema key "${key}" is never referenced in code`,
    );
  }

  return annotations;
}

/**
 * Format an audit result as a JSON string.
 *
 * @param result - The audit result.
 * @param cwd - Base directory for relative paths.
 * @returns Pretty-printed JSON string.
 */
export function formatJSON(result: AuditResult, cwd: string = process.cwd()): string {
  const rel = (p: string) => relative(cwd, p);

  return JSON.stringify(
    {
      undeclared: result.undeclared.map((r) => ({
        key: r.key,
        file: rel(r.file),
        line: r.line,
      })),
      unused: result.unused,
      unsafe: result.unsafe.map((a) => ({
        expression: a.expression,
        file: rel(a.file),
        line: a.line,
      })),
      summary: {
        undeclared: result.undeclared.length,
        unused: result.unused.length,
        unsafe: result.unsafe.length,
      },
    },
    null,
    2,
  );
}
