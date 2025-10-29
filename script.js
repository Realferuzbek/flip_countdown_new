// =======================
// Flip Countdown — renderer.js (livestream-safe)
// =======================

// ----- State -----
const DEFAULT_TIMER_MINUTES = Object.freeze({
  pomodoro: 25,
  short: 5,
  long: 15,
});
const TIMER_STORE_KEY = 'timer-presets';
const TIMER_MIN_MINUTES = 1;
const TIMER_MAX_MINUTES = 99;
const THEME_NAME_MAP = Object.freeze({
  'assets/backgrounds/background.jpg': 'Dark Mountain',
  'assets/backgrounds/background_2.png': 'Midnight Clouds',
  'assets/backgrounds/background_3.jpg': 'Grey Moon',
});
const DEFAULT_THEME_NAME = 'New Background';

const MODE_CONFIG = {
  pomodoro: { label: 'pomodoro', seconds: DEFAULT_TIMER_MINUTES.pomodoro * 60 },
  short: { label: 'short break', seconds: DEFAULT_TIMER_MINUTES.short * 60 },
  long: { label: 'long break', seconds: DEFAULT_TIMER_MINUTES.long * 60 },
};
let totalSeconds = 0;
let timer = null;           // setInterval handle
let targetTimestamp = null;
let alarmPlaying = false;
let compactMode = false;
let activeMode = 'pomodoro';

// === Background + Fullscreen wiring ===
const BG_STORE_KEY = 'bg-url';
const BG_LEGACY_KEY = 'bg:src';
const DEFAULT_BG = 'assets/backgrounds/background_2.png';
const $ = (sel) => document.querySelector(sel);

function currentBg() {
  try {
    const stored = localStorage.getItem(BG_STORE_KEY);
    if (stored) return stored;
    const legacy = localStorage.getItem(BG_LEGACY_KEY);
    if (legacy) return legacy;
  } catch (_) {}
  return '';
}

let appliedBackground = currentBg();

const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const timerInputs = {
  pomodoro: document.getElementById('pomodoro-focus'),
  short: document.getElementById('pomodoro-short'),
  long: document.getElementById('pomodoro-long'),
};
const timerSaveBtn = document.getElementById('pomodoro-save-btn');
const timerResetBtn = document.getElementById('pomodoro-reset-btn');
const alarmStopBtn = document.getElementById('fab-alarm-stop');

function resolveBackgroundUrl(src) {
  if (!src) return '';
  if (/^(?:https?:|data:|blob:)/i.test(src)) return src;
  try {
    return new URL(src, import.meta.url).toString();
  } catch (_) {
    return src;
  }
}

function normalizeBackgroundKey(url) {
  if (!url) return '';
  const normalized = url.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('assets/backgrounds/');
  if (idx !== -1) {
    return normalized.slice(idx);
  }
  return normalized;
}

function themeNameFor(url) {
  const key = normalizeBackgroundKey(url);
  return THEME_NAME_MAP[key] || DEFAULT_THEME_NAME;
}

function toggleAlarmStopButton(show) {
  if (!alarmStopBtn) return;
  alarmStopBtn.hidden = !show;
  if (show) {
    alarmStopBtn.setAttribute('tabindex', '0');
  } else {
    alarmStopBtn.removeAttribute('tabindex');
  }
}

function applyBackground(url, { persist = true } = {}) {
  if (!url) return;
  const resolved = resolveBackgroundUrl(url);
  if (!resolved) return;
  const cssValue = `url("${resolved}")`;
  if (bgDiv) {
    bgDiv.style.backgroundImage = cssValue;
    bgDiv.style.backgroundSize = 'cover';
    bgDiv.style.backgroundPosition = 'center';
    bgDiv.style.backgroundRepeat = 'no-repeat';
    bgDiv.style.backgroundAttachment = 'fixed';
    bgDiv.style.removeProperty('filter');
    bgDiv.style.removeProperty('-webkit-filter');
  }
  document.body.style.backgroundImage = cssValue;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
  document.body.style.removeProperty('filter');
  document.body.style.removeProperty('-webkit-filter');
  appliedBackground = url;
  if (persist) {
    try {
      localStorage.setItem(BG_STORE_KEY, url);
      localStorage.setItem(BG_LEGACY_KEY, url);
    } catch (_) {}
  }
}

function syncThumbSelection(grid, url) {
  if (!grid) return;
  grid.querySelectorAll('.thumb').forEach((btn) => {
    const isActive = btn.dataset.bgOption === url;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function syncModeButtons(mode = activeMode) {
  modeButtons.forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function modeMinutesFromConfig() {
  return {
    pomodoro: Math.round((MODE_CONFIG.pomodoro?.seconds ?? DEFAULT_TIMER_MINUTES.pomodoro * 60) / 60),
    short: Math.round((MODE_CONFIG.short?.seconds ?? DEFAULT_TIMER_MINUTES.short * 60) / 60),
    long: Math.round((MODE_CONFIG.long?.seconds ?? DEFAULT_TIMER_MINUTES.long * 60) / 60),
  };
}

function updateModeConfigFromMinutes(minutes) {
  ['pomodoro', 'short', 'long'].forEach((key) => {
    if (!MODE_CONFIG[key]) return;
    const base = DEFAULT_TIMER_MINUTES[key];
    const value = minutes?.[key];
    const mins = sanitizeMinutes(value, base);
    MODE_CONFIG[key].seconds = mins * 60;
  });
}

function sanitizeMinutes(value, fallback) {
  const minutes = Number.parseInt(value, 10);
  if (!Number.isFinite(minutes)) return fallback;
  return Math.max(TIMER_MIN_MINUTES, Math.min(TIMER_MAX_MINUTES, minutes));
}

function syncTimerInputs(minutes = modeMinutesFromConfig()) {
  Object.entries(timerInputs).forEach(([key, input]) => {
    if (!input) return;
    const mins = minutes?.[key] ?? DEFAULT_TIMER_MINUTES[key];
    input.value = mins;
  });
}

function readTimerInputs() {
  const current = modeMinutesFromConfig();
  const minutes = { ...current };
  Object.entries(timerInputs).forEach(([key, input]) => {
    if (!input) return;
    const sanitized = sanitizeMinutes(input.value, current[key]);
    minutes[key] = sanitized;
    if (String(sanitized) !== String(input.value)) {
      input.value = sanitized;
    }
  });
  return minutes;
}

function persistTimerMinutes(minutes) {
  try {
    localStorage.setItem(TIMER_STORE_KEY, JSON.stringify(minutes));
  } catch (_) {}
}

function applyTimerMinutes(minutes, { persist = true, resetTimer = true } = {}) {
  updateModeConfigFromMinutes(minutes);
  if (persist) persistTimerMinutes(minutes);
  syncTimerInputs(minutes);
  if (resetTimer) {
    reset();
  } else {
    refreshControls();
  }
}

function loadTimerPresets() {
  let stored = null;
  try {
    const raw = localStorage.getItem(TIMER_STORE_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch (_) {}
  const minutes = { ...DEFAULT_TIMER_MINUTES };
  if (stored && typeof stored === 'object') {
    ['pomodoro', 'short', 'long'].forEach((key) => {
      if (key in stored) {
        minutes[key] = sanitizeMinutes(stored[key], minutes[key]);
      }
    });
  }
  updateModeConfigFromMinutes(minutes);
  persistTimerMinutes(minutes);
  return minutes;
}

function refreshControls() {
  if (startBtn) {
    const running = Boolean(timer);
    startBtn.textContent = running ? 'pause' : 'start';
    startBtn.classList.toggle('is-running', running);
    startBtn.setAttribute('aria-pressed', running ? 'true' : 'false');
    startBtn.disabled = (!running && totalSeconds <= 0);
  }
  if (resetBtn) {
    const preset = MODE_CONFIG[activeMode]?.seconds ?? 0;
    const running = Boolean(timer);
    resetBtn.disabled = !running && totalSeconds === preset;
  }
  syncModeButtons();
}

function setActiveMode(mode, { resetToPreset = true } = {}) {
  if (!MODE_CONFIG[mode]) {
    mode = 'pomodoro';
  }
  activeMode = mode;
  syncModeButtons(mode);
  if (resetToPreset) {
    pause({ refresh: false });
    stopAlarm(true);
    totalSeconds = MODE_CONFIG[mode].seconds;
    render();
  }
  refreshControls();
}

// Fullscreen helpers (vendor-safe)
function fsSupported() {
  return Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled || document.msFullscreenEnabled);
}
function inFs() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
}
function enterFs() {
  const el = document.documentElement;
  const method = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
  if (typeof method === 'function') method.call(el);
}
function exitFs() {
  const method = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
  if (typeof method === 'function') method.call(document);
}
function toggleFs() {
  if (inFs()) {
    exitFs();
  } else {
    applyCompactMode(false);
    enterFs();
  }
}

// Open/close bottom sheet
function openSheet() {
  const sheet = $('#bg-sheet');
  if (!sheet) return;
  sheet.hidden = false;
  document.body.classList.add('sheet-open');
  const trigger = $('#fab-bg');
  trigger?.setAttribute('aria-pressed', 'true');
  const panel = sheet.querySelector('.sheet__panel');
  panel?.focus({ preventScroll: true });
}
function closeSheet() {
  const sheet = $('#bg-sheet');
  if (!sheet) return;
  sheet.hidden = true;
  document.body.classList.remove('sheet-open');
  const trigger = $('#fab-bg');
  trigger?.setAttribute('aria-pressed', 'false');
  if (trigger && sheet.contains(document.activeElement)) {
    trigger.focus();
  }
}

async function loadImagesManifest() {
  // Prefer server-enumerated list (auto-updates on deploy), fall back to legacy manifest.
  const sources = [
    () => fetch('/api/backgrounds', { cache: 'no-store' }),
    () => fetch('assets/images.json', { cache: 'no-store' }),
  ];

  for (const getSource of sources) {
    try {
      const res = await getSource();
      if (!res || !res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data.images) ? data.images : []);
      const cleaned = list
        .filter((p) => typeof p === 'string' && /\.(png|jpe?g)$/i.test(p));
      if (cleaned.length) {
        const seen = new Set();
        return cleaned.filter((url) => {
          const key = url.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    } catch (_) {
      // try next source
    }
  }

  return [];
}

async function initAppearance() {
  const fsBtn = $('#fab-fs');
  const bgBtn = $('#fab-bg');
  const grid  = $('#bg-grid');
  const sheet = $('#bg-sheet');

  // Fullscreen: expose button only if supported (desktop + Android; iOS Safari lacks it)
  if (fsBtn) {
    if (fsSupported()) {
      fsBtn.hidden = false;
      fsBtn.setAttribute('aria-pressed', String(inFs()));
      fsBtn.addEventListener('click', toggleFs);
      document.addEventListener('fullscreenchange', () => {
        fsBtn.setAttribute('aria-pressed', String(inFs()));
      });
    } else {
      fsBtn.remove();
    }
  }

  const images = await loadImagesManifest();
  const saved = currentBg();
  const availableSet = new Set(images);
  const initial =
    (saved && availableSet.has(saved)) ? saved :
    (images[0] || saved || DEFAULT_BG);

  applyBackground(initial, { persist: Boolean(images.length) });

  if (!grid || !bgBtn || !sheet) {
    return;
  }

  if (images.length > 1) {
    grid.innerHTML = '';
    images.forEach((url) => {
      const btn = document.createElement('button');
      btn.className = 'thumb';
      btn.type = 'button';
      btn.dataset.bgOption = url;
      const themeLabel = themeNameFor(url);
      btn.dataset.themeName = themeLabel;
      btn.setAttribute('aria-label', `Use the ${themeLabel} background`);
      btn.setAttribute('role', 'listitem');
      btn.innerHTML = `<img loading="lazy" decoding="async" src="${url}" alt="${themeLabel} preview">`;
      btn.addEventListener('click', () => {
        applyBackground(url);
        syncThumbSelection(grid, url);
        closeSheet();
      });
      grid.appendChild(btn);
    });

    syncThumbSelection(grid, appliedBackground);

    bgBtn.hidden = false;
    bgBtn.setAttribute('aria-pressed', 'false');
    bgBtn.addEventListener('click', () => {
      const sheetVisible = !sheet.hidden;
      if (sheetVisible) {
        closeSheet();
      } else {
        openSheet();
      }
    });

    sheet.addEventListener('click', (e) => {
      if (e.target instanceof Element && e.target.hasAttribute('data-close')) {
        closeSheet();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.hidden) {
        closeSheet();
      }
    });
  } else {
    closeSheet();
    grid.innerHTML = '';
    bgBtn.hidden = true;
    bgBtn.setAttribute('aria-pressed', 'false');
  }
}

if (!window.electronAPI) window.electronAPI = { setCompactMode: () => {} };

// ----- Elements -----
const mmTens   = document.querySelector('.mm-tens');
const mmOnes   = document.querySelector('.mm-ones');
const ssTens   = document.querySelector('.ss-tens');
const ssOnes   = document.querySelector('.ss-ones');
const timeWrap = document.getElementById('timeWrap');
const timeInput= document.getElementById('timeInput');
const alarm    = document.getElementById('alarm');
const bgDiv    = document.querySelector('.bg');

// ----- Asset loading (works in dev and packaged) -----
function resolveBundled(relPath) {
  // file:/// URL that works from the current module (asar-safe)
  // When serving on web, host /assets/* alongside this script.
  return new URL(relPath, import.meta.url).toString();
}

function loadBundledAssets() {
  if (bgDiv && !bgDiv.style.backgroundImage) {
    applyBackground(DEFAULT_BG, { persist: false });
  }

  const alarmUrl = resolveBundled('./assets/alarm.mp3');
  alarm.src = alarmUrl;
  alarm.load();
  if (alarmStopBtn && !alarmStopBtn.dataset.bound) {
    alarmStopBtn.addEventListener('click', () => {
      stopAlarm(true);
    });
    alarmStopBtn.dataset.bound = 'true';
  }
  toggleAlarmStopButton(false);
}

function initModeControls() {
  if (modeButtons.length) {
    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetMode = btn.dataset.mode;
        setActiveMode(targetMode, { resetToPreset: true });
      });
    });
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (timer) {
        pause();
      } else {
        start();
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      reset();
    });
  }

  setActiveMode(activeMode, { resetToPreset: true });
}

function initTimerSettings() {
  const hasInputs = Object.values(timerInputs).some(Boolean);
  if (!hasInputs) return;

  syncTimerInputs();

  if (timerSaveBtn) {
    timerSaveBtn.addEventListener('click', () => {
      const minutes = readTimerInputs();
      applyTimerMinutes(minutes);
      closeSheet();
    });
  }

  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', () => {
      applyTimerMinutes({ ...DEFAULT_TIMER_MINUTES });
    });
  }
}

// ----- Boot / focus -----
document.addEventListener('DOMContentLoaded', async () => {
  document.body.tabIndex = -1;
  document.body.focus();
  loadTimerPresets();
  initModeControls();
  loadBundledAssets();
  try {
    await initAppearance();
  } catch (err) {
    console.error('Failed to initialize appearance controls:', err);
  }
  initTimerSettings();
  render();
  refreshControls();
});

// ===== Helpers =====
function clampTime(m, s) {
  m = Math.max(0, Math.min(59, Number.isFinite(m) ? m : 0));
  s = Math.max(0, Math.min(59, Number.isFinite(s) ? s : 0));
  return m * 60 + s;
}
function formatMMSS(t) {
  const m = Math.floor(t / 60);
  const s = t % 60;
  return [Math.floor(m / 10), m % 10, Math.floor(s / 10), s % 10];
}
function setDigits([a,b,c,d]) {
  applyDigit(mmTens, a); applyDigit(mmOnes, b);
  applyDigit(ssTens, c); applyDigit(ssOnes, d);
}
// Plain digits (no flip animation)
function applyDigit(el, next) { el.dataset.digit = String(next); }
function render() { setDigits(formatMMSS(totalSeconds)); }

function applyCompactMode(compact) {
  compactMode = Boolean(compact);
  const api = window.electronAPI;
  if (api && typeof api.setCompactMode === 'function') {
    api.setCompactMode(compactMode);
  }
}

function isSheetOpen() {
  const sheet = document.getElementById('bg-sheet');
  return Boolean(sheet && !sheet.hidden);
}

// ===== Timer (setInterval so it keeps updating while unfocused) =====
function start() {
  if (totalSeconds <= 0 || timer) {
    refreshControls();
    return;
  }
  targetTimestamp = Date.now() + totalSeconds * 1000;
  timer = setInterval(tick, 1000);
  refreshControls();
}
function pause(options = {}) {
  const { refresh = true } = options;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (targetTimestamp !== null) {
    const remainingMs = Math.max(0, targetTimestamp - Date.now());
    totalSeconds = Math.ceil(remainingMs / 1000);
    targetTimestamp = null;
  }
  if (refresh) refreshControls();
}
function reset() {
  pause({ refresh: false });
  stopAlarm(true);
  const preset = MODE_CONFIG[activeMode]?.seconds ?? 0;
  totalSeconds = preset;
  targetTimestamp = null;
  render();
  refreshControls();
}
function tick() {
  if (targetTimestamp !== null) {
    const remainingMs = Math.max(0, targetTimestamp - Date.now());
    totalSeconds = Math.ceil(remainingMs / 1000);
  } else {
    totalSeconds = Math.max(0, totalSeconds - 1);
  }
  render();
  if (totalSeconds <= 0) {
    pause({ refresh: false });
    playAlarm();
    targetTimestamp = null;
  }
  refreshControls();
}

// ===== Alarm =====
function playAlarm() {
  if (alarmPlaying) return;
  alarm.loop = true;
  alarm.currentTime = 0;
  const promise = alarm.play();
  const onSuccess = () => {
    alarmPlaying = true;
    toggleAlarmStopButton(true);
  };
  const onFailure = () => {
    alarmPlaying = false;
    toggleAlarmStopButton(false);
  };
  if (promise && typeof promise.then === 'function') {
    promise.then(onSuccess).catch(onFailure);
  } else {
    onSuccess();
  }
}
function stopAlarm(force = false) {
  if (!alarmPlaying) return;
  const focused = force ? true : document.hasFocus();
  if (!focused) return; // only stop when app is focused
  alarm.pause();
  alarm.currentTime = 0;
  alarmPlaying = false;
  toggleAlarmStopButton(false);
}

// ===== Time input =====
function openTimeInput() {
  const [a,b,c,d] = formatMMSS(totalSeconds || 0);
  timeInput.value = `${a}${b}:${c}${d}`;
  timeInput.classList.add('active');
  timeInput.focus();
  timeInput.select();
}
function applyTimeFromInput() {
  const v = (timeInput.value || '').trim();
  const m = /^([0-5]?\d):([0-5]?\d)$/.exec(v);
  if (m) {
    pause({ refresh: false });
    totalSeconds = clampTime(parseInt(m[1],10), parseInt(m[2],10));
    render();
    refreshControls();
  }
  timeInput.classList.remove('active');
}

// ===== Events =====
timeWrap.addEventListener('click', openTimeInput);

timeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); applyTimeFromInput(); }
  if (e.key === 'Escape') { e.preventDefault(); timeInput.classList.remove('active'); }
});

// Global keys — disabled while editing time input
window.addEventListener('keydown', (e) => {
  if (isSheetOpen()) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeSheet();
    }
    return;
  }
  const editing =
    (document.activeElement === timeInput && timeInput.classList.contains('active'));
  if (editing) return;

  if (e.code === 'Space')        { e.preventDefault(); if (timer) pause(); else start(); return; }
  if (e.key === 'Escape')        { reset(); return; }
  if (e.key.toLowerCase() === 'j') {
    e.preventDefault();
    const nextCompact = !compactMode;
    if (nextCompact && inFs()) {
      exitFs();
    }
    applyCompactMode(nextCompact);
    return;
  }
});
