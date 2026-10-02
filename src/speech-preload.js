const { ipcRenderer } = require('electron');

ipcRenderer.on('speech-text', (_event, text) => {
  document.querySelector('#line').textContent = text;
});
