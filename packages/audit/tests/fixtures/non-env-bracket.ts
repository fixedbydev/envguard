// Non-process.env bracket access (should be ignored by scanner)
const arr = ['a', 'b', 'c'];
const first = arr[0];

const obj: Record<string, string> = {};
const val = obj['key'];

// This IS process.env access
const port = process.env.PORT;

console.log(first, val, port);
