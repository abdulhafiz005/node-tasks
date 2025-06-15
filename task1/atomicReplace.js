// Node Version: v20.19.2

const fs = require('fs');

function replaceConfig(newData) {
    fs.writeFileSync('config.tmp', newData);
    // fs.unlinkSync('config.json');
    fs.renameSync('config.tmp', 'config.json'); // atomic replace
}


// Problem:
// Occasionally, other processes trying to read `/etc/myapp/config.json` throw an ENOENT error (file not found).

// Reason:
// The current `replaceConfig()` function deletes the original config file (`fs.unlinkSync`) before renaming the
// temporary file in its place. During this brief window between `unlinkSync()` and `renameSync()`, the file does not exist.
// Readers attempting to access it during this window receive ENOENT.

// Task:
// i. Identify the critical window:
//      The config file is missing between the `fs.unlinkSync('/etc/myapp/config.json')` and the `fs.renameSync()` call.
// ii. Implement a safe, atomic update of the file:
//      Do not delete the original file manually.
//      Instead, rely on `fs.renameSync()` directly from temp → final to atomically replace the file.
//      On POSIX systems (Linux/macOS), `fs.renameSync()` is atomic when replacing an existing file: readers never see a missing file.
// iii. Use file-watchers correctly:
//      Watch `config.json` with `fs.watchFile()` or `fs.watch()`.
//      On change, debounce and re-read the file after a short delay (e.g., 50–100ms) to ensure writes are complete.
//      Always handle errors when reading (e.g., file not ready yet) and retry or skip invalid data.


replaceConfig("testing data");