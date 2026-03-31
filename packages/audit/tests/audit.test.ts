import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { audit } from '../src/audit.js';

const FIXTURES = resolve(__dirname, 'fixtures');
const SCHEMA = resolve(FIXTURES, 'schema.ts');

describe('audit', () => {
  it('should report undeclared env vars', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['undeclared.ts'],
    });

    const undeclaredKeys = result.undeclared.map((r) => r.key);
    expect(undeclaredKeys).toContain('REDIS_URL');
    expect(undeclaredKeys).toContain('SECRET_KEY');
    // PORT is declared, so it shouldn't be undeclared
    expect(undeclaredKeys).not.toContain('PORT');
  });

  it('should report unused schema keys', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['basic-usage.ts'],
    });

    // basic-usage.ts uses PORT, DB_URL, NODE_ENV
    // UNUSED_KEY is in schema but not used
    expect(result.unused).toContain('UNUSED_KEY');
    expect(result.unused).not.toContain('PORT');
    expect(result.unused).not.toContain('DB_URL');
    expect(result.unused).not.toContain('NODE_ENV');
  });

  it('should report dynamic/unsafe accesses', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['dynamic-access.ts'],
    });

    expect(result.unsafe.length).toBe(2);
    expect(result.unsafe[0]!.expression).toBe('key');
    expect(result.unsafe[1]!.expression).toBe('name');
  });

  it('should handle all three categories in mixed files', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['mixed.ts'],
    });

    // Undeclared: API_SECRET, CACHE_TTL
    const undeclaredKeys = result.undeclared.map((r) => r.key);
    expect(undeclaredKeys).toContain('API_SECRET');
    expect(undeclaredKeys).toContain('CACHE_TTL');

    // Unused: DB_URL, UNUSED_KEY (not used in mixed.ts)
    expect(result.unused).toContain('DB_URL');
    expect(result.unused).toContain('UNUSED_KEY');

    // Unsafe: configKey dynamic access
    expect(result.unsafe.length).toBe(1);
    expect(result.unsafe[0]!.expression).toBe('configKey');
  });

  it('should respect envguard-ignore comments', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['with-ignore.ts'],
    });

    // REDIS_URL is undeclared and NOT ignored
    const undeclaredKeys = result.undeclared.map((r) => r.key);
    expect(undeclaredKeys).toContain('REDIS_URL');

    // LEGACY_FLAG has ignore comment, should NOT appear
    expect(undeclaredKeys).not.toContain('LEGACY_FLAG');

    // Dynamic access with ignore should NOT appear in unsafe
    expect(result.unsafe.length).toBe(0);
  });

  it('should return clean result when all accesses match schema', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['basic-usage.ts'],
    });

    // All accesses in basic-usage are declared
    expect(result.undeclared.length).toBe(0);
    expect(result.unsafe.length).toBe(0);
  });

  it('should support multiple directories', async () => {
    const result = await audit({
      dir: [FIXTURES, FIXTURES],
      schema: SCHEMA,
      include: ['basic-usage.ts'],
    });

    // Should find references from both "directories" (same dir scanned twice)
    expect(result.undeclared.length).toBe(0);
  });

  it('should include file and line info in undeclared results', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['undeclared.ts'],
    });

    for (const ref of result.undeclared) {
      expect(ref.file).toContain('undeclared.ts');
      expect(ref.line).toBeGreaterThan(0);
    }
  });

  it('should default dir to ./src when not provided', async () => {
    // This exercises the `options.dir ?? ['./src']` branch
    // It will scan ./src which may or may not exist, but should not throw
    const result = await audit({
      schema: SCHEMA,
      include: ['__nonexistent_file_pattern__'],
    });

    expect(result.undeclared).toEqual([]);
    expect(result.unsafe).toEqual([]);
    // All schema keys should be unused since no files matched
    expect(result.unused.length).toBeGreaterThan(0);
  });

  it('should accept dir as a string instead of array', async () => {
    const result = await audit({
      dir: FIXTURES,
      schema: SCHEMA,
      include: ['basic-usage.ts'],
    });

    expect(result.undeclared.length).toBe(0);
  });
});
