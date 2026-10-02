const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
if (process.platform !== 'win32') throw new Error('请在 Windows 上构建 Windows 便携版。');
const runtime = path.join(root, 'node_modules', 'electron', 'dist');
const runtimeExe = path.join(runtime, 'electron.exe');
if (!fs.existsSync(runtimeExe)) throw new Error('缺少 Electron，请先运行 npm.cmd ci。');
const executable = fs.readFileSync(runtimeExe);
const peOffset = executable.readUInt32LE(0x3c);
const machine = executable.readUInt16LE(peOffset + 4);
const arch = { 0x8664: 'x64', 0xaa64: 'arm64', 0x14c: 'ia32' }[machine];
if (!arch) throw new Error('无法识别 Electron 的 Windows 架构。');

// Every build has its own directory; never copy the workspace or a user profile.
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const destination = fs.mkdtempSync(path.join(dist, `ClaudePet-win-${arch}-`));
fs.cpSync(runtime, destination, { recursive: true });
fs.renameSync(path.join(destination, 'electron.exe'), path.join(destination, 'ClaudePet.exe'));
fs.unlinkSync(path.join(destination, 'resources', 'default_app.asar'));
const appDir = path.join(destination, 'resources', 'app');
fs.mkdirSync(appDir, { recursive: true });
// Explicit file list prevents settings, old archives, logs and test data leaking into releases.
const appFiles = [
  'src/main.js', 'src/model-client.js', 'src/preload.js', 'src/renderer.js',
  'src/index.html', 'src/styles.css', 'src/character.js', 'src/speech.html', 'src/speech-preload.js',
  'assets/claude-character.png', 'assets/claude-tray.png',
];
for (const name of appFiles) {
  const target = path.join(appDir, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, name), target);
}
const { name, version, description, main } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name, version, description, main }, null, 2));
fs.copyFileSync(path.join(root, '启动桌宠.cmd'), path.join(destination, '启动桌宠.cmd'));
fs.copyFileSync(path.join(root, 'README.md'), path.join(destination, 'README.md'));
fs.writeFileSync(path.join(destination, '使用说明.txt'), '\uFEFF' + [
  'Claude 桌宠 · Windows 便携版', '',
  '1. 先把整个 ZIP 解压到普通文件夹，不要在压缩包预览中直接运行。',
  '2. 双击 ClaudePet.exe。无需安装 Node.js 或 npm，无需下载启动依赖。',
  '3. 不要只复制 EXE；它需要同目录的 resources、locales、DLL 等文件。',
  '4. 退出：右键角色或系统托盘图标，选择“退出桌宠”。',
  '5. AI 对话需要网络，在“模型设置”中填写自己的地址、密钥并选择模型。',
  `适用运行环境：Windows 10/11，${arch} 架构。`,
  '本包没有包含构建者的个人设置或密钥；首次启动使用默认设置。',
  '',
].join('\r\n'), 'utf8');

const zipPath = destination + '.zip';
const result = spawnSync('powershell.exe', [
  '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
  '-File', path.join(__dirname, 'zip-release.ps1'),
  '-Source', destination, '-Destination', zipPath,
], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error('ZIP 生成失败，已保留便携版目录供排查。');
console.log(JSON.stringify({ directory: destination, zip: zipPath, architecture: arch }, null, 2));
