// Non-standard structure that only the regex fallback can parse
const config = someBuilder()
  .add('REGEX_PORT': z.coerce.number())
  .add('REGEX_HOST': z.string())
  .build();

export default config;
