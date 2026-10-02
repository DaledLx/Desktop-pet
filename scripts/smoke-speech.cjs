// Electron integration check; isolated settings, no API or startup changes.
const { app, BrowserWindow, Tray, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const character = require('../src/character');
const out = path.resolve(__dirname, '../dist/speech-verification');
fs.mkdirSync(out, { recursive: true });
app.setPath('userData', fs.mkdtempSync(path.join(out, 'profile-')));
app.setLoginItemSettings = () => {};
BrowserWindow.prototype.show = function () {};
BrowserWindow.prototype.showInactive = function () { this.testVisible = true; };
const hide = BrowserWindow.prototype.hide;
BrowserWindow.prototype.hide = function () { this.testVisible = false; return hide.call(this); };
let menu;
const setMenu = Tray.prototype.setContextMenu;
Tray.prototype.setContextMenu = function (value) { menu = value; return setMenu.call(this, value); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const timer = setTimeout(() => finish(new Error('Timed out')), 25000);
function finish(error, checks) {
  clearTimeout(timer);
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(error ? { passed: false, error: error.stack } : { passed: true, checks }, null, 2));
  if (error) app.exit(1);
  else menu.items.find((item) => item.label === '退出桌宠').click();
}
require('../src/main');
app.whenReady().then(async () => {
  try {
    const main = BrowserWindow.getAllWindows()[0];
    // Simulate visible parent without disturbing the user's actual desktop.
    main.isVisible = () => true;
    if (main.webContents.isLoading()) await new Promise((resolve) => main.webContents.once('did-finish-load', resolve));
    const run = (code) => main.webContents.executeJavaScript(code, true);
    const area = screen.getPrimaryDisplay().workArea;
    await run('document.querySelector(".pet-wrap").style.animation = "none"');
    const cases = [];
    for (let size = 0; size < 3; size += 1) {
      menu.items.find((item) => item.label === '大小').submenu.items[size].click();
      for (const chat of [false, true]) {
        await run(`window.desktopPet.setChatPanelOpen(${chat}); document.querySelector('.pet-stage').classList.toggle('chat-open', ${chat})`);
        await wait(100);
        for (const side of ['left', 'right', 'above']) {
          const width = main.getBounds().width;
          main.setPosition(side === 'left' ? area.x + 10 : area.x + area.width - width - 10, area.y + (side === 'above' ? 180 : 20));
          await run(`window.desktopPet.showSpeech(${JSON.stringify(character.doubleClickLine)})`);
          await wait(150);
          const speech = BrowserWindow.getAllWindows().find((win) => win !== main);
          assert.ok(speech?.testVisible, 'Bubble should appear');
          const a = main.getBounds(); const b = speech.getBounds();
          const pet = await run(`(() => { const r = document.querySelector('.pet').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
          const p = { x: a.x + pet.x, y: a.y + pet.y, width: pet.width, height: pet.height };
          assert.ok(b.x + b.width <= p.x || b.x >= p.x + p.width || b.y + b.height <= p.y - 8 || b.y >= p.y + p.height, 'No overlap with character');
          if (side === 'above') {
            assert.ok(b.y + b.height <= p.y - 8, 'Bubble must stay above the hair');
            assert.ok(Math.abs(b.x + b.width / 2 - (p.x + p.width / 2)) < 2, 'Bubble centered on character, not AI panel');
          }
          assert.ok(b.x >= area.x && b.y >= area.y && b.x + b.width <= area.x + area.width && b.y + b.height <= area.y + area.height, 'Bubble stays on screen');
          assert.equal(await speech.webContents.executeJavaScript('document.querySelector("#line").textContent'), character.doubleClickLine);
          assert.ok(await speech.webContents.executeJavaScript('document.querySelector("#line").getBoundingClientRect().bottom <= innerHeight'), 'Text fits bubble');
          assert.equal(speech.isFocusable(), false);
          assert.equal(speech.webContents.getLastWebPreferences().contextIsolation, true);
          assert.equal(main.getBounds().width, width, 'Speech must not resize the pet');
          cases.push({ size, chat, side, main: a, speech: b });
        }
      }
    }
    // Check following a move, hiding together and automatic dismissal.
    const speech = BrowserWindow.getAllWindows().find((win) => win !== main);
    const old = speech.getBounds();
    const m = main.getBounds(); main.setPosition(m.x - 15, m.y + 15);
    await wait(100);
    assert.notDeepEqual(speech.getBounds(), old);
    main.emit('hide');
    assert.equal(speech.testVisible, false);
    await run(`window.desktopPet.showSpeech(${JSON.stringify(character.lines[0])})`);
    await wait(100);
    fs.writeFileSync(path.join(out, 'bubble.png'), (await speech.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(out, 'pet.png'), (await main.webContents.capturePage()).toPNG());
    await wait(5800);
    assert.equal(speech.testVisible, false, 'Bubble dismisses automatically');
    finish(null, { cases, followsMove: true, hidesWithParent: true, dismisses: true, noFocus: true });
  } catch (error) { finish(error); }
});
