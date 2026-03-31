// Template literal bracket access (NoSubstitutionTemplateLiteral)
const val = process.env[`TEMPLATE_KEY`];

// Normal access for baseline
const port = process.env.PORT;

console.log(val, port);
