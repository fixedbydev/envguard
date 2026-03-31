export { audit } from './audit.js';
export { scan } from './scanner.js';
export { parseSchemaKeys } from './schema-parser.js';
export { fixSchema } from './fixer.js';
export { formatText, formatGitHub, formatJSON } from './reporter.js';
export type {
  AuditResult,
  AuditOptions,
  EnvReference,
  UnsafeAccess,
} from './types.js';
