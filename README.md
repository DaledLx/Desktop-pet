# Astra Desktop Pet

![Astra desktop pet preview](assets/readme-preview.png)

A lightweight Windows 10/11 Electron desktop pet inspired by the Moonlit Astra character. Astra stays on top, uses a borderless transparent window, and can be dragged around the desktop. Click or double-click Astra for local lines and visual feedback; click the blue cloud for another interaction. Right-click Astra or use the system tray to open settings, toggle mouse passthrough, configure startup, or exit.

## Character

- **Name:** Astra (Moonlit Astra)
- **Style:** Silver-white hair, pale violet eyes, white horns, bat wings, a long tail, and a flowing white dress, with a small blue cloud by her side
- **Personality:** Calm, gentle, and a little mysterious; she offers quiet companionship when you need a moment to rest
- **Interactions:** Moonlight-themed lines when clicked, a special response and sparkles on double-click, a playful cloud interaction, and a subtle breathing animation
-
- ## Features

- Transparent, borderless, always-on-top desktop window
- Draggable character with subtle breathing animation
- Click, double-click, cloud, keyboard, and tray interactions
- Small, medium, and large display sizes with saved preferences
- Optional OpenAI-compatible chat through a configurable model endpoint
- Secure API-key storage through Electron `safeStorage` when supported by Windows
- Offline local interactions; AI chat requires your own network connection and API credentials

## Run the portable build

Download the `MoonlitPet-win-x64.zip` release, extract the complete archive to a normal folder, and launch `MoonlitPet.exe` or `启动桌宠.cmd`. The portable build supports Windows 10/11 x64 and does not require Node.js, npm, or Electron. Keep the extracted folder together and do not run the executable from inside the ZIP preview.

## Run from source

Install Node.js LTS (Node.js 22 or newer is recommended), then run:

```powershell
npm.cmd install
npm.cmd start
```

You can also launch `启动桌宠.cmd`. If dependencies are missing, the launcher attempts `npm ci` first.

Useful checks:

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

Open **Model settings** from the right-click or tray menu. Enter an OpenAI-compatible Base URL or a complete `/chat/completions` or `/responses` endpoint, add your API key, fetch the available models, and select one. Type a question in the input below Astra and send it. Responses remain in a separate panel until you close it.

The app sends model requests from Electron's main process. It does not include a provider key or personal settings in the repository. Use only API services and content you are authorized to use.

## License

See [LICENSE](LICENSE) for the project license and third-party notices.


