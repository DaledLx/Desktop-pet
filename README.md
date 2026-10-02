# Claude Desktop Pet

![Claude desktop pet preview](assets/claude-preview.png)

A lightweight Windows 10/11 Electron desktop pet featuring a warm, book-loving Claude character. The app uses a borderless transparent window that stays on top and can be dragged around the desktop. Click or double-click Claude for local lines and visual feedback; the profile button opens her character information. Right-click Claude or use the system tray to manage settings and exit.

## Character

- **Name:** Claude
- **Style:** Orange hair, amber eyes, a book, and a cream outfit with black and terracotta accents
- **Personality:** Gentle, thoughtful, patient, curious, and honest
- **Interactions:** Reading and companionship lines, bookmark-themed double-click feedback, and a subtle breathing animation

The character profile, local lines, and AI persona are maintained in `src/character.js`.

## Features

- Transparent, borderless, always-on-top desktop window
- Draggable character with subtle breathing animation
- Local speech bubble and profile panel
- Small, medium, and large display sizes with saved preferences
- Optional OpenAI-compatible chat through a configurable model endpoint
- Secure API-key storage through Electron `safeStorage` when supported by Windows

## Run the portable build

Download the `ClaudePet-win-x64.zip` release, extract the complete archive to a normal folder, and launch `ClaudePet.exe` or `启动桌宠.cmd`. The portable build supports Windows 10/11 x64 and does not require Node.js, npm, or Electron. Keep the extracted folder together and do not run the executable from inside the ZIP preview.

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

Open **Model settings** from the right-click or tray menu. Enter an OpenAI-compatible Base URL or a complete `/chat/completions` or `/responses` endpoint, add your API key, fetch the available models, and select one. Type a question in the input below Claude and send it. Responses remain in a separate panel until you close it.

The app sends model requests from Electron's main process. It does not include a provider key or personal settings in the repository. Use only API services and content you are authorized to use.

## License

See [LICENSE](LICENSE) for the project license and third-party notices.
