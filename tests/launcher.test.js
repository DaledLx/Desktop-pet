const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

for (const withPackage of [false, true]) {
  test(withPackage ? 'source launcher explains missing Node.js' : 'launcher explains incomplete extraction',
    { skip: process.platform !== 'win32' }, (t) => {
      const tempRoot = path.resolve(os.tmpdir());
      const folder = fs.mkdtempSync(path.join(tempRoot, 'moonlit-launcher-test-'));
      t.after(() => {
        if (path.dirname(path.resolve(folder)) !== tempRoot) throw new Error('Unsafe cleanup path');
        fs.rmSync(folder, { recursive: true });
      });
      fs.copyFileSync(path.join(__dirname, '..', '启动桌宠.cmd'), path.join(folder, '启动桌宠.cmd'));
      if (withPackage) fs.writeFileSync(path.join(folder, 'package.json'), '{}');
      const env = { ...process.env };
      for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
      env.PATH = path.join(process.env.SystemRoot, 'System32');
      const result = spawnSync(process.env.ComSpec, ['/d', '/c', '启动桌宠.cmd'], {
        cwd: folder, env, input: '\r\n', encoding: 'utf8', timeout: 10000, windowsHide: true,
      });
      assert.ifError(result.error);
      assert.equal(result.status, 1);
      assert.equal(result.stderr, '');
      assert.match(result.stdout, withPackage ? /Node.js LTS is required/ : /Extract the ENTIRE ZIP/);
      if (withPackage) assert.match(result.stdout, /MoonlitPet.exe/);
    });
}
