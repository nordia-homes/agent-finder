const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('agentFinderDesktop', {
  platform: process.platform,
  desktopShell: true,
});
