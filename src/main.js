const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, screen, safeStorage } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { requestModel } = require('./model-client');

const defaultState = {
  x: null,
  y: null,
  alwaysOnTop: true,
  ignoreMouseEvents: false,
  openAtLogin: false,
  size: 'medium',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiModel: 'gpt-4o-mini',
  apiKeyEncrypted: '',
};

const sizePresets = {
  small: { label: '小（80%）', width: 312, height: 456 },
  medium: { label: '中（100%）', width: 390, height: 570 },
  large: { label: '大（120%）', width: 468, height: 684 },
};
// Reserve a dedicated column for the model panel so it can grow without
// covering the character. The character keeps its original right edge.
const chatPanelWidth = 360;

let state = { ...defaultState };
let mainWindow = null;
let tray = null;
let saveTimer = null;
let chatPanelOpen = false;

function statePath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readState() {
  try {
    const stored = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    state = { ...defaultState, ...stored };
    if (!sizePresets[state.size]) state.size = defaultState.size;
    if (typeof state.apiEndpoint !== 'string' || !state.apiEndpoint) state.apiEndpoint = defaultState.apiEndpoint;
    if (typeof state.apiModel !== 'string' || !state.apiModel) state.apiModel = defaultState.apiModel;
  } catch {
    state = { ...defaultState };
  }
}

function publicState() {
  const { apiKeyEncrypted, ...visibleState } = state;
  return { ...visibleState, apiConfigured: Boolean(apiKeyEncrypted) };
}

function decryptApiKey() {
  if (!state.apiKeyEncrypted || !safeStorage.isEncryptionAvailable()) return '';
  try {
    return safeStorage.decryptString(Buffer.from(state.apiKeyEncrypted, 'base64'));
  } catch {
    return '';
  }
}

function saveState() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(statePath()), { recursive: true });
      fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
      console.error('Unable to save settings:', error);
    }
  }, 80);
}

function notifyState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-updated', publicState());
  }
  updateTrayMenu();
}

function makeTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcd6ff"/><stop offset="1" stop-color="#8c7fd9"/></linearGradient></defs>
    <path d="M32 6 39 17l13 3-9 10 2 14-13-6-13 6 2-14-9-10 13-3Z" fill="url(#g)" stroke="#514b83" stroke-width="2"/>
    <circle cx="25" cy="31" r="3" fill="#514b83"/><circle cx="39" cy="31" r="3" fill="#514b83"/>
    <path d="M25 40c4 3 10 3 14 0" fill="none" stroke="#514b83" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function setAlwaysOnTop(value) {
  state.alwaysOnTop = Boolean(value);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(state.alwaysOnTop, 'floating');
  saveState();
  notifyState();
}

function setIgnoreMouseEvents(value) {
  state.ignoreMouseEvents = Boolean(value);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(state.ignoreMouseEvents, { forward: true });
  }
  saveState();
  notifyState();
}

function setOpenAtLogin(value) {
  state.openAtLogin = Boolean(value);
  applyLoginItemSettings();
  saveState();
  notifyState();
}

function applyLoginItemSettings() {
  const options = { openAtLogin: state.openAtLogin };
  if (process.defaultApp && process.argv[1]) {
    options.path = process.execPath;
    options.args = [path.resolve(process.argv[1])];
  }
  app.setLoginItemSettings(options);
}

function setModelSettings(payload = {}) {
  const endpoint = String(payload.endpoint || '').trim();
  const model = String(payload.model || '').trim();
  if (!endpoint.toLowerCase().startsWith('http://') && !endpoint.toLowerCase().startsWith('https://')) {
    throw new Error('API 地址必须以 http:// 或 https:// 开头。');
  }
  if (!model) throw new Error('模型名称不能为空。');
  state.apiEndpoint = endpoint;
  state.apiModel = model;
  if (payload.clearKey) {
    state.apiKeyEncrypted = '';
  } else if (String(payload.apiKey || '').trim()) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('当前 Windows 环境无法启用安全密钥存储。');
    state.apiKeyEncrypted = safeStorage.encryptString(String(payload.apiKey).trim()).toString('base64');
  }
  saveState();
  notifyState();
  return publicState();
}

async function askModel(payload = {}) {
  const apiKey = decryptApiKey();
  if (!apiKey) throw new Error('请先在“模型设置”中填写 API 密钥。');
  const messages = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
  if (!messages.length) throw new Error('没有可发送的对话内容。');
  return requestModel({ endpoint: state.apiEndpoint, model: state.apiModel, apiKey, messages });
}

function modelsEndpoint(endpoint) {
  const url = new URL(endpoint);
  const pathname = url.pathname.replace(/\/+$/, '');
  if (pathname.endsWith('/chat/completions')) {
    url.pathname = `${pathname.slice(0, -'/chat/completions'.length)}/models`;
  } else if (pathname.endsWith('/responses')) {
    url.pathname = `${pathname.slice(0, -'/responses'.length)}/models`;
  } else {
    url.pathname = `${pathname}/models`;
  }
  return url.toString();
}

async function listModels(payload = {}) {
  const endpoint = String(payload.endpoint || state.apiEndpoint).trim();
  const apiKey = String(payload.apiKey || '').trim() || decryptApiKey();
  if (!apiKey) throw new Error('请先填写 API 密钥。');
  let url;
  try {
    url = modelsEndpoint(endpoint);
  } catch {
    throw new Error('API 地址格式不正确。');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `模型列表请求失败（${response.status}）`);
    }
    const models = Array.isArray(data?.data)
      ? data.data.map((item) => (typeof item === 'string' ? item : item?.id)).filter(Boolean)
      : [];
    if (!models.length) throw new Error('接口没有返回可用模型。');
    return [...new Set(models)].sort((a, b) => a.localeCompare(b));
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('获取模型列表超时。');
    if (error.name === 'TypeError' && /fetch failed/i.test(error.message || '')) {
      let host = endpoint;
      try { host = new URL(endpoint).host; } catch { /* Keep the configured value for the error message. */ }
      throw new Error(`无法连接模型服务 ${host}。请检查网络、DNS、代理或 API 地址。`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function getSizePreset() {
  return sizePresets[state.size] || sizePresets.medium;
}

function setPetSize(size) {
  if (!sizePresets[size]) return;
  state.size = size;
  if (mainWindow && !mainWindow.isDestroyed()) {
    const oldBounds = mainWindow.getBounds();
    const next = sizePresets[size];
    const extraWidth = chatPanelOpen ? chatPanelWidth : 0;
    const extraHeight = chatPanelOpen ? 54 : 0;
    mainWindow.setBounds({
      x: oldBounds.x + oldBounds.width - next.width - extraWidth,
      y: chatPanelOpen ? oldBounds.y : oldBounds.y + oldBounds.height - next.height,
      width: next.width + extraWidth,
      height: next.height + extraHeight,
    });
  }
  saveState();
  notifyState();
}

function setChatPanelOpen(value) {
  chatPanelOpen = Boolean(value);
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const preset = getSizePreset();
  const nextWidth = preset.width + (chatPanelOpen ? chatPanelWidth : 0);
  const nextHeight = preset.height + (chatPanelOpen ? 54 : 0);
  const bounds = mainWindow.getBounds();
  const right = bounds.x + bounds.width;
  mainWindow.setBounds({
    x: right - nextWidth,
    y: bounds.y,
    width: nextWidth,
    height: nextHeight,
  });
}

function sizeMenuItems() {
  return Object.entries(sizePresets).map(([key, preset]) => ({
    label: preset.label,
    type: 'radio',
    checked: state.size === key,
    click: () => setPetSize(key),
  }));
}

function quitApp() {
  if (tray) tray.destroy();
  tray = null;
  app.quit();
}

function showContextMenu() {
  const menu = Menu.buildFromTemplate([
    { label: '模型设置', click: () => mainWindow?.webContents.send('open-model-settings', publicState()) },
    {
      label: '保持置顶',
      type: 'checkbox',
      checked: state.alwaysOnTop,
      click: (item) => setAlwaysOnTop(item.checked),
    },
    {
      label: '鼠标穿透',
      type: 'checkbox',
      checked: state.ignoreMouseEvents,
      click: (item) => setIgnoreMouseEvents(item.checked),
    },
    {
      label: '开机启动',
      type: 'checkbox',
      checked: state.openAtLogin,
      click: (item) => setOpenAtLogin(item.checked),
    },
    { label: '大小', submenu: sizeMenuItems() },
    { type: 'separator' },
    { label: '退出桌宠', click: quitApp },
  ]);
  menu.popup({ window: mainWindow });
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '显示/隐藏桌宠',
      click: () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
      },
    },
    { type: 'separator' },
    { label: '模型设置', click: () => mainWindow?.webContents.send('open-model-settings', publicState()) },
    { type: 'separator' },
    {
      label: '保持置顶', type: 'checkbox', checked: state.alwaysOnTop,
      click: (item) => setAlwaysOnTop(item.checked),
    },
    {
      label: '鼠标穿透', type: 'checkbox', checked: state.ignoreMouseEvents,
      click: (item) => setIgnoreMouseEvents(item.checked),
    },
    { label: '大小', submenu: sizeMenuItems() },
    {
      label: '开机启动', type: 'checkbox', checked: state.openAtLogin,
      click: (item) => setOpenAtLogin(item.checked),
    },
    { type: 'separator' },
    { label: '退出桌宠', click: quitApp },
  ]));
}

function createWindow() {
  const preset = getSizePreset();
  const bounds = { width: preset.width, height: preset.height };
  const display = screen.getPrimaryDisplay().workArea;
  const x = Number.isInteger(state.x) ? state.x : display.x + display.width - bounds.width - 34;
  const y = Number.isInteger(state.y) ? state.y : display.y + display.height - bounds.height - 28;
  state.x = x;
  state.y = y;
  saveState();

  mainWindow = new BrowserWindow({
    ...bounds,
    x,
    y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: state.alwaysOnTop,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.setIgnoreMouseEvents(state.ignoreMouseEvents, { forward: true });
  });
  mainWindow.on('move', () => {
    const position = mainWindow.getPosition();
    state.x = position[0];
    state.y = position[1];
    saveState();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  tray = new Tray(makeTrayIcon());
  tray.setToolTip('月影桌宠');
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
  updateTrayMenu();
}

function registerIpc() {
  ipcMain.handle('get-state', () => publicState());
  ipcMain.handle('get-model-settings', () => publicState());
  ipcMain.handle('save-model-settings', (_event, payload) => setModelSettings(payload));
  ipcMain.handle('list-models', (_event, payload) => listModels(payload));
  ipcMain.handle('ask-model', (_event, payload) => askModel(payload));
  ipcMain.on('set-chat-panel-open', (_event, value) => setChatPanelOpen(value));
  ipcMain.on('show-context-menu', showContextMenu);
  ipcMain.on('set-always-on-top', (_event, value) => setAlwaysOnTop(value));
  ipcMain.on('set-ignore-mouse-events', (_event, value) => setIgnoreMouseEvents(value));
  ipcMain.on('set-open-at-login', (_event, value) => setOpenAtLogin(value));
  ipcMain.on('quit-app', quitApp);
  ipcMain.on('drag-window', (_event, payload = {}) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const values = ['startX', 'startY', 'currentX', 'currentY', 'originX', 'originY']
      .map((key) => Number(payload[key]));
    if (!values.every(Number.isFinite)) return;
    const [startX, startY, currentX, currentY, originX, originY] = values;
    mainWindow.setPosition(
      Math.round(originX + currentX - startX),
      Math.round(originY + currentY - startY),
    );
  });
}

app.whenReady().then(() => {
  readState();
  applyLoginItemSettings();
  registerIpc();
  createWindow();
  createTray();
});

app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const position = mainWindow.getPosition();
    state.x = position[0];
    state.y = position[1];
    fs.mkdirSync(path.dirname(statePath()), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), 'utf8');
  }
});
