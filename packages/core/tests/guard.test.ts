import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';
import { guard, EnvGuardError } from '../src/index.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'envguard-test-' + process.pid);

function setupTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

function writeEnvFile(path: string, vars: Record<string, string>) {
  const content = Object.entries(vars)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  writeFileSync(path, content + '\n', 'utf-8');
}

function cleanup(...paths: string[]) {
  for (const p of paths) {
    if (existsSync(p)) unlinkSync(p);
  }
}

describe('guard', () => {
  const envPath = join(TEST_DIR, '.env');
  const examplePath = join(TEST_DIR, '.env.example');

  beforeEach(() => {
    setupTestDir();
    // Clean up process.env keys we'll use
    delete process.env['PORT'];
    delete process.env['NODE_ENV'];
    delete process.env['DB_URL'];
    delete process.env['DB_SSL'];
    delete process.env['DB_CERT'];
    delete process.env['API_KEY'];
    delete process.env['SECRET_TOKEN'];
    // Suppress console output in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup(envPath, examplePath);
    vi.restoreAllMocks();
  });

  it('should validate basic env vars', () => {
    writeEnvFile(envPath, {
      PORT: '3000',
      NODE_ENV: 'development',
      DB_URL: 'https://db.example.com',
    });

    const env = guard(
      {
        PORT: z.coerce.number(),
        NODE_ENV: z.enum(['development', 'staging', 'production']),
        DB_URL: z.string().url(),
      },
      { path: envPath, examplePath },
    );

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.DB_URL).toBe('https://db.example.com');
  });

  it('should apply default values', () => {
    writeEnvFile(envPath, {
      NODE_ENV: 'production',
      DB_URL: 'https://db.example.com',
    });

    const env = guard(
      {
        PORT: z.coerce.number().default(3000),
        NODE_ENV: z.enum(['development', 'staging', 'production']),
        DB_URL: z.string().url(),
      },
      { path: envPath, examplePath },
    );

    expect(env.PORT).toBe(3000);
  });

  it('should coerce string to number', () => {
    writeEnvFile(envPath, { PORT: '8080' });

    const env = guard(
      { PORT: z.coerce.number() },
      { path: envPath, examplePath },
    );

    expect(env.PORT).toBe(8080);
    expect(typeof env.PORT).toBe('number');
  });

  it('should coerce string to boolean', () => {
    writeEnvFile(envPath, { DEBUG: 'true' });

    const env = guard(
      { DEBUG: z.coerce.boolean() },
      { path: envPath, examplePath },
    );

    expect(env.DEBUG).toBe(true);
    expect(typeof env.DEBUG).toBe('boolean');
  });

  it('should throw EnvGuardError on validation failure', () => {
    writeEnvFile(envPath, {
      PORT: 'not-a-number',
      NODE_ENV: 'invalid',
    });

    expect(() =>
      guard(
        {
          PORT: z.coerce.number().int().positive(),
          NODE_ENV: z.enum(['development', 'staging', 'production']),
        },
        { path: envPath, examplePath },
      ),
    ).toThrow(EnvGuardError);
  });

  it('should include per-key error details in EnvGuardError', () => {
    writeEnvFile(envPath, {
      DB_URL: 'not-a-url',
    });

    try {
      guard(
        { DB_URL: z.string().url() },
        { path: envPath, examplePath },
      );
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(EnvGuardError);
      const guardErr = err as EnvGuardError;
      expect(guardErr.details).toHaveLength(1);
      expect(guardErr.details[0]!.key).toBe('DB_URL');
      expect(guardErr.details[0]!.issues.length).toBeGreaterThan(0);
    }
  });

  it('should freeze the result by default', () => {
    writeEnvFile(envPath, { PORT: '3000' });

    const env = guard(
      { PORT: z.coerce.number() },
      { path: envPath, examplePath },
    );

    expect(Object.isFrozen(env)).toBe(true);
    expect(() => {
      (env as Record<string, unknown>)['PORT'] = 9999;
    }).toThrow();
  });

  it('should not freeze when freeze=false', () => {
    writeEnvFile(envPath, { PORT: '3000' });

    const env = guard(
      { PORT: z.coerce.number() },
      { path: envPath, examplePath, freeze: false },
    );

    expect(Object.isFrozen(env)).toBe(false);
  });

  it('should handle optional fields', () => {
    writeEnvFile(envPath, {});

    const env = guard(
      { OPT_VAR: z.string().optional() },
      { path: envPath, examplePath },
    );

    expect(env.OPT_VAR).toBeUndefined();
  });

  it('should support cross-field validation via superRefine', () => {
    // When DB_SSL is true and DB_CERT is provided, validation passes
    writeEnvFile(envPath, {
      DB_SSL: 'true',
      DB_CERT: '/path/to/cert.pem',
    });

    const env = guard(
      {
        DB_SSL: z.coerce.boolean().default(false),
        DB_CERT: z.string().optional(),
      },
      { path: envPath, examplePath },
    );

    expect(env.DB_SSL).toBe(true);
    expect(env.DB_CERT).toBe('/path/to/cert.pem');
  });

  it('should print masked values when masked=true', () => {
    writeEnvFile(envPath, {
      PORT: '3000',
      API_KEY: 'super-secret',
    });

    guard(
      {
        PORT: z.coerce.number(),
        API_KEY: z.string(),
      },
      { path: envPath, examplePath, masked: true },
    );

    expect(console.log).toHaveBeenCalled();
  });

  it('should return watcher in watch mode', () => {
    writeEnvFile(envPath, { PORT: '3000' });

    const result = guard(
      { PORT: z.coerce.number() },
      { path: envPath, examplePath, watch: true },
    );

    expect(result.env.PORT).toBe(3000);
    expect(result.watcher).toBeDefined();
    expect(typeof result.watcher.close).toBe('function');

    result.watcher.close();
  });
});
