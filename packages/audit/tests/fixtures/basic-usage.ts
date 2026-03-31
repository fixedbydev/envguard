// Uses PORT and DB_URL (declared in schema)
const port = process.env.PORT;
const dbUrl = process.env.DB_URL;

// Uses NODE_ENV with bracket notation (declared)
const nodeEnv = process.env['NODE_ENV'];

console.log(port, dbUrl, nodeEnv);
