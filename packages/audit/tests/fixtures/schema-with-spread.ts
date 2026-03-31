import { z } from 'zod';

const base = {
  PORT: z.coerce.number(),
};

export default {
  ...base,
  DB_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production']),
};
