import BpmnModeler from 'bpmn-js/lib/Modeler';
import TokenSimulationModule from 'bpmn-js-token-simulation';
import SimulationSupportModule from 'bpmn-js-token-simulation/lib/simulation-support';
import lintModule from 'bpmn-js-bpmnlint';
import BpmnColorPickerModule from 'bpmn-js-color-picker';
import { CreateAppendAnythingModule } from 'bpmn-js-create-append-anything';
import sketchyRendererModule from 'bpmn-js-sketchy';
import {
  SKETCHY_TEXT_RENDERER,
  initSketchyUi,
  isSketchyEnabled
} from './sketchy-toggle.js';
import gridModule from 'diagram-js-grid';
import minimapModule from 'diagram-js-minimap';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
import {
  createTranslateModule,
  getLocale,
  initLocaleUi
} from './i18n.js';
import { applyAppUiLocale, t } from './app-ui-i18n.js';
import { translateUserMessage } from './user-messages.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css';
import 'bpmn-js-bpmnlint/dist/assets/css/bpmn-js-bpmnlint.css';
import 'diagram-js-minimap/assets/diagram-js-minimap.css';
import 'bpmn-js-color-picker/colors/color-picker.css';

import bpmnlintConfig from './bpmnlint-config.js';

import newDiagram from './resources/newDiagram.bpmn?raw';
import { downloadExport, exportDiagram, exportSimulationAnimation, EXPORT_FORMATS, getDefaultExportName } from './export.js';
import { initExportMenu } from './export-ui.js';
import {
  beginRecordingProgress,
  initRecordingUi,
  refreshRecordingUi,
  requestAnimationExport
} from './recording-ui.js';
import { requestManualCropArea } from './crop-selector.js';
import {
  confirmDiscardChanges,
  initFileDrop,
  initFileInput
} from './file-open.js';
import { initSimulationUi } from './simulation-ui.js';
import { CyrillicKeyboardModule } from './keyboard-layout.js';
import { initAppShortcuts } from './app-shortcuts.js';
import { initKeyboardHelp } from './keyboard-help.js';
import PreserveElementColorsModule from './preserve-element-colors-module.js';
import ContextPadLayoutModule from './context-pad-layout.js';

const fileNameEl = document.querySelector('#file-name');
const dirtyIndicatorEl = document.querySelector('#dirty-indicator');
const propertiesPanel = document.querySelector('#properties-panel');
const propertiesPanelResizer = document.querySelector('#properties-panel-resizer');

let currentFilePath = null;
let isDirty = false;
let refreshExportMenu = null;
let exportSimulationButton = null;
let simulationUi = null;
let keyboardHelpUi = null;

const DesktopModule = {
  __init__: [
    [
      'eventBus',
      'toggleMode',
      'grid',
      function (eventBus, toggleMode, grid) {
        let gridVisibleBeforeSimulation = null;

        eventBus.on('tokenSimulation.toggleMode', (event) => {
          document.body.classList.toggle('token-simulation-active', event.active);
          exportSimulationButton.hidden = !event.active;
          refreshExportMenu?.();

          if (event.active) {
            gridVisibleBeforeSimulation = grid.isVisible();
            grid.toggle(false);
          } else if (gridVisibleBeforeSimulation !== null) {
            grid.toggle(gridVisibleBeforeSimulation);
            gridVisibleBeforeSimulation = null;
          }
        });
      }
    ]
  ]
};

function getModelerOptions() {
  return {
    sketchyEnabled: isSketchyEnabled(),
    locale: getLocale()
  };
}

function buildAdditionalModules({ sketchyEnabled, locale }) {
  const modules = [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    TokenSimulationModule,
    SimulationSupportModule,
    PreserveElementColorsModule,
    lintModule,
    BpmnColorPickerModule,
    CreateAppendAnythingModule,
    gridModule,
    minimapModule,
    createTranslateModule(locale),
    CyrillicKeyboardModule,
    DesktopModule,
    ContextPadLayoutModule
  ];

  if (sketchyEnabled) {
    modules.push(sketchyRendererModule);
  }

  return modules;
}

function createModeler({ sketchyEnabled, locale }) {
  return new BpmnModeler({
    container: '#canvas',
    linting: {
      bpmnlint: bpmnlintConfig
    },
    ...(sketchyEnabled ? { textRenderer: SKETCHY_TEXT_RENDERER } : {}),
    additionalModules: buildAdditionalModules({ sketchyEnabled, locale }),
    propertiesPanel: {
      parent: '#properties-panel'
    }
  });
}

let suppressDirtyTracking = false;

function onCommandStackChanged() {
  if (suppressDirtyTracking) {
    return;
  }

  setDirty(true);
}

function attachModeler(modelerInstance) {
  simulationUi?.dispose();
  simulationUi = initSimulationUi({
    modeler: modelerInstance,
    onSimulationActiveChange: () => {
      refreshExportMenu?.();
    }
  });

  modelerInstance.on('commandStack.changed', onCommandStackChanged);
}

let modeler = createModeler(getModelerOptions());

async function recreateModeler(options = getModelerOptions()) {
  const wasDirty = isDirty;
  const { xml } = await modeler.saveXML({ format: true });
  const viewbox = modeler.get('canvas').viewbox();

  modeler.destroy();
  modeler = createModeler(options);
  attachModeler(modeler);

  suppressDirtyTracking = true;

  try {
    const { warnings } = await modeler.importXML(xml);

    if (warnings.length) {
      console.warn(warnings);
    }

    modeler.get('canvas').viewbox(viewbox);
    setDirty(wasDirty);
  } finally {
    suppressDirtyTracking = false;
  }
}

function setDirty(dirty) {
  isDirty = dirty;
  dirtyIndicatorEl.hidden = !dirty;
  dirtyIndicatorEl.textContent = dirty ? '• unsaved' : '';
  fileNameEl.textContent = `${dirty ? '* ' : ''}${currentFilePath ? currentFilePath.split(/[/\\]/).pop() : t('file.untitled')}`;
}

function setFileName(filePath) {
  currentFilePath = filePath;
  fileNameEl.textContent = `${isDirty ? '* ' : ''}${filePath ? filePath.split(/[/\\]/).pop() : t('file.untitled')}`;

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
  if (isDirty && !confirm(t('confirm.discardChanges'))) {
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
    alert(t('alert.openFailed', undefined, { message: error.message }));
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
  try {
    const exportData = await exportDiagram(modeler, 'bpmn');
    const { content } = exportData;

    if (window.electronAPI) {
      const result = filePath
        ? await window.electronAPI.saveFile(content, filePath)
        : await window.electronAPI.saveFileAs(content);

      if (result?.filePath) {
        setFileName(result.filePath);
        setDirty(false);
      }

      return;
    }

    await saveExportResult(exportData, 'bpmn', filePath);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    console.error(error);
    alert(translateUserMessage(error.message));
  }
}

async function saveExportResult(exportData, format, filePath = null) {
  const defaultName = getDefaultExportName(currentFilePath, format);

  if (window.electronAPI) {
    const result = await window.electronAPI.exportFile({
      ...exportData,
      defaultPath: filePath || defaultName,
      format: format.replace('simulation-', '')
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

async function exportSimulationAnimationToFile(format = null) {
  let selectedFormat = format;
  let recordMode = 'auto';
  let cropOptions = {};

  try {
    if (!selectedFormat) {
      const settings = await requestAnimationExport();
      selectedFormat = settings.format;
      recordMode = settings.recordMode ?? 'auto';
      cropOptions = settings.cropOptions ?? {};
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    throw error;
  }

  if (cropOptions.cropMode === 'manual') {
    try {
      const customViewBox = await requestManualCropArea(modeler);
      cropOptions = { ...cropOptions, customViewBox };
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }

      throw error;
    }
  }

  const progress = beginRecordingProgress({ recordMode });

  try {
    const exportData = await exportSimulationAnimation(modeler, selectedFormat, {
      onProgress: progress.updateProgress,
      signal: progress.signal,
      recordMode,
      stopRequested: progress.stopRequested,
      cropOptions
    });

    await saveExportResult(exportData, selectedFormat);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    throw error;
  } finally {
    progress.finish();
  }
}

async function exportDiagramToFormat(format, filePath = null) {
  try {
    if (EXPORT_FORMATS[format]?.isAnimated) {
      await exportSimulationAnimationToFile(format);
      return;
    }

    const exportData = await exportDiagram(modeler, format);
    await saveExportResult(exportData, format, filePath);
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }

    console.error(error);
    alert(translateUserMessage(error.message));
  }
}

function toggleSimulation() {
  modeler.get('toggleMode').toggleMode();
}

attachModeler(modeler);

initAppShortcuts({
  onNew: createNewDiagram,
  onOpen: openFileFromDialog,
  onSave: () => saveDiagram(currentFilePath || null),
  onSaveAs: () => saveDiagram(),
  onToggleSimulation: toggleSimulation
});

keyboardHelpUi = initKeyboardHelp({
  button: document.querySelector('#btn-shortcuts'),
  dialog: document.querySelector('#shortcuts-dialog'),
  content: document.querySelector('#shortcuts-content')
});

initSketchyUi({
  toggle: document.querySelector('#sketchy-mode'),
  onToggle: (sketchyEnabled) => recreateModeler({
    ...getModelerOptions(),
    sketchyEnabled
  })
});

initLocaleUi({
  select: document.querySelector('#locale-select'),
  onChange: async (locale) => {
    applyAppUiLocale(locale, {
      refreshExportMenu,
      refreshRecordingUi,
      refreshKeyboardHelp: (nextLocale) => keyboardHelpUi?.refresh(nextLocale)
    });

    if (currentFilePath === null) {
      fileNameEl.textContent = t('file.untitled', locale);
    }

    await recreateModeler({
      ...getModelerOptions(),
      locale
    });
  }
});

document.querySelector('#btn-new').addEventListener('click', createNewDiagram);
document.querySelector('#btn-open').addEventListener('click', openFileFromDialog);
document.querySelector('#btn-save').addEventListener('click', () => saveDiagram(currentFilePath || null));
document.querySelector('#btn-save-as').addEventListener('click', () => saveDiagram());

exportSimulationButton = document.querySelector('#btn-export-simulation');
exportSimulationButton.hidden = true;
exportSimulationButton.addEventListener('click', () => {
  exportSimulationAnimationToFile().catch((error) => {
    if (error.name !== 'AbortError') {
      console.error(error);
      alert(translateUserMessage(error.message));
    }
  });
});

initRecordingUi();

refreshExportMenu = initExportMenu({
  onExport: (format) => exportDiagramToFormat(format)
});

applyAppUiLocale(getLocale(), {
  refreshExportMenu,
  refreshRecordingUi,
  refreshKeyboardHelp: (locale) => keyboardHelpUi?.refresh(locale)
});
setFileName(currentFilePath);

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
  window.electronAPI.onMenu('menu:simulation-pause', () => simulationUi?.triggerPause());
  window.electronAPI.onMenu('menu:simulation-reset', () => simulationUi?.triggerReset());
  window.electronAPI.onMenu('menu:simulation-log', () => simulationUi?.triggerLog());
  window.electronAPI.onMenu('menu:simulation-start-mode', ({ mode }) => simulationUi?.setStartMode(mode));
  window.electronAPI.onMenu('menu:simulation-step-mode', ({ enabled }) => simulationUi?.setStepMode(enabled));

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
