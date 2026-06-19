import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {string | null} */
let currentFilePath = null;

function getIndexPath() {
  if (isDev) {
    return 'http://localhost:5173';
  }

  return join(__dirname, '../dist/index.html');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'BPMN-IO',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = getIndexPath();

  if (isDev) {
    mainWindow.loadURL(indexPath);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendToRenderer(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function updateWindowTitle(filePath) {
  const name = filePath ? filePath.split(/[/\\]/).pop() : 'Untitled';
  mainWindow?.setTitle(`${name} — BPMN-IO`);
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open BPMN diagram',
    filters: [
      { name: 'BPMN diagrams', extensions: ['bpmn', 'xml'] },
      { name: 'All files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await readFile(filePath, 'utf-8');

  currentFilePath = filePath;
  updateWindowTitle(filePath);

  return { filePath, content };
}

async function saveFileDialog(xml, filePath = null) {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save BPMN diagram',
      defaultPath: 'diagram.bpmn',
      filters: [
        { name: 'BPMN diagrams', extensions: ['bpmn'] },
        { name: 'XML files', extensions: ['xml'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    targetPath = result.filePath;
  }

  await writeFile(targetPath, xml, 'utf-8');

  currentFilePath = targetPath;
  updateWindowTitle(targetPath);

  return { filePath: targetPath };
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendToRenderer('menu:new')
        },
        {
          label: 'Open…',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const file = await openFileDialog();

            if (file) {
              sendToRenderer('menu:open', file);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendToRenderer('menu:save', { filePath: currentFilePath })
        },
        {
          label: 'Save As…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendToRenderer('menu:save-as')
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
      ]
    },
    {
      label: 'Simulation',
      submenu: [
        {
          label: 'Toggle Token Simulation',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => sendToRenderer('menu:toggle-simulation')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'bpmn.io',
          click: () => shell.openExternal('https://bpmn.io')
        },
        {
          label: 'Token Simulation Demo',
          click: () => shell.openExternal('https://bpmn-io.github.io/bpmn-js-token-simulation/modeler.html')
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('file:open', openFileDialog);

ipcMain.handle('file:save', async (_event, { xml, filePath }) => {
  return saveFileDialog(xml, filePath);
});

ipcMain.handle('file:save-as', async (_event, { xml }) => {
  return saveFileDialog(xml);
});

ipcMain.handle('file:get-current-path', () => currentFilePath);

ipcMain.on('file:path-changed', (_event, filePath) => {
  currentFilePath = filePath;
  updateWindowTitle(filePath);
});

app.whenReady().then(() => {
  buildMenu();
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
