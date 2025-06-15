// Node Version: v20.19.2

const EventEmitter = require('events');
const fs = require('fs');

class FileWatcher extends EventEmitter {
    constructor() {
        super();
        this.watcher = null;
    }

    watch(path) {
        if (this.watcher) return; // Don't rewatch if already watching

        this.watcher = fs.watch(path, () => {
            this.emit('fileChanged', path);
        });

        this.watcher.on('error', (err) => {
            console.error('Watcher error:', err);
            this.watcher.close();
            this.watcher = null;
        });
    }

    close() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}

const watcher = new FileWatcher();
watcher.watch('app.log'); // Just call once

watcher.on('fileChanged', (p) => {
    console.log(`${p} changed`);
});

// Problem: Memory usage grows continuously over time and the program may eventually crash or slow down.

// Reason: A new fs.watch stream is created every second inside setInterval. Each stream registers a new 'change' listener
// on the same file without removing or closing previous watchers. Over time, this causes too many open file handles
// and too many event listeners, leading to memory leaks and resource exhaustion.

// Solution: Only create one watcher per file and reuse it. Avoid registering multiple fs.watch instances by tracking
// the existing watcher and closing it before creating a new one if needed.