// Node Version: v20.19.2
const { createHook } = require('async_hooks');

// let counter = 0;
const logs = [];

const hook = createHook({
    init(asyncId, type, triggerAsyncId) {
        // Reason: When calling console.log() inside an async_hooks hook init, before, after, 
        // it internally triggers new asynchronous operations like writing to stdout, which causes
        // init callback to be called again, which logs again and this recursively continues until the stack blows up.

        // console.log(`init: ${type} (id=${asyncId}, parent=${triggerAsyncId})`);
        logs.push(`init: ${type} (id=${asyncId}, parent=${triggerAsyncId})`);
    }
});

hook.enable();

function delayedIncrement(start) {
    return new Promise(resolve => {
        setTimeout(() => {
            // counter++;
            resolve(start);
        }, Math.random() * 100);
    });
}

async function main() {
    const results = await Promise.all([
        delayedIncrement(1),
        delayedIncrement(2),
        delayedIncrement(3)
    ]);

    logs.forEach(msg => console.log(msg));
    console.log('Final:', results);
}

main();

// Problem: Logs appear out of expected order and sometimes Final shows duplicate values.

// Reason: Each delayedIncrement() call runs setTimeout() and each waits a random number of 
// milliseconds up to 100 ms before incrementing and resolving so even though the calls happen in order, 
// the results arrive in whatever order finishes first. That's how Promise.all works and counter is shared 
// across all async executions and they all read the current counter value like 0 and they each increment it and may return the same value.

// Solution: Use the local variable insted of shared counter.