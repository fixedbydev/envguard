import { describe, it, expect, vi } from 'vitest';
import { isSensitive, maskValue, printMasked, printErrors } from '../src/format.js';
import type { EnvErrorDetail } from '../src/error.js';
import { ZodIssueCode, type ZodIssue } from 'zod';

describe('isSensitive', () => {
  it('should detect SECRET in key name', () => {
    expect(isSensitive('MY_SECRET')).toBe(true);
    expect(isSensitive('secret_key')).toBe(true);
  });

  it('should detect KEY in key name', () => {
    expect(isSensitive('API_KEY')).toBe(true);
    expect(isSensitive('STRIPE_KEY')).toBe(true);
  });

  it('should detect TOKEN in key name', () => {
    expect(isSensitive('AUTH_TOKEN')).toBe(true);
    expect(isSensitive('JWT_TOKEN')).toBe(true);
  });

  it('should detect PASSWORD in key name', () => {
    expect(isSensitive('DB_PASSWORD')).toBe(true);
  });

  it('should detect PASS in key name', () => {
    expect(isSensitive('REDIS_PASS')).toBe(true);
  });

  it('should return false for non-sensitive keys', () => {
    expect(isSensitive('PORT')).toBe(false);
    expect(isSensitive('NODE_ENV')).toBe(false);
    expect(isSensitive('DB_URL')).toBe(false);
    expect(isSensitive('HOST')).toBe(false);
  });
});

describe('maskValue', () => {
  it('should mask sensitive values', () => {
    expect(maskValue('API_KEY', 'sk-123456')).toBe('****');
    expect(maskValue('SECRET_TOKEN', 'my-token')).toBe('****');
  });

  it('should not mask non-sensitive values', () => {
    expect(maskValue('PORT', '3000')).toBe('3000');
    expect(maskValue('NODE_ENV', 'production')).toBe('production');
  });
});

describe('printMasked', () => {
  it('should print env vars to console', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printMasked({ PORT: 3000, API_KEY: 'secret' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('printErrors', () => {
  it('should print error details to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const details: EnvErrorDetail[] = [
      {
        key: 'PORT',
        issues: [
          {
            code: ZodIssueCode.invalid_type,
            expected: 'number',
            received: 'string',
            message: 'Expected number, received string',
            path: ['PORT'],
          },
        ],
      },
    ];

    printErrors(details);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
