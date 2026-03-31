import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { EnvGuardModule } from '../src/env-guard.module.js';
import { EnvGuardService } from '../src/env-guard.service.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TEST_DIR = join(tmpdir(), 'envguard-nest-test-' + process.pid);

function setupTestDir() {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
}

describe('EnvGuardModule', () => {
  const envPath = join(TEST_DIR, '.env');
  const examplePath = join(TEST_DIR, '.env.example');

  beforeEach(() => {
    setupTestDir();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Set env vars directly for testing
    process.env['PORT'] = '3000';
    process.env['DB_URL'] = 'https://db.example.com';
    writeFileSync(envPath, 'PORT=3000\nDB_URL=https://db.example.com\n', 'utf-8');
    writeFileSync(examplePath, 'PORT=\nDB_URL=\n', 'utf-8');
  });

  it('should register with forRoot and provide EnvGuardService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvGuardModule.forRoot({
          schema: {
            PORT: z.coerce.number().default(3000),
            DB_URL: z.string().url(),
          },
          options: { path: envPath, examplePath },
        }),
      ],
    }).compile();

    const service = moduleRef.get(EnvGuardService);
    expect(service).toBeDefined();
    expect(service.get('PORT')).toBe(3000);
    expect(service.get('DB_URL')).toBe('https://db.example.com');

    await moduleRef.close();
  });

  it('should expose getAll() on EnvGuardService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvGuardModule.forRoot({
          schema: {
            PORT: z.coerce.number().default(3000),
          },
          options: { path: envPath, examplePath },
        }),
      ],
    }).compile();

    const service = moduleRef.get(EnvGuardService);
    const all = service.getAll();
    expect(all).toHaveProperty('PORT', 3000);

    await moduleRef.close();
  });

  it('should register with forRootAsync', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvGuardModule.forRootAsync({
          useFactory: () => ({
            schema: {
              PORT: z.coerce.number().default(3000),
            },
            options: { path: envPath, examplePath },
          }),
        }),
      ],
    }).compile();

    const service = moduleRef.get(EnvGuardService);
    expect(service).toBeDefined();
    expect(service.get('PORT')).toBe(3000);

    await moduleRef.close();
  });

  it('should throw on invalid env', () => {
    // Write invalid value to the env file so dotenv loads it
    writeFileSync(envPath, 'DB_URL=not-a-url\n', 'utf-8');
    delete process.env['DB_URL'];

    expect(() =>
      EnvGuardModule.forRoot({
        schema: {
          DB_URL: z.string().url(),
        },
        options: { path: envPath, examplePath },
      }),
    ).toThrow();
  });
});
