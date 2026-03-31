// Property access with envguard-ignore (covers scanner hasIgnoreComment on PropertyAccessExpression)
const ignored = process.env.IGNORED_PROP; // envguard-ignore

// Normal property access for baseline
const port = process.env.PORT;

console.log(ignored, port);
