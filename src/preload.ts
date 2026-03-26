import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('pickerAPI', {
    selectImage: (imageKey: string) => ipcRenderer.send('select-image', imageKey),
    addCustomImage: () => ipcRenderer.send('add-custom-image'),
    removeCustomImage: (imageKey: string) => ipcRenderer.send('remove-custom-image', imageKey),
    renameCustomImage: (imageKey: string, newName: string) => ipcRenderer.send('rename-custom-image', imageKey, newName),
    onImagesUpdated: (callback: (data: { images: { key: string; url: string; label: string }[]; selected: string }) => void) => {
        ipcRenderer.on('images-updated', (_event, data) => callback(data));
    },
});
