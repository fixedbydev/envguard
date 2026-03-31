import { describe, it, expect } from 'vitest';
import { formatText, formatGitHub, formatJSON } from '../src/reporter.js';
import type { AuditResult } from '../src/types.js';

const mockResult: AuditResult = {
  undeclared: [
    { key: 'REDIS_URL', file: '/project/src/db.ts', line: 5 },
    { key: 'SECRET_KEY', file: '/project/src/auth.ts', line: 12 },
  ],
  unused: ['UNUSED_VAR'],
  unsafe: [
    { expression: 'key', file: '/project/src/config.ts', line: 8 },
  ],
};

const emptyResult: AuditResult = {
  undeclared: [],
  unused: [],
  unsafe: [],
};

describe('formatText', () => {
  it('should format undeclared, unused, and unsafe sections', () => {
    const output = formatText(mockResult, '/project');

    expect(output).toContain('Undeclared');
    expect(output).toContain('REDIS_URL');
    expect(output).toContain('SECRET_KEY');
    expect(output).toContain('Unused');
    expect(output).toContain('UNUSED_VAR');
    expect(output).toContain('Dynamic access');
  });

  it('should show success message when clean', () => {
    const output = formatText(emptyResult);

    expect(output).toContain('All process.env accesses match the schema');
  });
});

describe('formatGitHub', () => {
  it('should emit ::error:: for undeclared vars', () => {
    const annotations = formatGitHub(mockResult, '/project');

    const errors = annotations.filter((a) => a.startsWith('::error'));
    expect(errors.length).toBe(2);
    expect(errors[0]).toContain('file=src/db.ts');
    expect(errors[0]).toContain('line=5');
    expect(errors[0]).toContain('UNDECLARED');
    expect(errors[0]).toContain('REDIS_URL');
  });

  it('should emit ::warning:: for unsafe accesses', () => {
    const annotations = formatGitHub(mockResult, '/project');

    const warnings = annotations.filter(
      (a) => a.startsWith('::warning file='),
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('DYNAMIC_ACCESS');
    expect(warnings[0]).toContain('config.ts');
  });

  it('should emit ::warning:: for unused keys', () => {
    const annotations = formatGitHub(mockResult, '/project');

    const unusedWarnings = annotations.filter(
      (a) => a.startsWith('::warning::UNUSED'),
    );
    expect(unusedWarnings.length).toBe(1);
    expect(unusedWarnings[0]).toContain('UNUSED_VAR');
  });

  it('should return empty array for clean results', () => {
    const annotations = formatGitHub(emptyResult);
    expect(annotations.length).toBe(0);
  });
});

describe('formatJSON', () => {
  it('should produce valid JSON with all sections', () => {
    const json = formatJSON(mockResult, '/project');
    const parsed = JSON.parse(json);

    expect(parsed.undeclared).toHaveLength(2);
    expect(parsed.undeclared[0].key).toBe('REDIS_URL');
    expect(parsed.undeclared[0].file).toBe('src/db.ts');
    expect(parsed.undeclared[0].line).toBe(5);

    expect(parsed.unused).toEqual(['UNUSED_VAR']);

    expect(parsed.unsafe).toHaveLength(1);
    expect(parsed.unsafe[0].expression).toBe('key');

    expect(parsed.summary).toEqual({
      undeclared: 2,
      unused: 1,
      unsafe: 1,
    });
  });

  it('should produce clean JSON for empty results', () => {
    const json = formatJSON(emptyResult);
    const parsed = JSON.parse(json);

    expect(parsed.undeclared).toHaveLength(0);
    expect(parsed.unused).toHaveLength(0);
    expect(parsed.unsafe).toHaveLength(0);
    expect(parsed.summary).toEqual({
      undeclared: 0,
      unused: 0,
      unsafe: 0,
    });
  });
});
