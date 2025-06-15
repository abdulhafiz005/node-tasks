// Node Version: v20.19.2

const cluster = require('cluster');
const http = require('http');
const os = require('os');

const WORKER_COUNT = os.cpus().length;

if (cluster.isMaster) {
    // Fork workers
    for (let i = 0; i < WORKER_COUNT; i++) cluster.fork();

    // Handle SIGTERM from Kubernetes
    process.on('SIGTERM', () => {
        console.log('Master received SIGTERM. Shutting down workers...');
        for (const id in cluster.workers) {
            cluster.workers[id].send('shutdown');
        }
    });

    // stop reforking if a worker dies
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} exited`);
    });

} else {
    const server = http.createServer((req, res) => {
        // Simulate heavy work
        setTimeout(() => {
            res.end(`Handled by PID ${process.pid}`);
        }, 1000);
    });

    server.listen(3000, () => {
        console.log(`Worker ${process.pid} listening`);
    });

    // Graceful shutdown logic
    let shuttingDown = false;

    process.on('message', (msg) => {
        if (msg === 'shutdown') {
            console.log(`Worker ${process.pid} shutting down...`);
            shuttingDown = true;

            server.close(() => {
                console.log(`Worker ${process.pid} has closed connections.`);
                process.exit(0);
            });

            // Failsafe: Force exit after 10s
            setTimeout(() => process.exit(1), 10000).unref();
        }
    });

    // also catch SIGTERM directly if Kubernetes sends it to workers too
    process.on('SIGTERM', () => process.emit('message', 'shutdown'));
}


// Test Command: 
// wrk -t4 -c20 -d60s http://localhost:3000/

// Task:
// When running a clustered Node.js server inside Kubernetes, `kubectl delete pod` causes
// in flight HTTP requests to be dropped and worker processes to be forcefully killed.
// Modify the master and worker logic so that:
// 1. The master process stops forking new workers and coordinates shutdown on SIGTERM.
// 2. Each worker gracefully stops accepting new connections, finishes ongoing requests, then exits.
// 3. This ensures zero-downtime rolling updates and no traffic loss.

// Solution:
//  In the master process:
//    Listen for SIGTERM and broadcast a 'shutdown' message to all workers.
//    Avoid process.exit() until all workers have exited (handled by default).
//  In each worker process:
//    On receiving the 'shutdown' message (or SIGTERM), call server.close() to stop accepting new connections.
//    Wait for existing in-flight requests to complete.
//    After finishing all requests, exit gracefully.
//    Add a timeout fallback (e.g., 10 seconds) to force exit if hanging.
//  This pattern ensures clean separation of concerns: the master coordinates, and workers shut down responsibly.

// Reason:
//  Kubernetes sends a SIGTERM to the main process during pod termination, followed by a SIGKILL if it doesn't
//   exit within the grace period (default 30s).
//  If the Node.js master or workers exit immediately or don’t handle SIGTERM properly, in flight requests are
//   cut off and clients may see errors.
//  Gracefully closing the server (`server.close`) prevents accepting new connections, allows current requests to
//   finish, and integrates well with Kubernetes readiness/liveness probes to ensure zero downtime.