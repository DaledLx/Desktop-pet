// Run with Electron, not Node. Uses isolated settings and an offline model stub.
const { app, BrowserWindow, Menu, Tray, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', 'claude-verification');
fs.mkdirSync(out, { recursive: true });
const profile = fs.mkdtempSync(path.join(out, 'profile-'));
app.setPath('userData', profile);
app.setLoginItemSettings = () => {}; // Never change the user's startup entry.
BrowserWindow.prototype.show = function () {}; // Keep verification off the desktop.
let trayMenu;
const setMenu = Tray.prototype.setContextMenu;
Tray.prototype.setContextMenu = function (menu) {
  trayMenu = menu;
  return setMenu.call(this, menu);
};
fs.writeFileSync(path.join(profile, 'settings.json'), JSON.stringify({
  x: 60, y: 60, apiModel: 'configured-test-model', openAtLogin: false,
}));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = setTimeout(() => {
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: false, error: 'Timed out' }));
  app.exit(1);
}, 25000);
require('../src/main.js');
app.whenReady().then(async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    const errors = [];
    win.webContents.on('console-message', (_event, level, message) => {
      if (level === 3) errors.push(message);
    });
    if (win.webContents.isLoading()) await new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
    await delay(350);
    const evaluate = (code) => win.webContents.executeJavaScript(code, true);
    assert.equal(await evaluate('document.title'), 'Claude 桌宠');
    assert.equal(await evaluate('document.querySelector(".pet").naturalWidth'), 937);
    assert.equal(await evaluate('document.querySelector("#model-chat-title").textContent'), 'configured-test-model');
    assert.equal(win.webContents.getLastWebPreferences().contextIsolation, true);
    assert.equal(win.webContents.getLastWebPreferences().nodeIntegration, false);
    assert.equal(win.webContents.getLastWebPreferences().sandbox, true);
    // Keep screenshots steady while checking the same loaded production UI.
    await evaluate('document.querySelector(".pet-wrap").style.animation = "none"');
    const geometry = await evaluate(`(() => {
      const pet = document.querySelector('.pet').getBoundingClientRect();
      const input = document.querySelector('#chat-form').getBoundingClientRect();
      return { petBottom: pet.bottom, inputTop: input.top };
    })()`);
    assert.ok(geometry.petBottom < geometry.inputTop, 'Input must stay below the feet');
    fs.writeFileSync(path.join(out, 'claude-idle.png'), (await win.webContents.capturePage()).toPNG());
    await evaluate('document.querySelector("#profile-button").click()');
    assert.equal(await evaluate('document.querySelector("#character-profile").open'), true);
    fs.writeFileSync(path.join(out, 'claude-profile.png'), (await win.webContents.capturePage()).toPNG());
    await evaluate('document.querySelector("#profile-close").click()');
    assert.equal(await evaluate('document.querySelector("#character-profile").open'), false);
    await evaluate('document.querySelector(".pet").dispatchEvent(new KeyboardEvent("keydown", {key:"Enter", bubbles:true}))');
    assert.match(await evaluate('document.querySelector(".speech").textContent'), /书签/);
    await evaluate('document.querySelector(".pet").dispatchEvent(new MouseEvent("dblclick", {bubbles:true}))');
    assert.match(await evaluate('document.querySelector(".speech").textContent'), /一枚书签/);
    const before = win.getBounds();
    await evaluate(`window.desktopPet.dragWindow({startX:10,startY:10,currentX:30,currentY:25,originX:${before.x},originY:${before.y}})`);
    await delay(150);
    assert.equal(win.getBounds().x, before.x + 20);
    assert.equal(win.getBounds().y, before.y + 15);
    assert.equal(win.getBounds().width, before.width);
    let requestCount = 0;
    ipcMain.removeHandler('ask-model');
    ipcMain.handle('ask-model', (_event, payload) => {
      assert.equal(payload.messages.filter((message) => message.role === 'system').length, 1);
      assert.match(payload.messages[0].content, /Claude · 克劳德/);
      requestCount += 1;
      return '离线验证回答：我们可以把这个问题分成几步，慢慢梳理。\n\n' + '这是一段用于检查长回答滚动与阅读空间的文字。\n'.repeat(30);
    });
    for (let i = 0; i < 2; i += 1) {
      await evaluate('document.querySelector("#chat-input").value="一起读书吧"; document.querySelector("#chat-form").requestSubmit()');
      await delay(350);
    }
    assert.equal(requestCount, 2);
    assert.equal(await evaluate('document.querySelector("#model-chat").hidden'), false);
    assert.equal(await evaluate('document.querySelector("#model-chat-title").textContent'), 'configured-test-model');
    const chatGeometry = await evaluate(`(() => {
      const pet = document.querySelector('.pet').getBoundingClientRect();
      const panel = document.querySelector('#model-chat').getBoundingClientRect();
      const answer = document.querySelector('#model-chat-answer');
      return { petLeft: pet.left, panelRight: panel.right, scrolls: answer.scrollHeight > answer.clientHeight };
    })()`);
    assert.ok(chatGeometry.panelRight <= chatGeometry.petLeft, 'Answer must not cover the pet');
    assert.ok(chatGeometry.scrolls, 'Long responses must scroll');
    await evaluate('document.querySelector(".speech").classList.remove("visible")');
    await delay(300);
    fs.writeFileSync(path.join(out, 'claude-chat.png'), (await win.webContents.capturePage()).toPNG());
    await evaluate('document.querySelector("#model-chat-close").click()');
    await delay(100);
    assert.equal(win.getBounds().width, before.width);
    const passThrough = trayMenu.items.find((item) => item.label === '鼠标穿透');
    passThrough.click({ checked: true });
    await delay(100);
    assert.equal(await evaluate('document.body.classList.contains("pass-through")'), true);
    trayMenu.items.find((item) => item.label === '鼠标穿透').click({ checked: false });
    await delay(100);
    assert.equal(await evaluate('document.body.classList.contains("pass-through")'), false);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({
      passed: true, geometry, chatGeometry, requests: requestCount,
      checks: ['transparent asset loaded', 'secure renderer', 'profile open/close', 'local dialogue', 'double click', 'drag IPC', 'persona in two model requests', 'configured model preserved', 'long reply scrolling', 'input below feet', 'reply beside pet', 'tray mouse-through recovery', 'tray quit'],
    }, null, 2));
    clearTimeout(deadline);
    trayMenu.items.find((item) => item.label === '退出桌宠').click();
  } catch (error) {
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ passed: false, error: error.stack }, null, 2));
    clearTimeout(deadline);
    app.exit(1);
  }
});
