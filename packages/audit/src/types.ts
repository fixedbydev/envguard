/** A reference to `process.env.X` found in source code. */
export interface EnvReference {
  /** The environment variable key (e.g. `"PORT"`). */
  key: string;
  /** Absolute path of the source file. */
  file: string;
  /** 1-based line number. */
  line: number;
}

/** A dynamic `process.env[expr]` access that cannot be statically resolved. */
export interface UnsafeAccess {
  /** The raw expression text inside the brackets. */
  expression: string;
  /** Absolute path of the source file. */
  file: string;
  /** 1-based line number. */
  line: number;
}

/** Result of an audit run. */
export interface AuditResult {
  /** Keys used in code but not declared in the schema. */
  undeclared: EnvReference[];
  /** Keys declared in the schema but never referenced in code. */
  unused: string[];
  /** Dynamic `process.env[variable]` accesses that need manual review. */
  unsafe: UnsafeAccess[];
}

/** Options for the `audit()` function. */
export interface AuditOptions {
  /** Directories to scan. Defaults to `['./src']`. */
  dir?: string | string[];
  /** Path to the schema file exporting Zod shapes. */
  schema: string;
  /** File glob patterns to include. Defaults to `['**\/*.ts', '**\/*.tsx', '**\/*.js', '**\/*.jsx']`. */
  include?: string[];
  /** File glob patterns to exclude. Defaults to `['**\/node_modules/**', '**\/dist/**']`. */
  exclude?: string[];
}
