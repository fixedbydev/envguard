import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncExample } from '../src/example-sync.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'envguard-sync-test-' + process.pid);

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

describe('syncExample', () => {
  const envPath = join(TEST_DIR, '.env');
  const examplePath = join(TEST_DIR, '.env.example');

  beforeEach(() => {
    setupTestDir();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(envPath, examplePath);
    vi.restoreAllMocks();
  });

  it('should detect missing keys', () => {
    writeFileSync(envPath, 'PORT=3000\n', 'utf-8');
    writeFileSync(examplePath, 'PORT=\nDB_URL=\n', 'utf-8');

    const result = syncExample(envPath, examplePath);

    expect(result.missing).toContain('DB_URL');
    expect(result.extra).toHaveLength(0);
  });

  it('should detect extra keys', () => {
    writeFileSync(envPath, 'PORT=3000\nEXTRA_VAR=foo\n', 'utf-8');
    writeFileSync(examplePath, 'PORT=\n', 'utf-8');

    const result = syncExample(envPath, examplePath);

    expect(result.missing).toHaveLength(0);
    expect(result.extra).toContain('EXTRA_VAR');
  });

  it('should report both missing and extra keys', () => {
    writeFileSync(envPath, 'PORT=3000\nEXTRA=foo\n', 'utf-8');
    writeFileSync(examplePath, 'PORT=\nDB_URL=\n', 'utf-8');

    const result = syncExample(envPath, examplePath);

    expect(result.missing).toContain('DB_URL');
    expect(result.extra).toContain('EXTRA');
  });

  it('should return empty arrays when in sync', () => {
    writeFileSync(envPath, 'PORT=3000\nDB_URL=postgres://localhost\n', 'utf-8');
    writeFileSync(examplePath, 'PORT=\nDB_URL=\n', 'utf-8');

    const result = syncExample(envPath, examplePath);

    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });

  it('should handle missing .env file', () => {
    writeFileSync(examplePath, 'PORT=\n', 'utf-8');

    const result = syncExample(
      join(TEST_DIR, 'nonexistent.env'),
      examplePath,
    );

    expect(result.missing).toContain('PORT');
  });

  it('should handle missing .env.example file', () => {
    writeFileSync(envPath, 'PORT=3000\n', 'utf-8');

    const result = syncExample(
      envPath,
      join(TEST_DIR, 'nonexistent.example'),
    );

    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });

  it('should skip comments and blank lines', () => {
    writeFileSync(
      envPath,
      '# Comment\nPORT=3000\n\n# Another comment\n',
      'utf-8',
    );
    writeFileSync(examplePath, '# Comment\nPORT=\n', 'utf-8');

    const result = syncExample(envPath, examplePath);

    expect(result.missing).toHaveLength(0);
    expect(result.extra).toHaveLength(0);
  });
});
