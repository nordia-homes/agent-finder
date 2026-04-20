const path = require('path');
const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');

const DEFAULT_LIVE_URL = 'https://studio--studio-7912545768-2e3d8.us-central1.hosted.app';
const START_URL = process.env.ELECTRON_START_URL || process.env.AGENT_FINDER_DESKTOP_URL || DEFAULT_LIVE_URL;

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icons', 'icon-512.png');
  const windowIcon = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1460,
    height: 940,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    fullscreenable: true,
    maximizable: true,
    backgroundColor: '#eef3fb',
    autoHideMenuBar: true,
    icon: windowIcon.isEmpty() ? undefined : windowIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Agent Finder Pro',
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow) return;
    mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.loadURL(START_URL).catch(() => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html'));
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isInternal = url.startsWith(START_URL) || url.startsWith(`${DEFAULT_LIVE_URL}/`);
    if (!isInternal) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('did-fail-load', () => {
    mainWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => undefined);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
