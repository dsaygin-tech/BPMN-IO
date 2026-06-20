import BpmnModeler from 'bpmn-js/lib/Modeler';
import TokenSimulationModule from 'bpmn-js-token-simulation';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css';

import newDiagram from './resources/newDiagram.bpmn?raw';
import { downloadExport, exportDiagram, getDefaultExportName } from './export.js';
import { initExportMenu, renderExportMenu } from './export-ui.js';
import {
  confirmDiscardChanges,
  initFileDrop,
  initFileInput
} from './file-open.js';

const fileNameEl = document.querySelector('#file-name');
const dirtyIndicatorEl = document.querySelector('#dirty-indicator');
const simulationButton = document.querySelector('#btn-simulation');
const propertiesPanel = document.querySelector('#properties-panel');
const propertiesPanelResizer = document.querySelector('#properties-panel-resizer');

let currentFilePath = null;
let isDirty = false;

const DesktopModule = {
  __init__: [
    [
      'eventBus',
      'toggleMode',
      function (eventBus, toggleMode) {
        eventBus.on('tokenSimulation.toggleMode', (event) => {
          document.body.classList.toggle('token-simulation-active', event.active);
          simulationButton.classList.toggle('active', event.active);
          simulationButton.textContent = event.active
            ? 'Exit Simulation'
            : 'Token Simulation';
        });
      }
    ]
  ]
};

const modeler = new BpmnModeler({
  container: '#canvas',
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TokenSimulationModule,
    DesktopModule
  ],
  propertiesPanel: {
    parent: '#properties-panel'
  }
});

function setDirty(dirty) {
  isDirty = dirty;
  dirtyIndicatorEl.hidden = !dirty;
}

function setFileName(filePath) {
  currentFilePath = filePath;
  const name = filePath ? filePath.split(/[/\\]/).pop() : 'Untitled';
  fileNameEl.textContent = name;

  if (window.electronAPI) {
    window.electronAPI.setCurrentPath(filePath);
  }
}

async function loadDiagram(xml) {
  const { warnings } = await modeler.importXML(xml);

  if (warnings.length) {
    console.warn(warnings);
  }

  modeler.get('canvas').zoom('fit-viewport');
  setDirty(false);
}

async function createNewDiagram() {
  if (isDirty && !confirm('Discard unsaved changes?')) {
    return;
  }

  await loadDiagram(newDiagram);
  setFileName(null);
}

async function openDiagram(content, filePath = null) {
  if (!confirmDiscardChanges(isDirty)) {
    return;
  }

  try {
    await loadDiagram(content);
    setFileName(filePath);
  } catch (error) {
    console.error(error);
    alert(`Failed to open diagram: ${error.message}`);
  }
}

async function openFileFromDialog() {
  if (window.electronAPI) {
    const file = await window.electronAPI.openFile();

    if (file) {
      await openDiagram(file.content, file.filePath);
    }

    return;
  }

  openFilePicker();
}

async function saveDiagram(filePath = null) {
  await exportDiagramToFormat('bpmn', filePath);
}

async function exportDiagramToFormat(format, filePath = null) {
  const exportData = await exportDiagram(modeler, format);
  const defaultName = getDefaultExportName(currentFilePath, format);

  if (window.electronAPI) {
    const result = await window.electronAPI.exportFile({
      ...exportData,
      defaultPath: filePath || defaultName,
      format
    });

    if (result?.filePath && format === 'bpmn') {
      setFileName(result.filePath);
      setDirty(false);
    }

    return;
  }

  downloadExport(exportData, defaultName);

  if (format === 'bpmn') {
    setDirty(false);
  }
}

function toggleSimulation() {
  const toggleMode = modeler.get('toggleMode');
  toggleMode.toggleMode();
}

modeler.on('commandStack.changed', () => {
  setDirty(true);
});

document.querySelector('#btn-new').addEventListener('click', createNewDiagram);
document.querySelector('#btn-open').addEventListener('click', openFileFromDialog);
document.querySelector('#btn-save').addEventListener('click', () => saveDiagram(currentFilePath));
document.querySelector('#btn-save-as').addEventListener('click', () => saveDiagram());
simulationButton.addEventListener('click', toggleSimulation);

renderExportMenu();
initExportMenu({
  onExport: (format) => exportDiagramToFormat(format)
});

const openFilePicker = initFileInput({
  onOpenFile: ({ content, filePath }) => openDiagram(content, filePath)
});

initFileDrop({
  onOpenFile: ({ content, filePath }) => openDiagram(content, filePath)
});

if (window.electronAPI) {
  window.electronAPI.onMenu('menu:new', createNewDiagram);
  window.electronAPI.onMenu('menu:open', (file) => openDiagram(file.content, file.filePath));
  window.electronAPI.onMenu('menu:save', ({ filePath }) => saveDiagram(filePath));
  window.electronAPI.onMenu('menu:save-as', () => saveDiagram());
  window.electronAPI.onMenu('menu:export', ({ format }) => exportDiagramToFormat(format));
  window.electronAPI.onMenu('menu:toggle-simulation', toggleSimulation);

  window.electronAPI.getCurrentPath().then((path) => {
    if (path) {
      setFileName(path);
    }
  });
}

let startX;
let startWidth;

propertiesPanelResizer.addEventListener('click', () => {
  propertiesPanel.classList.toggle('open');
});

propertiesPanelResizer.addEventListener('dragstart', (event) => {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  event.dataTransfer.setDragImage(img, 1, 1);
  startX = event.screenX;
  startWidth = propertiesPanel.getBoundingClientRect().width;
});

propertiesPanelResizer.addEventListener('drag', (event) => {
  if (!event.screenX) {
    return;
  }

  const width = startWidth - (event.screenX - startX);
  const open = width > 200;

  propertiesPanel.style.width = open ? `${width}px` : null;
  propertiesPanel.classList.toggle('open', open);
});

loadDiagram(newDiagram).catch((error) => {
  console.error('Failed to load initial diagram', error);
});
