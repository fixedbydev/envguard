import { describe, it, expect } from 'vitest';
import { EnvGuardError } from '../src/error.js';
import { ZodIssueCode } from 'zod';

describe('EnvGuardError', () => {
  it('should create an error with details', () => {
    const details = [
      {
        key: 'PORT',
        issues: [
          {
            code: ZodIssueCode.invalid_type as const,
            expected: 'number' as const,
            received: 'string' as const,
            message: 'Expected number, received string',
            path: ['PORT'],
          },
        ],
      },
    ];

    const error = new EnvGuardError(details);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EnvGuardError);
    expect(error.name).toBe('EnvGuardError');
    expect(error.details).toEqual(details);
    expect(error.message).toContain('PORT');
    expect(error.message).toContain('Expected number');
  });

  it('should include multiple key errors', () => {
    const details = [
      {
        key: 'PORT',
        issues: [
          {
            code: ZodIssueCode.invalid_type as const,
            expected: 'number' as const,
            received: 'string' as const,
            message: 'Invalid type',
            path: ['PORT'],
          },
        ],
      },
      {
        key: 'DB_URL',
        issues: [
          {
            code: ZodIssueCode.invalid_string as const,
            validation: 'url' as const,
            message: 'Invalid URL',
            path: ['DB_URL'],
          },
        ],
      },
    ];

    const error = new EnvGuardError(details);

    expect(error.details).toHaveLength(2);
    expect(error.message).toContain('PORT');
    expect(error.message).toContain('DB_URL');
  });
});
