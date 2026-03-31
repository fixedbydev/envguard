import { Command } from 'commander';
import { checkCommand } from './commands/check.js';
import { diffCommand } from './commands/diff.js';
import { maskCommand } from './commands/mask.js';
import { fixCommand } from './commands/fix.js';
import { auditCommand } from './commands/audit.js';

const program = new Command();

program
  .name('env-guard')
  .description('CLI tool for validating and managing environment variables')
  .version('0.1.0');

program
  .command('check')
  .description('Validate environment variables against a schema')
  .option('--path <path>', 'Path to .env file', '.env')
  .option('--schema <path>', 'Path to schema file', './env.schema.ts')
  .action(checkCommand);

program
  .command('diff')
  .description('Show missing/extra keys between .env and .env.example')
  .option('--env <path>', 'Path to .env file', '.env')
  .option('--example <path>', 'Path to .env.example file', '.env.example')
  .action(diffCommand);

program
  .command('mask')
  .description('Print all env vars with sensitive values redacted')
  .option('--path <path>', 'Path to .env file', '.env')
  .action(maskCommand);

program
  .command('fix')
  .description('Append missing keys from .env.example to .env')
  .option('--path <path>', 'Path to .env file', '.env')
  .option('--example <path>', 'Path to .env.example file', '.env.example')
  .action(fixCommand);

program
  .command('audit')
  .description('Audit process.env usage against a schema file')
  .option('--dir <paths...>', 'Directories to scan', ['./src'])
  .option('--schema <path>', 'Path to schema file', './env.schema.ts')
  .option('--fix', 'Add undeclared keys to schema as z.string().optional()', false)
  .option('--json', 'Output results as JSON', false)
  .action(auditCommand);

program.parse();
