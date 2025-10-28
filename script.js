// =======================
// Flip Countdown — renderer.js (livestream-safe)
// =======================

// ----- State -----
let totalSeconds = 0;
let timer = null;           // setInterval handle
let alarmPlaying = false;
let compactMode = false;

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

function resolveBackgroundUrl(src) {
  if (!src) return '';
  if (/^(?:https?:|data:|blob:)/i.test(src)) return src;
  try {
    return new URL(src, import.meta.url).toString();
  } catch (_) {
    return src;
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
    bgDiv.style.filter = 'brightness(0.35)';
  }
  document.body.style.backgroundImage = cssValue;
  document.body.style.backgroundSize = 'cover';
  document.body.style.backgroundPosition = 'center';
  document.body.style.backgroundRepeat = 'no-repeat';
  document.body.style.backgroundAttachment = 'fixed';
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
  // Accept both {images:[...]} and ["...","..."]
  try {
    const res = await fetch('assets/images.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : (Array.isArray(json.images) ? json.images : []);
    return list.filter((p) => /\.(png|jpe?g)$/i.test(p));
  } catch (_) {
    return []; // no manifest, no picker
  }
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
      btn.innerHTML = `<img loading="lazy" decoding="async" src="${url}" alt="">`;
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
}

// ----- Boot / focus -----
document.addEventListener('DOMContentLoaded', async () => {
  document.body.tabIndex = -1;
  document.body.focus();
  loadBundledAssets();
  try {
    await initAppearance();
  } catch (err) {
    console.error('Failed to initialize appearance controls:', err);
  }
  render();
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
  if (totalSeconds <= 0 || timer) return;
  timer = setInterval(tick, 1000);
}
function pause() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
function reset() {
  pause();
  stopAlarm(true);
  totalSeconds = 0;
  render();
}
function tick() {
  totalSeconds = Math.max(0, totalSeconds - 1);
  render();
  if (totalSeconds <= 0) {
    pause();
    playAlarm();
  }
}

// ===== Alarm =====
function playAlarm() {
  if (alarmPlaying) return;
  alarm.loop = true;
  alarm.currentTime = 0;
  alarm.play().then(() => { alarmPlaying = true; }).catch(() => {});
}
function stopAlarm(force = false) {
  if (!alarmPlaying) return;
  const focused = force ? true : document.hasFocus();
  if (!focused) return; // only stop when app is focused
  alarm.pause();
  alarm.currentTime = 0;
  alarmPlaying = false;
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
    totalSeconds = clampTime(parseInt(m[1],10), parseInt(m[2],10));
    render();
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
  if (e.key.toLowerCase() === 'l') { e.preventDefault(); stopAlarm(); return; }
});
