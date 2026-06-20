import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: () => ipcRenderer.invoke('file:open'),
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),
  saveFile: (xml, filePath) => ipcRenderer.invoke('file:save', { xml, filePath }),
  saveFileAs: (xml) => ipcRenderer.invoke('file:save-as', { xml }),
  exportFile: (payload) => ipcRenderer.invoke('file:export', payload),
  captureRegion: (rect, options) => ipcRenderer.invoke('capture:region', rect, options),
  getCurrentPath: () => ipcRenderer.invoke('file:get-current-path'),
  setCurrentPath: (filePath) => ipcRenderer.send('file:path-changed', filePath),
  onMenu: (channel, callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, handler);

    return () => ipcRenderer.removeListener(channel, handler);
  }
});
