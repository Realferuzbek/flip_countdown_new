# Flip Countdown

Flip Countdown is a simple, local-only countdown timer with a clean flip-style display. It saves nothing to the network, includes an optional note field, and plays an alarm when the timer hits zero. Use it for livestreams, classrooms, or any distraction-free countdown scenario.

## Keyboard Shortcuts
- `Space`: Start / pause the timer  
- `Esc`: Reset to 00:00 and stop the alarm  
- `J`: Toggle compact mode (smaller window)  
- `K`: Toggle fullscreen (exits compact mode first)  
- `L`: Stop the alarm (only when the window is focused)

## Running in Development
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Start the Electron app:
   ```bash
   npm start
   ```

## Building Installers
Each command produces artifacts in `dist/`:
- Windows (NSIS):  
  ```bash
  npm run build:win
  ```
- macOS (DMG):  
  ```bash
  npm run build:mac
  ```
- Linux (AppImage):  
  ```bash
  npm run build:linux
  ```

> **Note:** Electron bundles Chromium and Node.js, so builds typically land around 100–130 MB per platform—this is expected.

## Downloads
Grab the latest installers from the [GitHub Releases](../../releases) page.

## Signing & Notarization (optional)
Code signing is disabled in this repository so the CI builds remain unsigned. When you are ready to ship signed builds:
- **Windows:** export `CS_PFX_FILE` (path to your `.pfx`) and `CS_PFX_PASSWORD`, or set `win.certificateFile` / `win.certificatePassword` in `package.json`.
- **macOS:** enable `build.mac.hardenedRuntime`, provide entitlements, and export `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` (plus `APPLE_ASC_PROVIDER` if needed). Run your notarization script via `build.afterSign`.

## Web Demo
Serve the repository root and open the static copy:
```bash
npm run web:serve
```
Then open <http://127.0.0.1:5173/web/index.html> (or use `npm run web:open` on Windows). When self-hosting, place `/web/*` and `/assets/*` at the same level.

## Contributing
Pull requests are welcome! The project uses plain JavaScript, CSS, and Electron—no frameworks required. Before submitting changes, run the relevant build command to ensure installers still generate correctly.
