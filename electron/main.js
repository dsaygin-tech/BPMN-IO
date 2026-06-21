import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { menuT } from './menu-i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

function getExportFilters(locale) {
  return {
    bpmn: [
      { name: menuT('bpmnDiagrams', locale), extensions: ['bpmn'] },
      { name: menuT('xmlFiles', locale), extensions: ['xml'] }
    ],
    svg: [{ name: menuT('svgImages', locale), extensions: ['svg'] }],
    png: [{ name: menuT('pngImages', locale), extensions: ['png'] }],
    pdf: [{ name: menuT('pdfDocuments', locale), extensions: ['pdf'] }],
    json: [{ name: menuT('jsonFilesFilter', locale), extensions: ['json'] }],
    gif: [{ name: menuT('gifAnimations', locale), extensions: ['gif'] }],
    webm: [{ name: menuT('webmVideos', locale), extensions: ['webm'] }]
  };
}

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {string | null} */
let currentFilePath = null;

/** @type {string | null} */
let pendingOpenFilePath = null;

let appLocale = 'ru';

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
      preload: join(__dirname, 'preload.cjs'),
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
  const name = filePath ? filePath.split(/[/\\]/).pop() : menuT('untitled', appLocale);
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
    dialog.showErrorBox(
      menuT('openFailedTitle', appLocale),
      menuT('openFailedMessage', appLocale, { message: error.message })
    );
  }
}

async function openFileDialog() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: menuT('openDialogTitle', appLocale),
    filters: [
      { name: menuT('bpmnDiagrams', appLocale), extensions: ['bpmn', 'xml'] },
      { name: menuT('allFiles', appLocale), extensions: ['*'] }
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
  const exportFilters = getExportFilters(appLocale);

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: menuT('saveDialogTitle', appLocale),
      defaultPath: 'diagram.bpmn',
      filters: exportFilters.bpmn
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
  const exportFilters = getExportFilters(appLocale);
  const result = await dialog.showSaveDialog(mainWindow, {
    title: menuT('exportDialogTitle', appLocale),
    defaultPath,
    filters: exportFilters[format] || [{ name: menuT('allFiles', appLocale), extensions: ['*'] }]
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

function buildMenu(locale = appLocale) {
  const template = [
    {
      label: menuT('file', locale),
      submenu: [
        {
          label: menuT('new', locale),
          click: () => sendToRenderer('menu:new')
        },
        {
          label: menuT('open', locale),
          click: async () => {
            const file = await openFileDialog();

            if (file) {
              sendToRenderer('menu:open', file);
            }
          }
        },
        { type: 'separator' },
        {
          label: menuT('save', locale),
          click: () => sendToRenderer('menu:save', { filePath: currentFilePath })
        },
        {
          label: menuT('saveAs', locale),
          click: () => sendToRenderer('menu:save-as')
        },
        { type: 'separator' },
        {
          label: menuT('export', locale),
          submenu: [
            {
              label: menuT('exportBpmn', locale),
              click: () => sendToRenderer('menu:export', { format: 'bpmn' })
            },
            {
              label: menuT('exportSvg', locale),
              click: () => sendToRenderer('menu:export', { format: 'svg' })
            },
            {
              label: menuT('exportPng', locale),
              click: () => sendToRenderer('menu:export', { format: 'png' })
            },
            {
              label: menuT('exportPdf', locale),
              click: () => sendToRenderer('menu:export', { format: 'pdf' })
            },
            {
              label: menuT('exportJson', locale),
              click: () => sendToRenderer('menu:export', { format: 'json' })
            },
            { type: 'separator' },
            {
              label: menuT('exportSimulationPng', locale),
              click: () => sendToRenderer('menu:export', { format: 'simulation-png' })
            },
            {
              label: menuT('exportSimulationWebm', locale),
              click: () => sendToRenderer('menu:export', { format: 'simulation-webm' })
            }
          ]
        },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' }
      ]
    },
    {
      label: menuT('simulation', locale),
      submenu: [
        {
          label: menuT('toggleSimulation', locale),
          click: () => sendToRenderer('menu:toggle-simulation')
        },
        { type: 'separator' },
        {
          label: menuT('pauseResume', locale),
          click: () => sendToRenderer('menu:simulation-pause')
        },
        {
          label: menuT('resetSimulation', locale),
          click: () => sendToRenderer('menu:simulation-reset')
        },
        {
          label: menuT('toggleLog', locale),
          click: () => sendToRenderer('menu:simulation-log')
        },
        { type: 'separator' },
        {
          label: menuT('startMode', locale),
          submenu: [
            {
              label: menuT('interactive', locale),
              type: 'radio',
              click: () => sendToRenderer('menu:simulation-start-mode', { mode: 'interactive' })
            },
            {
              label: menuT('autoStart', locale),
              type: 'radio',
              checked: true,
              click: () => sendToRenderer('menu:simulation-start-mode', { mode: 'auto' })
            }
          ]
        },
        {
          label: menuT('stepMode', locale),
          type: 'checkbox',
          click: (menuItem) => sendToRenderer('menu:simulation-step-mode', { enabled: menuItem.checked })
        }
      ]
    },
    {
      label: menuT('view', locale),
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
      label: menuT('help', locale),
      submenu: [
        {
          label: 'bpmn.io',
          click: () => shell.openExternal('https://bpmn.io')
        },
        {
          label: menuT('tokenSimulationDemo', locale),
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

ipcMain.on('app:set-locale', (_event, locale) => {
  if (!locale || locale === appLocale) {
    return;
  }

  appLocale = locale;
  buildMenu(locale);
  updateWindowTitle(currentFilePath);
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
