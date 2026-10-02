# DeepSeek Whale Desktop Pet

<img src="assets/character-transparent.png" alt="DeepSeek whale-girl desktop pet" width="280">

A lightweight Windows 10/11 Electron desktop pet featuring a DeepSeek-inspired whale character. The app uses a borderless transparent window that stays on top and can be dragged around the desktop. Click or double-click the character for local lines and visual feedback; click the small whale for another interaction. Right-click the character or use the system tray to manage settings and exit.

## Features

- Transparent, borderless, always-on-top desktop window
- Draggable character with subtle breathing animation
- Click, double-click, whale, keyboard, and tray interactions
- Small, medium, and large display sizes with saved preferences
- Optional OpenAI-compatible chat, defaulting to DeepSeek's compatible endpoint and `deepseek-chat`
- Secure API-key storage through Electron `safeStorage` when supported by Windows
- Offline local interactions; AI chat requires your own network connection and API credentials

## Run the portable build

Download the [DeepSeekPet.zip Windows portable release](https://github.com/DaledLx/Desktop-pet/releases/download/DeepSeek-v1-20261002/DeepSeekPet.zip), extract the complete archive to a normal folder, and launch `DeepSeekPet.exe` or `启动桌宠.cmd`. The portable build supports Windows 10/11 x64 and does not require Node.js, npm, or Electron. Keep the extracted folder together and do not run the executable from inside the ZIP preview.

## Run from source

Install Node.js LTS (Node.js 22 or newer is recommended), then run:

```powershell
npm.cmd install
npm.cmd start
```

You can also launch `启动桌宠.cmd`. Useful checks:

```powershell
npm.cmd run check
npm.cmd test
```

## Build a Windows portable package

After installing dependencies on Windows, run:

```powershell
npm.cmd run build:win
```

The build runs syntax checks and tests, then creates an x64 portable directory and ZIP under `dist/`.

## Configure AI chat

Open **Model settings** from the right-click or tray menu. The default endpoint is `https://api.deepseek.com/v1/chat/completions` with model `deepseek-chat`, but you can replace both with any OpenAI-compatible service. Enter your API key, fetch the available models, and select one. Type a question in the input below the character and send it.

The app sends model requests from Electron's main process. It does not include a provider key or personal settings in the repository. Use only API services and content you are authorized to use.

## Artwork and attribution

The whale-girl artwork is a community creation based on the original character “Mingyue” by the artist 上山无行 and is released for derivative work under CC BY-NC-SA 4.0. This package is intended for personal, non-commercial use. Please review the applicable license and attribution requirements before redistributing artwork or builds.

## License

See [LICENSE](LICENSE) for the project license and third-party notices.
