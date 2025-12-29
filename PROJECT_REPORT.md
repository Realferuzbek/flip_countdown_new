<!-- PROJECT_REPORT.md -->

# Flip Countdown — Project Report

## 1) Overview

### Problem statement
Many Pomodoro timers are either visually noisy, require accounts, or hide basic controls behind menus. The goal of Flip Countdown is to provide a clean, flip-style timer that is immediately usable and easy to extend.

### Target users
- Students doing focused study sessions
- Knowledge workers who use timeboxing (Pomodoro or custom intervals)
- Anyone who wants a simple timer with an unobtrusive UI

### Scope
**Included**
- Pomodoro/short break/long break modes
- Editable time input (`MM:SS`) up to 99 minutes
- Background themes with persistence
- Multi-language UI (EN/UZ/RU)
- End-of-timer alarm with explicit stop control and “hard stop” behavior
- Static deployment with an optional Vercel serverless endpoint

**Not included**
- Accounts, sync across devices, or server-side storage
- Analytics or tracking
- Task lists, calendars, or habit tracking (intentionally out of scope)

---

## 2) Requirements

### Functional requirements
- Start/pause a countdown timer
- Switch between modes (pomodoro / short break / long break)
- Edit the timer duration via a simple time input
- Play an alarm when the timer reaches zero
- Allow the user to stop the alarm reliably
- Change and persist background theme selection
- Support multiple UI languages and persist selection

### Non-functional requirements
- **Reliability:** timer remains accurate even if the tab is throttled or backgrounded
- **Performance:** quick load; minimal dependencies
- **UX:** clear controls; minimal friction to start a focus session
- **Privacy:** no user accounts; store only local preferences
- **Maintainability:** simple architecture; easy to extend

---

## 3) System Design

### Architecture overview
Flip Countdown is a static web app with an optional serverless helper endpoint on Vercel.

```mermaid
flowchart TB
  U[User] --> B[Browser UI]
  B -->|loads| H[index.html]
  B -->|styles| C[styles.css]
  B -->|logic| J[script.js]

  J -->|fetch backgrounds| API[/api/backgrounds (Vercel)/]
  J -->|fallback| M[assets/images.json]

  J --> LS[(localStorage)]
  J --> A[HTMLAudioElement alarm]

  API --> FS[assets/backgrounds/]
  M --> FS