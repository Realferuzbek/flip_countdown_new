import { app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BOUNDS = { width: 1280, height: 800 };
const COMPACT_BOUNDS = { width: 520, height: 300 };
let lastNormalBounds = { ...DEFAULT_BOUNDS };

let win;

function createWindow() {
  win = new BrowserWindow({
    width: DEFAULT_BOUNDS.width,
    height: DEFAULT_BOUNDS.height,
    backgroundColor: '#000000',
    autoHideMenuBar: true,      // ��? hides "File/Edit/�?�" bar
    show: false,                // show when ready
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.setMenu(null);            // extra safety: no menu at all
  win.once('ready-to-show', () => {
    win.show();
    win.setAlwaysOnTop(true, 'screen-saver');
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('set-compact-mode', (_event, compact) => {
    if (!win) return;

    if (compact) {
      const bounds = typeof win.getNormalBounds === 'function' ? win.getNormalBounds() : win.getBounds();
      if (bounds && bounds.width && bounds.height) {
        lastNormalBounds = bounds;
      } else {
        lastNormalBounds = { ...DEFAULT_BOUNDS };
      }
      win.setAlwaysOnTop(true, 'screen-saver');
      win.setSize(COMPACT_BOUNDS.width, COMPACT_BOUNDS.height, true);
    } else {
      const { width = DEFAULT_BOUNDS.width, height = DEFAULT_BOUNDS.height } = lastNormalBounds || DEFAULT_BOUNDS;
      win.setAlwaysOnTop(true, 'screen-saver');
      win.setSize(width, height, true);
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows we can quit when last window closes
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
