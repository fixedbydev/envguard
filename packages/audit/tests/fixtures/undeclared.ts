// Uses REDIS_URL which is NOT in the schema
const redisUrl = process.env.REDIS_URL;

// Uses SECRET_KEY which is NOT in the schema
const secret = process.env['SECRET_KEY'];

// Uses PORT which IS in the schema
const port = process.env.PORT;

console.log(redisUrl, secret, port);
