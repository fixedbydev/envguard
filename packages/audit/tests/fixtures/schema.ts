import { z } from 'zod';

export default {
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DB_URL: z.string().url(),
  UNUSED_KEY: z.string().optional(),
};
