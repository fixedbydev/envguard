import { describe, it, expect, afterEach } from 'vitest';
import {
  parseEnvFile,
  parseKeys,
  maskDisplayValue,
  appendMissingKeys,
} from '../src/utils.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'envguard-cli-test-' + process.pid);

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

describe('parseEnvFile', () => {
  const envPath = join(TEST_DIR, '.env.parse');

  afterEach(() => cleanup(envPath));

  it('should parse key-value pairs', () => {
    setupTestDir();
    writeFileSync(envPath, 'PORT=3000\nDB_URL=postgres://localhost\n', 'utf-8');

    const result = parseEnvFile(envPath);

    expect(result.get('PORT')).toBe('3000');
    expect(result.get('DB_URL')).toBe('postgres://localhost');
  });

  it('should skip comments and blank lines', () => {
    setupTestDir();
    writeFileSync(envPath, '# Comment\nPORT=3000\n\n# Another\n', 'utf-8');

    const result = parseEnvFile(envPath);

    expect(result.size).toBe(1);
    expect(result.get('PORT')).toBe('3000');
  });

  it('should return empty map for nonexistent file', () => {
    const result = parseEnvFile(join(TEST_DIR, 'nonexistent'));
    expect(result.size).toBe(0);
  });
});

describe('parseKeys', () => {
  const envPath = join(TEST_DIR, '.env.keys');

  afterEach(() => cleanup(envPath));

  it('should return a set of keys', () => {
    setupTestDir();
    writeFileSync(envPath, 'PORT=3000\nDB_URL=test\n', 'utf-8');

    const keys = parseKeys(envPath);

    expect(keys.has('PORT')).toBe(true);
    expect(keys.has('DB_URL')).toBe(true);
    expect(keys.size).toBe(2);
  });
});

describe('maskDisplayValue', () => {
  it('should mask sensitive keys', () => {
    expect(maskDisplayValue('API_KEY', 'secret')).toBe('****');
    expect(maskDisplayValue('SECRET_TOKEN', 'val')).toBe('****');
  });

  it('should not mask non-sensitive keys', () => {
    expect(maskDisplayValue('PORT', '3000')).toBe('3000');
  });
});

describe('appendMissingKeys', () => {
  const envPath = join(TEST_DIR, '.env.append');

  afterEach(() => cleanup(envPath));

  it('should append missing keys', () => {
    setupTestDir();
    writeFileSync(envPath, 'PORT=3000\n', 'utf-8');

    appendMissingKeys(envPath, ['DB_URL', 'API_KEY']);

    const content = readFileSync(envPath, 'utf-8');
    expect(content).toContain('DB_URL=');
    expect(content).toContain('API_KEY=');
  });

  it('should create file if it does not exist', () => {
    setupTestDir();
    const newPath = join(TEST_DIR, '.env.new');

    appendMissingKeys(newPath, ['PORT']);

    const content = readFileSync(newPath, 'utf-8');
    expect(content).toContain('PORT=');

    cleanup(newPath);
  });

  it('should not write if no keys are missing', () => {
    setupTestDir();
    writeFileSync(envPath, 'PORT=3000\n', 'utf-8');

    appendMissingKeys(envPath, []);

    const content = readFileSync(envPath, 'utf-8');
    expect(content).toBe('PORT=3000\n');
  });
});
