import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  writeFileSync,
  readFileSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fixSchema } from '../src/fixer.js';
import type { EnvReference } from '../src/types.js';

const TEST_DIR = join(tmpdir(), 'envguard-fixer-test-' + process.pid);

function setupTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

function cleanup(...paths: string[]) {
  for (const p of paths) {
    if (existsSync(p)) unlinkSync(p);
  }
}

describe('fixSchema', () => {
  afterEach(() => {
    const files = ['fix-schema.ts', 'fix-noop.ts'];
    cleanup(...files.map((f) => join(TEST_DIR, f)));
  });

  it('should append undeclared keys as z.string().optional()', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'fix-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';

export default {
  PORT: z.coerce.number().default(3000),
  DB_URL: z.string().url(),
};
`,
      'utf-8',
    );

    const undeclared: EnvReference[] = [
      { key: 'REDIS_URL', file: '/src/db.ts', line: 5 },
      { key: 'API_SECRET', file: '/src/auth.ts', line: 10 },
    ];

    const added = fixSchema(schemaPath, undeclared);

    expect(added).toEqual(['REDIS_URL', 'API_SECRET']);

    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('REDIS_URL: z.string().optional(),');
    expect(content).toContain('API_SECRET: z.string().optional(),');
    // Original keys should still be there
    expect(content).toContain('PORT: z.coerce.number().default(3000),');
    expect(content).toContain('DB_URL: z.string().url(),');
  });

  it('should deduplicate keys', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'fix-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';
export default {
  PORT: z.coerce.number(),
};
`,
      'utf-8',
    );

    const undeclared: EnvReference[] = [
      { key: 'REDIS_URL', file: '/src/a.ts', line: 1 },
      { key: 'REDIS_URL', file: '/src/b.ts', line: 2 },
    ];

    const added = fixSchema(schemaPath, undeclared);

    expect(added).toEqual(['REDIS_URL']);

    const content = readFileSync(schemaPath, 'utf-8');
    const matches = content.match(/REDIS_URL/g);
    expect(matches).toHaveLength(1);
  });

  it('should return empty array when no undeclared', () => {
    const added = fixSchema('/fake/path', []);
    expect(added).toEqual([]);
  });

  it('should insert before closing brace when no UPPER_SNAKE key matches', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'fix-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';
const schema = {
  port: z.coerce.number(),
}
`,
      'utf-8',
    );

    const undeclared: EnvReference[] = [
      { key: 'NEW_KEY', file: '/src/a.ts', line: 1 },
    ];

    const added = fixSchema(schemaPath, undeclared);

    expect(added).toEqual(['NEW_KEY']);
    const content = readFileSync(schemaPath, 'utf-8');
    expect(content).toContain('NEW_KEY: z.string().optional(),');
  });

  it('should throw when no suitable insertion point found', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'fix-schema.ts');
    writeFileSync(schemaPath, `const x = 1;\n`, 'utf-8');

    const undeclared: EnvReference[] = [
      { key: 'KEY', file: '/src/a.ts', line: 1 },
    ];

    expect(() => fixSchema(schemaPath, undeclared)).toThrow(
      'Could not find a suitable location',
    );
  });

  it('should add trailing comma to previous line when missing', () => {
    setupTestDir();
    const schemaPath = join(TEST_DIR, 'fix-schema.ts');
    writeFileSync(
      schemaPath,
      `import { z } from 'zod';

export default {
  PORT: z.coerce.number().default(3000),
  DB_URL: z.string().url()
};
`,
      'utf-8',
    );

    const undeclared: EnvReference[] = [
      { key: 'NEW_VAR', file: '/src/a.ts', line: 1 },
    ];

    const added = fixSchema(schemaPath, undeclared);

    expect(added).toEqual(['NEW_VAR']);
    const content = readFileSync(schemaPath, 'utf-8');
    // DB_URL line should now have a trailing comma
    expect(content).toContain('DB_URL: z.string().url(),');
    expect(content).toContain('NEW_VAR: z.string().optional(),');
  });
});
