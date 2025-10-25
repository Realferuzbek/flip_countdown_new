// =======================
// Flip Countdown — renderer.js (livestream-safe)
// =======================

// ----- State -----
let totalSeconds = 0;
let timer = null;           // setInterval handle
let alarmPlaying = false;
let compactMode = false;

const DEFAULT_BACKGROUND = './assets/background.jpg';
const BG_STORAGE_KEY = 'bg:src';
const SHEET_TRANSITION_MS = 180;

let currentBackgroundSrc = '';
let backgroundOptions = [];
let sheetDismissTimer = null;
let lastFocusedElement = null;

if (!window.electronAPI) window.electronAPI = { setCompactMode: () => {} };

// ----- Elements -----
const mmTens   = document.querySelector('.mm-tens');
const mmOnes   = document.querySelector('.mm-ones');
const ssTens   = document.querySelector('.ss-tens');
const ssOnes   = document.querySelector('.ss-ones');
const timeWrap = document.getElementById('timeWrap');
const timeInput= document.getElementById('timeInput');
const note     = document.getElementById('note');
const alarm    = document.getElementById('alarm');
const bgDiv    = document.querySelector('.bg');
const fullscreenBtn = document.getElementById('btn-fullscreen');
const settingsBtn = document.getElementById('btn-settings');
const bgPicker = document.getElementById('bg-picker');
const bgGrid = document.getElementById('bg-grid');
const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
const isIPhone = /\biPhone\b/i.test(userAgent);

if (settingsBtn) {
  settingsBtn.title = 'Background settings';
}
if (fullscreenBtn) {
  fullscreenBtn.title = 'Enter fullscreen';
}

const savedBackgroundOnInit = getSavedBackground();
if (savedBackgroundOnInit) {
  setBackground(savedBackgroundOnInit, { persist: false, updateSelection: false });
}

// ----- Asset loading (works in dev and packaged) -----
function resolveBundled(relPath) {
  // file:/// URL that works from the current module (asar-safe)
  // When serving on web, host /assets/* alongside this script.
  return new URL(relPath, import.meta.url).toString();
}

function loadBundledAssets() {
  // Background
  if (!currentBackgroundSrc) {
    setBackground(DEFAULT_BACKGROUND, { persist: false, updateSelection: false });
  }
  bgDiv.style.filter = 'brightness(0.35)';

  // Alarm
  const alarmUrl = resolveBundled('./assets/alarm.mp3');
  alarm.src = alarmUrl;
  alarm.load();
}

// ----- Boot / focus -----
document.addEventListener('DOMContentLoaded', () => {
  document.body.tabIndex = -1;
  document.body.focus();
  loadBundledAssets();
  applySavedBackground();
  render();
  initBackgroundPicker().catch(() => {});
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

// ===== Fullscreen =====
function getFullscreenElement() {
  return document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null;
}

function requestFullscreen(el) {
  if (!el) return;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen;
  if (typeof request !== 'function') return;
  try {
    const result = request.call(el);
    if (result && typeof result.then === 'function') {
      result.catch(() => {});
    }
  } catch (_) {}
}

function exitFullscreen() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.mozCancelFullScreen ||
    document.msExitFullscreen;
  if (typeof exit !== 'function') return;
  try {
    const result = exit.call(document);
    if (result && typeof result.then === 'function') {
      result.catch(() => {});
    }
  } catch (_) {}
}

function isFullscreenSupported() {
  const el = document.documentElement;
  if (!el) return false;
  return Boolean(
    document.fullscreenEnabled ||
    document.webkitFullscreenEnabled ||
    document.mozFullScreenEnabled ||
    document.msFullscreenEnabled ||
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen
  );
}

const fullscreenSupported = isFullscreenSupported();

function updateFullscreenButtonState() {
  if (!fullscreenBtn) return;
  const active = Boolean(getFullscreenElement());
  fullscreenBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
  fullscreenBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
  fullscreenBtn.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
}

function toggleFullscreen() {
  if (!fullscreenSupported) return;
  if (getFullscreenElement()) {
    exitFullscreen();
  } else {
    applyCompactMode(false);
    requestFullscreen(document.documentElement);
  }
}

if (fullscreenBtn) {
  const lacksFullscreenAPI =
    !(document.documentElement && typeof document.documentElement.requestFullscreen === 'function') &&
    !document.webkitFullscreenElement;
  if (isIPhone && lacksFullscreenAPI) {
    fullscreenBtn.hidden = true;
  } else if (!fullscreenSupported) {
    fullscreenBtn.hidden = true;
  } else {
    fullscreenBtn.hidden = false;
    updateFullscreenButtonState();
    fullscreenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFullscreen();
    });
    const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fullscreenEvents.forEach((eventName) => {
      document.addEventListener(eventName, updateFullscreenButtonState);
    });
  }
}

// ===== Background picker =====
function resolveBackgroundSrc(src) {
  if (!src) return null;
  if (/^(?:https?:|data:)/i.test(src) || src.startsWith('/')) return src;
  const candidate = src.startsWith('.') ? src : `./${src}`;
  try {
    return resolveBundled(candidate);
  } catch (_) {
    try {
      return resolveBundled(src);
    } catch (__) {
      return src;
    }
  }
}

function getSavedBackground() {
  try {
    return localStorage.getItem(BG_STORAGE_KEY) || '';
  } catch (_) {
    return '';
  }
}

function updateThumbSelection(src) {
  if (!bgGrid) return;
  const nodes = bgGrid.querySelectorAll('[data-bg-option]');
  nodes.forEach((node) => {
    const isActive = node.dataset.bgOption === src;
    node.classList.toggle('is-selected', isActive);
    node.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function setBackground(src, options = {}) {
  if (!bgDiv) return;
  if (!src) return;
  const { persist = false, updateSelection = true } = options;
  const resolved = resolveBackgroundSrc(src);
  if (!resolved) return;
  const nextImage = `url("${resolved}")`;
  if (bgDiv.style.backgroundImage !== nextImage) {
    bgDiv.style.backgroundImage = nextImage;
    bgDiv.style.backgroundSize = 'cover';
    bgDiv.style.backgroundPosition = 'center';
    bgDiv.style.backgroundRepeat = 'no-repeat';
    bgDiv.style.backgroundAttachment = 'fixed';
  }
  currentBackgroundSrc = src;
  if (persist) {
    try {
      localStorage.setItem(BG_STORAGE_KEY, src);
    } catch (_) {}
  }
  if (updateSelection) updateThumbSelection(src);
}

function applySavedBackground() {
  const saved = getSavedBackground();
  if (saved) {
    setBackground(saved, { persist: false });
  }
}

async function loadBackgroundList() {
  try {
    const response = await fetch('assets/images.json', { cache: 'no-store' });
    if (!response.ok) return [];
    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    const seen = new Set();
    const filtered = [];
    payload.forEach((entry) => {
      if (typeof entry !== 'string') return;
      const trimmed = entry.trim();
      if (!trimmed) return;
      if (!/\.(png|jpe?g)$/i.test(trimmed)) return;
      if (seen.has(trimmed)) return;
      seen.add(trimmed);
      filtered.push(trimmed);
    });
    return filtered;
  } catch (_) {
    return [];
  }
}

function isSheetOpen() {
  return Boolean(bgPicker && !bgPicker.hidden && bgPicker.classList.contains('is-active'));
}

function openBackgroundPicker() {
  if (!bgPicker || isSheetOpen()) return;
  if (sheetDismissTimer) {
    clearTimeout(sheetDismissTimer);
    sheetDismissTimer = null;
  }
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  bgPicker.hidden = false;
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => {
    if (!bgPicker) return;
    bgPicker.classList.add('is-active');
    if (settingsBtn) settingsBtn.setAttribute('aria-pressed', 'true');
    if (bgGrid) {
      const target = bgGrid.querySelector('.bg-thumb.is-selected') || bgGrid.querySelector('.bg-thumb');
      if (target && typeof target.focus === 'function') {
        target.focus({ preventScroll: true });
      }
    }
  });
}

function closeBackgroundPicker({ restoreFocus = true } = {}) {
  if (!bgPicker || bgPicker.hidden) return;
  bgPicker.classList.remove('is-active');
  document.body.classList.remove('sheet-open');
  if (settingsBtn) settingsBtn.setAttribute('aria-pressed', 'false');
  if (sheetDismissTimer) {
    clearTimeout(sheetDismissTimer);
    sheetDismissTimer = null;
  }
  sheetDismissTimer = setTimeout(() => {
    if (bgPicker) bgPicker.hidden = true;
    sheetDismissTimer = null;
  }, SHEET_TRANSITION_MS);
  if (restoreFocus && lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

function handleBackgroundGridClick(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-bg-option]') : null;
  if (!target) return;
  event.preventDefault();
  const src = target.dataset.bgOption;
  if (!src) return;
  setBackground(src, { persist: true });
  closeBackgroundPicker({ restoreFocus: true });
}

async function initBackgroundPicker() {
  if (!settingsBtn || !bgPicker || !bgGrid) return;
  try {
    backgroundOptions = await loadBackgroundList();
  } catch (_) {
    backgroundOptions = [];
  }

  if (!Array.isArray(backgroundOptions) || backgroundOptions.length < 2) {
    settingsBtn.hidden = true;
    settingsBtn.setAttribute('aria-pressed', 'false');
    return;
  }

  settingsBtn.hidden = false;
  settingsBtn.setAttribute('aria-pressed', 'false');
  settingsBtn.title = 'Background settings';

  bgGrid.replaceChildren();
  backgroundOptions.forEach((src, index) => {
    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'bg-thumb';
    thumb.dataset.bgOption = src;
    thumb.setAttribute('role', 'listitem');
    thumb.setAttribute('aria-pressed', currentBackgroundSrc === src ? 'true' : 'false');
    thumb.title = `Set background ${index + 1}`;

    const img = document.createElement('img');
    img.src = resolveBackgroundSrc(src);
    img.alt = `Background ${index + 1}`;
    img.loading = 'lazy';

    thumb.appendChild(img);
    if (currentBackgroundSrc === src) {
      thumb.classList.add('is-selected');
    }
    bgGrid.appendChild(thumb);
  });
  updateThumbSelection(currentBackgroundSrc);

  settingsBtn.addEventListener('click', openBackgroundPicker);
  bgGrid.addEventListener('click', handleBackgroundGridClick);
  const dismissors = bgPicker.querySelectorAll('[data-sheet-dismiss]');
  dismissors.forEach((btn) => {
    btn.addEventListener('click', () => closeBackgroundPicker({ restoreFocus: true }));
  });
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
  if (document.activeElement === note && note.isContentEditable) return;
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

// ===== Note editing =====
function enableNoteEdit() { note.contentEditable = 'true'; note.focus(); placeCaretAtEnd(note); }
function lockNote() { note.contentEditable = 'false'; }
function placeCaretAtEnd(el) {
  const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}

// ===== Events =====
timeWrap.addEventListener('click', openTimeInput);

timeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); applyTimeFromInput(); }
  if (e.key === 'Escape') { e.preventDefault(); timeInput.classList.remove('active'); }
});

note.addEventListener('click', enableNoteEdit);
note.addEventListener('keydown', (e) => {
  if (e.key === 'Enter')  { e.preventDefault(); lockNote(); }
  if (e.key === 'Escape') { e.preventDefault(); lockNote(); } // don't reset while typing
});

// Global keys — disabled while editing note or time
window.addEventListener('keydown', (e) => {
  if (isSheetOpen()) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeBackgroundPicker({ restoreFocus: true });
    }
    return;
  }
  const editing =
    (document.activeElement === note && note.isContentEditable) ||
    (document.activeElement === timeInput && timeInput.classList.contains('active'));
  if (editing) return;

  if (e.code === 'Space')        { e.preventDefault(); if (timer) pause(); else start(); return; }
  if (e.key === 'Escape')        { reset(); return; }
  if (e.key.toLowerCase() === 'j') {
    e.preventDefault();
    const nextCompact = !compactMode;
    if (nextCompact && getFullscreenElement()) {
      exitFullscreen();
    }
    applyCompactMode(nextCompact);
    return;
  }
  if (e.key.toLowerCase() === 'l') { e.preventDefault(); stopAlarm(); return; }
});
