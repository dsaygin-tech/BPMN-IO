import { t } from './app-ui-i18n.js';

const BPMN_EXTENSIONS = new Set(['bpmn', 'xml']);

export function isBpmnFileName(fileName) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return BPMN_EXTENSIONS.has(extension);
}

export function confirmDiscardChanges(isDirty) {
  if (!isDirty) {
    return true;
  }

  return confirm(t('confirm.discardChanges'));
}

export async function readLocalFile(file) {
  if (window.electronAPI?.readFile && file.path) {
    return window.electronAPI.readFile(file.path);
  }

  return {
    filePath: file.name,
    content: await file.text()
  };
}

export function initFileDrop({ onOpenFile }) {
  const overlay = document.querySelector('#drop-overlay');
  let dragDepth = 0;

  function showOverlay() {
    overlay?.classList.add('visible');
  }

  function hideOverlay() {
    dragDepth = 0;
    overlay?.classList.remove('visible');
  }

  function isFileDrag(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  document.addEventListener('dragenter', (event) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    dragDepth += 1;
    showOverlay();
  });

  document.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  document.addEventListener('dragleave', (event) => {
    if (!isFileDrag(event)) {
      return;
    }

    dragDepth = Math.max(0, dragDepth - 1);

    if (dragDepth === 0) {
      hideOverlay();
    }
  });

  document.addEventListener('drop', async (event) => {
    if (!isFileDrag(event)) {
      return;
    }

    event.preventDefault();
    hideOverlay();

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    if (!isBpmnFileName(file.name)) {
      alert(t('alert.unsupportedFile'));
      return;
    }

    try {
      const openedFile = await readLocalFile(file);
      await onOpenFile(openedFile);
    } catch (error) {
      console.error(error);
      alert(t('alert.fileOpenFailed', undefined, { message: error.message }));
    }
  });
}

export function initFileInput({ onOpenFile }) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.bpmn,.xml,application/xml,text/xml';
  input.hidden = true;
  document.body.appendChild(input);

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    try {
      const openedFile = await readLocalFile(file);
      await onOpenFile(openedFile);
    } catch (error) {
      console.error(error);
      alert(t('alert.fileOpenFailed', undefined, { message: error.message }));
    }
  });

  return () => {
    input.click();
  };
}
