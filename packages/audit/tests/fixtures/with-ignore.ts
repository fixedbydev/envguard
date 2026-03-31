// This undeclared access should be flagged
const redis = process.env.REDIS_URL;

// This undeclared access should be IGNORED
const legacy = process.env.LEGACY_FLAG; // envguard-ignore

// This dynamic access should be IGNORED
const dyn = process.env[someVar]; // envguard-ignore

// Declared access (normal)
const port = process.env.PORT;

console.log(redis, legacy, dyn, port);
