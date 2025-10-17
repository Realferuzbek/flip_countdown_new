// =======================
// Flip Countdown — renderer.js (livestream-safe)
// =======================

// ----- State -----
let totalSeconds = 0;
let timer = null;           // setInterval handle
let alarmPlaying = false;
let compactMode = false;

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

// ----- Asset loading (works in dev and packaged) -----
function resolveBundled(relPath) {
  // file:/// URL that works from the current module (asar-safe)
  return new URL(relPath, import.meta.url).toString();
}

function loadBundledAssets() {
  // Background
  const bgUrl = resolveBundled('../assets/background.jpg');
  bgDiv.style.backgroundImage = `url("${bgUrl}")`;
  bgDiv.style.backgroundSize = 'cover';
  bgDiv.style.backgroundPosition = 'center';
  bgDiv.style.backgroundRepeat = 'no-repeat';
  bgDiv.style.filter = 'brightness(0.35)';

  // Alarm
  const alarmUrl = resolveBundled('../assets/alarm.mp3');
  alarm.src = alarmUrl;
  alarm.load();
}

// ----- Boot / focus -----
document.addEventListener('DOMContentLoaded', () => {
  document.body.tabIndex = -1;
  document.body.focus();
  loadBundledAssets();
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
  const editing =
    (document.activeElement === note && note.isContentEditable) ||
    (document.activeElement === timeInput && timeInput.classList.contains('active'));
  if (editing) return;

  if (e.code === 'Space')        { e.preventDefault(); if (timer) pause(); else start(); return; }
  if (e.key === 'Escape')        { reset(); return; }
  if (e.key.toLowerCase() === 'j') {
    e.preventDefault();
    const nextCompact = !compactMode;
    if (nextCompact && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    applyCompactMode(nextCompact);
    return;
  }
  if (e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      applyCompactMode(false);
      document.documentElement.requestFullscreen().catch(() => {});
    }
    return;
  }
  if (e.key.toLowerCase() === 'l') { e.preventDefault(); stopAlarm(); return; }
});
