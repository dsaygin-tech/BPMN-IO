import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

const EXPORT_FILTERS = {
  bpmn: [
    { name: 'BPMN diagrams', extensions: ['bpmn'] },
    { name: 'XML files', extensions: ['xml'] }
  ],
  svg: [{ name: 'SVG images', extensions: ['svg'] }],
  png: [{ name: 'PNG images', extensions: ['png'] }],
  pdf: [{ name: 'PDF documents', extensions: ['pdf'] }],
  json: [{ name: 'JSON files', extensions: ['json'] }],
  gif: [{ name: 'GIF animations', extensions: ['gif'] }],
  webm: [{ name: 'WebM videos', extensions: ['webm'] }]
};

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {string | null} */
let currentFilePath = null;

/** @type {string | null} */
let pendingOpenFilePath = null;

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

  mainWindow.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (pendingOpenFilePath) {
    openFileByPath(pendingOpenFilePath);
    pendingOpenFilePath = null;
  }
}

function sendToRenderer(channel, payload) {
  mainWindow?.webContents.send(channel, payload);
}

function updateWindowTitle(filePath) {
  const name = filePath ? filePath.split(/[/\\]/).pop() : 'Untitled';
  mainWindow?.setTitle(`${name} — BPMN-IO`);
}

async function readFileByPath(filePath) {
  const content = await readFile(filePath, 'utf-8');

  currentFilePath = filePath;
  updateWindowTitle(filePath);

  return { filePath, content };
}

async function openFileByPath(filePath) {
  try {
    const file = await readFileByPath(filePath);
    sendToRenderer('menu:open', file);
  } catch (error) {
    dialog.showErrorBox('Open failed', `Could not open file:\n${error.message}`);
  }
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

  return readFileByPath(result.filePaths[0]);
}

async function saveFileDialog(xml, filePath = null) {
  let targetPath = filePath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save BPMN diagram',
      defaultPath: 'diagram.bpmn',
      filters: EXPORT_FILTERS.bpmn
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

async function exportFileDialog({ content, defaultPath, format, encoding }) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export diagram',
    defaultPath,
    filters: EXPORT_FILTERS[format] || [{ name: 'All files', extensions: ['*'] }]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  if (encoding === 'binary') {
    await writeFile(result.filePath, Buffer.from(content, 'base64'));
  } else {
    await writeFile(result.filePath, content, 'utf-8');
  }

  if (format === 'bpmn') {
    currentFilePath = result.filePath;
    updateWindowTitle(result.filePath);
  }

  return { filePath: result.filePath };
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
        {
          label: 'Export',
          submenu: [
            {
              label: 'BPMN (.bpmn)…',
              click: () => sendToRenderer('menu:export', { format: 'bpmn' })
            },
            {
              label: 'SVG (.svg)…',
              click: () => sendToRenderer('menu:export', { format: 'svg' })
            },
            {
              label: 'PNG (.png)…',
              click: () => sendToRenderer('menu:export', { format: 'png' })
            },
            {
              label: 'PDF (.pdf)…',
              click: () => sendToRenderer('menu:export', { format: 'pdf' })
            },
            {
              label: 'JSON (.json)…',
              click: () => sendToRenderer('menu:export', { format: 'json' })
            },
            { type: 'separator' },
            {
              label: 'Simulation PNG (.png)…',
              click: () => sendToRenderer('menu:export', { format: 'simulation-png' })
            },
            {
              label: 'Simulation PDF (.pdf)…',
              click: () => sendToRenderer('menu:export', { format: 'simulation-pdf' })
            },
            {
              label: 'Simulation GIF (.gif)…',
              click: () => sendToRenderer('menu:export', { format: 'simulation-gif' })
            },
            {
              label: 'Simulation WebM (.webm)…',
              click: () => sendToRenderer('menu:export', { format: 'simulation-webm' })
            }
          ]
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
        },
        { type: 'separator' },
        {
          label: 'Pause / Resume',
          accelerator: 'Space',
          click: () => sendToRenderer('menu:simulation-pause')
        },
        {
          label: 'Reset Simulation',
          accelerator: 'R',
          click: () => sendToRenderer('menu:simulation-reset')
        },
        {
          label: 'Toggle Simulation Log',
          accelerator: 'L',
          click: () => sendToRenderer('menu:simulation-log')
        },
        { type: 'separator' },
        {
          label: 'Start Mode',
          submenu: [
            {
              label: 'Interactive',
              type: 'radio',
              click: () => sendToRenderer('menu:simulation-start-mode', { mode: 'interactive' })
            },
            {
              label: 'Auto-start',
              type: 'radio',
              checked: true,
              click: () => sendToRenderer('menu:simulation-start-mode', { mode: 'auto' })
            }
          ]
        },
        {
          label: 'Step Mode',
          type: 'checkbox',
          click: (menuItem) => sendToRenderer('menu:simulation-step-mode', { enabled: menuItem.checked })
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

ipcMain.handle('capture:region', async (_event, rect, options = {}) => {
  if (!mainWindow) {
    return null;
  }

  const image = await mainWindow.webContents.capturePage({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  });

  if (options.format === 'png') {
    return image.toPNG().toString('base64');
  }

  return image.toJPEG(92).toString('base64');
});

ipcMain.handle('file:open', openFileDialog);

ipcMain.handle('file:read', async (_event, filePath) => {
  return readFileByPath(filePath);
});

ipcMain.handle('file:save', async (_event, { xml, filePath }) => {
  return saveFileDialog(xml, filePath);
});

ipcMain.handle('file:save-as', async (_event, { xml }) => {
  return saveFileDialog(xml);
});

ipcMain.handle('file:export', async (_event, payload) => {
  return exportFileDialog(payload);
});

ipcMain.handle('file:get-current-path', () => currentFilePath);

ipcMain.on('file:path-changed', (_event, filePath) => {
  currentFilePath = filePath;
  updateWindowTitle(filePath);
});

if (process.platform === 'darwin') {
  app.on('open-file', (event, filePath) => {
    event.preventDefault();

    if (mainWindow) {
      openFileByPath(filePath);
    } else {
      pendingOpenFilePath = filePath;
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const filePath = argv.find((arg) => /\.(bpmn|xml)$/i.test(arg));

    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }

      mainWindow.focus();

      if (filePath) {
        openFileByPath(filePath);
      }
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();

    const startupFile = process.argv.find((arg) => /\.(bpmn|xml)$/i.test(arg));

    if (startupFile && mainWindow) {
      openFileByPath(startupFile);
    }

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
}
