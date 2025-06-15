// Node Version: v20.19.2

const { Worker, isMainThread, parentPort } = require('worker_threads');
const os = require('os');
const path = require('path');

if (!isMainThread) {
  parentPort.on('message', (data) => {
    const start = Date.now();
    while (Date.now() - start < 50); // Simulate CPU work
    parentPort.postMessage(`processed:${data}`);
  });
  return;
}

const poolSize = os.cpus().length - 1;
const workers = [];
const queue = [];

for (let i = 0; i < poolSize; i++) spawnWorker();

function spawnWorker() {
  const worker = new Worker(__filename);
  worker.busy = false;

  worker.on('message', result => {
    worker.busy = false;
    worker.resolve?.(result);
    worker.resolve = worker.reject = null;
    dispatch();
  });

  worker.on('error', err => {
    worker.reject?.(err);
    removeWorker(worker);
    spawnWorker();
    dispatch();
  });

  worker.on('exit', code => {
    if (code !== 0) worker.reject?.(new Error(`Exit ${code}`));
    removeWorker(worker);
    spawnWorker();
    dispatch();
  });

  workers.push(worker);
}

function removeWorker(w) {
  const idx = workers.indexOf(w);
  if (idx !== -1) workers.splice(idx, 1);
}

function dispatch() {
  if (!queue.length) return;
  const free = workers.find(w => !w.busy);
  if (!free) return;
  const { data, resolve, reject } = queue.shift();
  free.busy = true;
  free.resolve = resolve;
  free.reject = reject;
  free.postMessage(data);
}

function runJob(data) {
  return new Promise((resolve, reject) => {
    queue.push({ data, resolve, reject });
    dispatch();
  });
}

// --- Benchmark 100 jobs ---
const total = 100;
let done = 0, latencies = [], start = Date.now();

for (let i = 0; i < total; i++) {
  const t0 = Date.now();
  runJob(`img-${i}`).then(result => {
    const latency = Date.now() - t0;
    latencies.push(latency);
    console.log(`${++done}/${total}: ${result} (${latency}ms)`);
    if (done === total) {
      const totalTime = Date.now() - start;
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      console.log(`\nAll done in ${totalTime}ms`);
      console.log(`Avg latency: ${avg.toFixed(2)}ms`);
      workers.forEach(w => w.terminate());
    }
  });
}


// Problem:
// Under concurrent load, spawning a new Worker thread for each request causes CPU spikes and
// stalls the main thread. Performance degrades sharply as concurrency increases.

// Reason:
// Creating a new Worker for each image processing call adds significant overhead:
// - Each Worker runs in its own thread, incurs memory & CPU setup costs.
// - Node’s main thread spends time managing thread lifecycle (create, init, exit).
// - With many simultaneous requests, you quickly exceed the optimal number of threads,
//   causing contention, queuing, GC pressure, and degraded performance.

// Task:
// i. Explain why spawning a new Worker per request doesn’t scale:
//    - Worker creation is expensive (thread spawn + setup).
//    - Exceeds available cores → context switching, thrashing.
//    - No reuse = wasted resources per request.
//    - Main thread gets overwhelmed managing workers, stalls I/O.

// ii. Design and implement a thread pool (no external libraries):
//     - Pre-spawn `os.cpus().length - 1` Workers.
//     - Maintain a queue of pending jobs.
//     - Dispatch jobs only when a Worker is free.
//     - Return results via Promises for clean integration.

// iii. Benchmark throughput and latency:
//     - Use `benchmark.js`, `autocannon`, or custom `setInterval` for load generation.
//     - Measure:
//        - Requests per second (throughput).
//        - Time per request (latency).
//     - Compare naive vs pooled implementation under the same load to quantify improvement.
