import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setCompactMode(compact) {
    ipcRenderer.invoke('set-compact-mode', Boolean(compact));
  }
});
