import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.on(channel, (_, ...args) => listener(...args)),
  off: (channel: string, listener: (...args: any[]) => void) => ipcRenderer.removeListener(channel, listener),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
});
