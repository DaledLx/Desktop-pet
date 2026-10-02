const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopPet', {
  getState: () => ipcRenderer.invoke('get-state'),
  getModelSettings: () => ipcRenderer.invoke('get-model-settings'),
  saveModelSettings: (payload) => ipcRenderer.invoke('save-model-settings', payload),
  listModels: (payload) => ipcRenderer.invoke('list-models', payload),
  askModel: (payload) => ipcRenderer.invoke('ask-model', payload),
  showSpeech: (text) => ipcRenderer.send('show-speech', text),
  setChatPanelOpen: (value) => ipcRenderer.send('set-chat-panel-open', Boolean(value)),
  onOpenModelSettings: (callback) => ipcRenderer.on('open-model-settings', (_event, state) => callback(state)),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', Boolean(value)),
  setIgnoreMouseEvents: (value) => ipcRenderer.send('set-ignore-mouse-events', Boolean(value)),
  setOpenAtLogin: (value) => ipcRenderer.send('set-open-at-login', Boolean(value)),
  quit: () => ipcRenderer.send('quit-app'),
  dragWindow: (payload) => ipcRenderer.send('drag-window', payload),
  onStateUpdated: (callback) => ipcRenderer.on('state-updated', (_event, state) => callback(state)),
});
