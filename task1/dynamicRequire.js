// Node Version: v20.19.2

const path = require('path');
const fs = require('fs');

function loadPlugin(name) {
  const pluginPath = require.resolve(`./plugins/${name}.js`);

  // If plugin was previously loaded, run its cleanup hook first
  const oldPlugin = require.cache[pluginPath]?.exports;
  if (oldPlugin && typeof oldPlugin.unload === 'function') {
    oldPlugin.unload();
  }

  // Clear module cache and reload
  delete require.cache[pluginPath];
  return require(pluginPath);
}


// Initial load
loadPlugin('testPlugin');

// Reload after 3 seconds (simulating plugin update)
setTimeout(() => {
  console.log('Reloading plugin...');
  loadPlugin('testPlugin');
}, 3000);

// Exit after 7 seconds
setTimeout(() => {
  console.log('Exiting...');
  process.exit(0);
}, 7000);

// Problem: On plugin update, stale plugin functions continue running and memory usage grows.
// Reason: Simply deleting from 'require.cache' removes the module's reference,
//         but it does not clean up side effects like event listeners, timers, or native bindings.
// Solution: Add a cleanup interface in plugins e.g. 'module.exports.unload' that explicitly clears timers, listeners, before re-requiring the plugin.