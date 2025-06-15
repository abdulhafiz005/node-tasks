// Node Version: v20.19.2

const _ = require('lodash');


function isUnsafeKey(key) {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

function safeMerge(target, source) {
  return _.mergeWith(target, source, (objVal, srcVal, key) => {
    if (isUnsafeKey(key)) return objVal;
  });
}

// Default config
const defaults = { secure: true };

// Simulated user input with malicious prototype pollution
const userInput = JSON.parse(`{
  "theme": "dark",
  "__proto__": { "polluted": true }
}`);

// Run safe merge
const merged = safeMerge({}, defaults);
safeMerge(merged, userInput);

console.log('Merged result:', merged);
console.log('Polluted prototype?', {}.polluted);


// Problem: Accepting user-supplied objects can lead to prototype pollution when using _.merge()
// Reason: Keys like "__proto__", "constructor", and "prototype" can mutate the global Object prototype
//         if merged directly, allowing attackers to inject unexpected properties into all objects.
// Solution: Use _.mergeWith() and skip dangerous keys during merging to prevent unsafe prototype extension.
// Add unit tests to assert no prototype pollution occurs via __proto__, constructor, or prototype