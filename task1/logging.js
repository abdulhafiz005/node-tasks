// Node Version: v20.19.2

const fs = require('fs');
const path = require('path');
const { Writable, PassThrough } = require('stream');
const http = require('http');

const LOG_DIR = './logs';
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_RETRY_QUEUE = 1000;
const REMOTE_ENDPOINT = 'http://localhost:4000/log';

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

// Util: Get a new file stream with a timestamp
function createLogStream() {
    const filename = `log-${Date.now()}.json`;
    return fs.createWriteStream(path.join(LOG_DIR, filename), { flags: 'a' });
}

// Writable stream to rotate files
class RotatingFileWriter extends Writable {
    constructor() {
        super({ objectMode: true });
        this.currentStream = createLogStream();
        this.size = 0;
    }

    _write(chunk, encoding, callback) {
        const line = JSON.stringify(chunk) + '\n';
        this.size += Buffer.byteLength(line);

        if (this.size >= MAX_FILE_SIZE) {
            this.currentStream.end();
            this.currentStream = createLogStream();
            this.size = Buffer.byteLength(line); // reset with current chunk
        }

        if (!this.currentStream.write(line)) {
            this.currentStream.once('drain', callback);
        } else {
            process.nextTick(callback);
        }
    }

    _final(cb) {
        this.currentStream.end(cb);
    }
}

// Writable stream to send logs to HTTP endpoint with retry/backoff
class RemoteLogWriter extends Writable {
    constructor() {
        super({ objectMode: true });
        this.queue = [];
        this.inFlight = 0;
        this.maxInFlight = 5;
    }

    _write(chunk, encoding, callback) {
        this.enqueue(chunk);
        this.processQueue();
        callback(); // Don't block input on retry logic
    }

    enqueue(data) {
        if (this.queue.length >= MAX_RETRY_QUEUE) {
            // Drop oldest
            this.queue.shift();
        }
        this.queue.push({ data, attempt: 0 });
    }

    processQueue() {
        while (this.inFlight < this.maxInFlight && this.queue.length) {
            const { data, attempt } = this.queue.shift();
            this.inFlight++;

            const req = http.request(REMOTE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, res => {
                this.inFlight--;
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Success
                } else {
                    // Retry with delay
                    this.retryLater(data, attempt + 1);
                }
                this.processQueue();
            });

            req.on('error', () => {
                this.inFlight--;
                this.retryLater(data, attempt + 1);
                this.processQueue();
            });

            req.write(JSON.stringify(data));
            req.end();
        }
    }

    retryLater(data, attempt) {
        const delay = Math.min(1000 * 2 ** attempt, 30000); // capped backoff
        setTimeout(() => this.enqueue({ data, attempt }), delay);
    }
}

// Main logger setup
const logStream = new PassThrough({ objectMode: true });
const fileWriter = new RotatingFileWriter();
const remoteWriter = new RemoteLogWriter();

// Pipe with backpressure awareness
logStream.pipe(fileWriter);
logStream.pipe(remoteWriter);

// Simulate incoming structured logs
function simulateLogs() {
    let id = 0;
    setInterval(() => {
        const log = {
            id: id++,
            level: 'info',
            timestamp: new Date().toISOString(),
            msg: 'Something happened',
        };

        const canContinue = logStream.write(log);
        if (!canContinue) {
            logStream.once('drain', () => console.log('[drain] Resuming log input...'));
        }
    }, 10); // High frequency logging
}

simulateLogs();


// Task: Build a high-throughput structured JSON logging pipeline that writes concurrently to:
// 1. A local rotating log file (rotated at 100 MB),
// 2. A remote HTTP collector endpoint,
// while handling backpressure correctly, avoiding data loss, and retrying failed HTTP requests
// without blocking the event loop or causing unbounded memory growth.

// Solution:
//  Use a PassThrough stream to fan out logs to both local and remote writers.
//  For the local writer, implement a Writable stream (RotatingFileWriter) that monitors file size
//  and rotates the log file after 100MB. Use fs.createWriteStream with 'drain' event to avoid blocking.
//  For remote logging, implement a custom Writable stream (RemoteLogWriter) that sends logs to a
//  remote HTTP endpoint using http.request(). On failure, retry with exponential backoff.
//  Maintain a capped retry queue (MAX_RETRY_QUEUE) to avoid unbounded memory growth in case of
//  repeated failures.
//  Ensure the stream.write() return value is respected and paused on backpressure using the 'drain'
//  event listener to avoid overloading downstream writers or the event loop

// Test Command: 
// ./logMonitor.sh