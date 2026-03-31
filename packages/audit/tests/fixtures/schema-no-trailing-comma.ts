import { z } from 'zod';

export default {
  PORT: z.coerce.number().default(3000),
  DB_URL: z.string().url()
};
