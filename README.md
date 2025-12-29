# Flip Countdown ⏳✨
A minimalist **flip-style Pomodoro timer** with beautiful backgrounds, quick controls, and zero signup — built to help you *enter flow* and *stay there*.

**Live demo:** https://flipcountdownnew.vercel.app/

---

## Why this exists
Focus tools shouldn’t feel like homework.

**Flip Countdown** is designed to be simple the moment you open it:
- choose a mode (Pomodoro / breaks),
- press start,
- let the timer do its job,
- and stop the alarm with one tap — cleanly.

No accounts. No clutter. Just a calm, usable timer.

---

## What you can do
- **Pomodoro + Short break + Long break** modes
- **Editable time input** (`MM:SS`) up to **99 minutes**
- **Background themes** (local backgrounds + auto listing on Vercel)
- **Fullscreen** mode (when supported by your browser)
- **Multi-language UI:** English, Uzbek, Russian
- **Alarm at the end** with a dedicated **Stop alarm** button  
  (and it’s designed to prevent accidental “alarm re-play” after you stop it)
- **Saves your preferences locally** (language, background, settings)

---

## How to use (in 10 seconds)
1. Pick a mode: **Pomodoro / short break / long break**
2. Press **Start**
3. Optional: click the time to type a custom value (example: `45:00`)
4. When time ends, stop the alarm with **Stop alarm**

> Note: Some browsers require at least one user interaction (click/tap) before they allow audio.

---

## Keyboard shortcuts
- **Space** → Start / Pause  
- **J** → Toggle compact mode (minimal view)

---

## Run locally
This project is a lightweight static web app (HTML/CSS/JS).

### Requirements
- Node.js (recommended: latest LTS)

### Install & start
```bash
npm install
npm run gen:assets
npm start
