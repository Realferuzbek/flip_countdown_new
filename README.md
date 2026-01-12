# Flip Countdown (flip_countdown_new)

A **static Pomodoro-style flip countdown timer** built with **HTML + CSS + vanilla JS**.  
It supports:
- **Pomodoro / Short break / Long break** modes
- **Click-to-edit** time input (`MM:SS`) with safe bounds (**1–99 minutes**)
- **Fullscreen** mode (browser fullscreen API)
- **Theme backgrounds** (local images under `assets/backgrounds/`, auto-listed via Vercel API or a local manifest)
- **Multi-language UI** (**English / Uzbek / Russian**)
- **End-of-timer alarm** with a dedicated **Stop alarm** control
- Local persistence for key preferences (language, timer presets, selected background)

Live demo: https://flipcountdownnew.vercel.app/

---

## What’s inside (code-backed)

### Timer modes
Defined in `script.js`:
- `pomodoro` (default **25 min**)
- `short` break (default **5 min**)
- `long` break (default **15 min**)

You can customize these defaults using the in-app “Pomodoro” settings sheet (saved locally).

### Flip display + editable time
- The flip digits are rendered in the DOM (`.mm-tens`, `.mm-ones`, `.ss-tens`, `.ss-ones`) and updated by JS.
- Editing uses a hidden input:
  - `MM:SS` format
  - `Enter` applies the typed time
  - `Escape` exits edit mode

### Alarm behavior
- Alarm audio is bundled at: `assets/alarm.mp3`
- The UI includes a dedicated **Stop alarm** button (`#fab-alarm-stop`) which calls the stop logic (and can disarm).

### Background themes
Background images live in:
- `assets/backgrounds/`

The app loads the list of backgrounds by trying (in order):
1) `GET /api/backgrounds` (serverless endpoint; auto-enumerates `assets/backgrounds/`)
2) `assets/images.json` (fallback manifest)

This repo currently ships with:
- `assets/backgrounds/background.jpg`
- `assets/backgrounds/background_3.jpg`

---

## Keyboard shortcuts (code-backed)
- **Space** → Start / Pause (disabled while editing time)
- **Escape** → Close the settings sheet (when open)
- While editing time:
  - **Enter** → Apply `MM:SS`
  - **Escape** → Exit editing

---

## Project structure
- `index.html` — UI markup (timer, sheets, buttons)
- `styles.css` — styling + animations
- `script.js` — timer logic, i18n, themes, storage, fullscreen
- `assets/`  
  - `alarm.mp3`  
  - `backgrounds/` (theme images)  
  - `images.json` (optional manifest)
- `api/backgrounds.js` — Vercel serverless endpoint that lists background images
- `scripts/gen-images-manifest.mjs` — generates `assets/images.json` by scanning `assets/backgrounds/`
- `vercel.json` — Vercel config (clean URLs + cache headers)

---

## Run locally

### Option A — simple static server (recommended)
```bash
npm install
npm start
```

This runs `http-server` on:
- `http://localhost:5173`

### Option B — open directly
You can open `index.html` in a browser, but some setups handle asset URLs more reliably via a local server.

---

## Adding new backgrounds

1) Add image files to:
- `assets/backgrounds/` (jpg/png)

2) If you want the fallback manifest updated (optional):
```bash
npm run gen:assets
```

On Vercel, `/api/backgrounds` will auto-enumerate files on each deploy (no manifest needed).

---

## Local persistence (what is saved)
Stored via `localStorage`:
- Language: `app-language`
- Timer presets: `timer-presets`
- Background selection: `bg-url` (legacy key supported: `bg:src`)

---

## My role & contributions (transparent)
I led this as the **product owner and context/architecture engineer**:
- defined the UI/UX behavior for a distraction-free flip timer
- handled configuration, deployment setup, and debugging
- used AI-assisted coding tools to accelerate implementation while owning final decisions and shipping

---

## License
No license file is included in this repo. Add one if you want reuse permissions to be explicit.
