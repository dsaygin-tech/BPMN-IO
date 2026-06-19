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
  await loadDiagram(content);
  setFileName(filePath);
}

async function saveDiagram(filePath = null) {
  const { xml } = await modeler.saveXML({ format: true });

  if (window.electronAPI) {
    const result = filePath
      ? await window.electronAPI.saveFile(xml, filePath)
      : await window.electronAPI.saveFileAs(xml);

    if (result?.filePath) {
      setFileName(result.filePath);
      setDirty(false);
    }

    return;
  }

  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filePath || 'diagram.bpmn';
  link.click();
  URL.revokeObjectURL(url);
  setDirty(false);
}

function toggleSimulation() {
  const toggleMode = modeler.get('toggleMode');
  toggleMode.toggleMode();
}

modeler.on('commandStack.changed', () => {
  setDirty(true);
});

document.querySelector('#btn-new').addEventListener('click', createNewDiagram);
document.querySelector('#btn-open').addEventListener('click', async () => {
  if (!window.electronAPI) {
    return;
  }

  const file = await window.electronAPI.openFile();

  if (file) {
    await openDiagram(file.content, file.filePath);
  }
});
document.querySelector('#btn-save').addEventListener('click', () => saveDiagram(currentFilePath));
document.querySelector('#btn-save-as').addEventListener('click', () => saveDiagram());
simulationButton.addEventListener('click', toggleSimulation);

if (window.electronAPI) {
  window.electronAPI.onMenu('menu:new', createNewDiagram);
  window.electronAPI.onMenu('menu:open', (file) => openDiagram(file.content, file.filePath));
  window.electronAPI.onMenu('menu:save', ({ filePath }) => saveDiagram(filePath));
  window.electronAPI.onMenu('menu:save-as', () => saveDiagram());
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
