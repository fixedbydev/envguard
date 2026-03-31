// Declared: PORT, NODE_ENV
const port = process.env.PORT;
const env = process.env.NODE_ENV;

// Undeclared: API_SECRET, CACHE_TTL
const apiSecret = process.env.API_SECRET;
const cacheTtl = process.env['CACHE_TTL'];

// Dynamic access
const configKey = 'SOME_CONFIG';
const config = process.env[configKey];

console.log(port, env, apiSecret, cacheTtl, config);
