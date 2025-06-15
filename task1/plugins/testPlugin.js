let intervalId = setInterval(() => {
  console.log('testPlugin is running...');
}, 1000);

function unload() {
  clearInterval(intervalId);
  console.log('testPlugin unloaded');
}

module.exports = {
  unload
};