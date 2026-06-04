const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    printReceipt: (orderData) => ipcRenderer.invoke('print-receipt', orderData),
    getPrinterName: () => ipcRenderer.invoke('get-printer-name'),
    savePrinterName: (name) => ipcRenderer.invoke('save-printer-name', name)
});