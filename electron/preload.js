const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openfmv', {
  openProject: () => ipcRenderer.invoke('openfmv:open-project'),
  saveProject: (project) => ipcRenderer.invoke('openfmv:save-project', project),
  importAsset: (filePath) => ipcRenderer.invoke('openfmv:import-asset', filePath),
  selectAsset: () => ipcRenderer.invoke('openfmv:select-asset'),
  exportGame: (project, config) => ipcRenderer.invoke('openfmv:export-game', project, config),
  selectDirectory: () => ipcRenderer.invoke('openfmv:select-directory'),
  minimizeWindow: () => ipcRenderer.invoke('openfmv:minimize-window'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('openfmv:toggle-maximize-window'),
  closeWindow: () => ipcRenderer.invoke('openfmv:close-window'),
  getAiConfig: () => ipcRenderer.invoke('openfmv:get-ai-config'),
  saveAiConfig: (config) => ipcRenderer.invoke('openfmv:save-ai-config', config),
  detectAiAgents: () => ipcRenderer.invoke('openfmv:detect-ai-agents'),
  testAiAgent: (agentId) => ipcRenderer.invoke('openfmv:test-ai-agent', agentId),
  sendChatMessage: (request) => ipcRenderer.invoke('openfmv:send-chat-message', request),
  testByokProvider: (provider) => ipcRenderer.invoke('openfmv:test-byok-provider', provider),
  testMediaProvider: (provider) => ipcRenderer.invoke('openfmv:test-media-provider', provider),
});
