const { contextBridge, ipcRenderer } = require('electron');
const { createOpenFMVBridge } = require('../shared/ipc-contract.js');

contextBridge.exposeInMainWorld(
  'openfmv',
  createOpenFMVBridge((channel, ...args) => ipcRenderer.invoke(channel, ...args))
);
