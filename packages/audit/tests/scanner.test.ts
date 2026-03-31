import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { scan } from '../src/scanner.js';

const FIXTURES = resolve(__dirname, 'fixtures');

describe('scanner', () => {
  const include = ['**/*.ts'];
  const exclude = ['**/node_modules/**'];

  it('should find direct property access (process.env.KEY)', () => {
    const result = scan([FIXTURES], ['basic-usage.ts'], exclude);

    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('PORT');
    expect(keys).toContain('DB_URL');
  });

  it('should find bracket access with string literal (process.env["KEY"])', () => {
    const result = scan([FIXTURES], ['basic-usage.ts'], exclude);

    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('NODE_ENV');
  });

  it('should flag dynamic access as unsafe', () => {
    const result = scan([FIXTURES], ['dynamic-access.ts'], exclude);

    expect(result.unsafe.length).toBe(2);
    expect(result.unsafe[0]!.expression).toBe('key');
    expect(result.unsafe[1]!.expression).toBe('name');

    // PORT is still found as a static reference
    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('PORT');
  });

  it('should skip lines with envguard-ignore comment', () => {
    const result = scan([FIXTURES], ['with-ignore.ts'], exclude);

    // REDIS_URL should be found (no ignore)
    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('REDIS_URL');
    expect(keys).toContain('PORT');

    // LEGACY_FLAG should be skipped (has ignore comment)
    expect(keys).not.toContain('LEGACY_FLAG');

    // Dynamic access with ignore should also be skipped
    expect(result.unsafe.length).toBe(0);
  });

  it('should include file path and line number in references', () => {
    const result = scan([FIXTURES], ['basic-usage.ts'], exclude);

    for (const ref of result.references) {
      expect(ref.file).toContain('basic-usage.ts');
      expect(ref.line).toBeGreaterThan(0);
    }
  });

  it('should include file path and line number in unsafe accesses', () => {
    const result = scan([FIXTURES], ['dynamic-access.ts'], exclude);

    for (const acc of result.unsafe) {
      expect(acc.file).toContain('dynamic-access.ts');
      expect(acc.line).toBeGreaterThan(0);
    }
  });

  it('should scan multiple files', () => {
    const result = scan([FIXTURES], ['basic-usage.ts', 'undeclared.ts'], exclude);

    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('PORT');
    expect(keys).toContain('DB_URL');
    expect(keys).toContain('REDIS_URL');
    expect(keys).toContain('SECRET_KEY');
  });

  it('should resolve template literal bracket access (process.env[`KEY`])', () => {
    const result = scan([FIXTURES], ['template-literal.ts'], exclude);

    const keys = result.references.map((r) => r.key);
    expect(keys).toContain('TEMPLATE_KEY');
    expect(keys).toContain('PORT');
  });

  it('should apply non-glob exclude patterns', () => {
    const result = scan([FIXTURES], ['basic-usage.ts'], ['basic-usage']);

    // The file should be excluded
    expect(result.references.length).toBe(0);
  });

  it('should skip property access with envguard-ignore comment', () => {
    const result = scan([FIXTURES], ['ignored-property-access.ts'], exclude);

    const keys = result.references.map((r) => r.key);
    // IGNORED_PROP has envguard-ignore → should be skipped
    expect(keys).not.toContain('IGNORED_PROP');
    // PORT should still be found
    expect(keys).toContain('PORT');
  });

  it('should ignore non-process.env bracket accesses', () => {
    const result = scan([FIXTURES], ['non-env-bracket.ts'], exclude);

    // Only PORT should be found (property access on process.env)
    const keys = result.references.map((r) => r.key);
    expect(keys).toEqual(['PORT']);
    // No unsafe accesses either
    expect(result.unsafe.length).toBe(0);
  });
});
