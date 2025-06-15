// Node Version: v20.19.2

const assert = require('assert');
const fetch = require('node-fetch');
let server;

describe('API', () => {
  before(() => {
    server = require('../app').listen(4000);
  });

  after(() => {
    server.close();
  });

  it('should fetch user', async () => {
    const res = await fetch('http://localhost:4000/user/123');
    assert.equal(res.status, 200);
  });

  it('should fetch settings', async () => {
    const res = await fetch('http://localhost:4000/settings/abc');
    assert.equal(res.status, 200);
  });
});


// Problem: Tests sometimes hang or fail with "done() called multiple times".
// Reason: Mixing promise chains with the 'done()' callback can cause unpredictable behavior
//         if both 'then()' and 'catch()' call 'done()', it gets called twice.
// Solution: Use a consistent promise-based async/await test style to avoid mixing control flows.