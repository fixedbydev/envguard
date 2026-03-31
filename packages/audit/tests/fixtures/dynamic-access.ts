// Dynamic access — cannot be statically resolved
const key = 'SOME_KEY';
const value = process.env[key];

// Another dynamic access
function getEnv(name: string) {
  return process.env[name];
}

// Static access is fine
const port = process.env.PORT;

console.log(value, getEnv('test'), port);
