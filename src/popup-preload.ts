import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('popupAPI', {
    acknowledge: () => ipcRenderer.send('acknowledge'),
    onShowAck: (callback: () => void) => {
        ipcRenderer.on('show-ack', () => callback());
    },
});
