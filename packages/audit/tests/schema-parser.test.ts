import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { parseSchemaKeys } from '../src/schema-parser.js';

const FIXTURES = resolve(__dirname, 'fixtures');
const TEST_DIR = join(tmpdir(), 'envguard-schema-test-' + process.pid);

function setupTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

describe('parseSchemaKeys', () => {
  it('should parse keys from a default export schema', () => {
    const keys = parseSchemaKeys(join(FIXTURES, 'schema.ts'));

    expect(keys.has('PORT')).toBe(true);
    expect(keys.has('NODE_ENV')).toBe(true);
    expect(keys.has('DB_URL')).toBe(true);
    expect(keys.has('UNUSED_KEY')).toBe(true);
  });

  it('should parse keys from a named export schema', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'named-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';
export const schema = {
  API_KEY: z.string(),
  PORT: z.coerce.number(),
};`,
      'utf-8',
    );

    const keys = parseSchemaKeys(schemaPath);

    expect(keys.has('API_KEY')).toBe(true);
    expect(keys.has('PORT')).toBe(true);

    unlinkSync(schemaPath);
  });

  it('should parse keys from guard() call pattern', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'guard-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';
import { guard } from '@envguard/core';
const env = guard({
  DATABASE_URL: z.string().url(),
  REDIS_HOST: z.string(),
  PORT: z.coerce.number().default(3000),
});`,
      'utf-8',
    );

    const keys = parseSchemaKeys(schemaPath);

    expect(keys.has('DATABASE_URL')).toBe(true);
    expect(keys.has('REDIS_HOST')).toBe(true);
    expect(keys.has('PORT')).toBe(true);

    unlinkSync(schemaPath);
  });

  it('should handle empty schema files gracefully', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'empty-schema.ts');
    writeFileSync(schemaPath, '// empty file\n', 'utf-8');

    const keys = parseSchemaKeys(schemaPath);

    expect(keys.size).toBe(0);

    unlinkSync(schemaPath);
  });

  it('should parse keys using alternative zod patterns (zod. prefix)', () => {
    const keys = parseSchemaKeys(join(FIXTURES, 'schema-alt-patterns.ts'));

    expect(keys.has('ALT_STRING')).toBe(true);
    expect(keys.has('ALT_NUMBER')).toBe(true);
  });

  it('should fall back to regex when AST finds no schema objects', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'regex-fallback.ts');
    // No object literal with UPPER_SNAKE keys — only inline references
    writeFileSync(
      schemaPath,
      `
// This file has no parseable object literal
// but the regex should pick up these patterns:
// FALLBACK_PORT: z.number()
// FALLBACK_HOST: z.string()
type Config = {
  FALLBACK_PORT: z.number(),
  FALLBACK_HOST: z.string(),
}
`,
      'utf-8',
    );

    const keys = parseSchemaKeys(schemaPath);

    expect(keys.has('FALLBACK_PORT')).toBe(true);
    expect(keys.has('FALLBACK_HOST')).toBe(true);

    unlinkSync(schemaPath);
  });

  it('should handle schemas with spread syntax (non-PropertyAssignment)', () => {
    const keys = parseSchemaKeys(join(FIXTURES, 'schema-with-spread.ts'));

    // Spread ...base is not a PropertyAssignment, should be skipped
    // But DB_URL and NODE_ENV should still be found
    expect(keys.has('DB_URL')).toBe(true);
    expect(keys.has('NODE_ENV')).toBe(true);
  });

  it('should detect .string(), .number(), .boolean(), .enum() patterns without z. prefix', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'method-patterns.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';
const str = z.string;
const num = z.number;
export default {
  STR_FIELD: str().min(1),
  NUM_FIELD: num().int(),
  BOOL_FIELD: z.boolean().default(false),
  ENUM_FIELD: z.enum(['a', 'b']),
  COERCE_FIELD: z.coerce.number(),
};`,
      'utf-8',
    );

    const keys = parseSchemaKeys(schemaPath);

    expect(keys.has('STR_FIELD')).toBe(true);
    expect(keys.has('NUM_FIELD')).toBe(true);
    expect(keys.has('BOOL_FIELD')).toBe(true);
    expect(keys.has('ENUM_FIELD')).toBe(true);
    expect(keys.has('COERCE_FIELD')).toBe(true);

    unlinkSync(schemaPath);
  });
});
