import { isTextInputTarget } from './keyboard-input.js';

function isCmd(event) {
  if (event.altKey) {
    return false;
  }

  return event.ctrlKey || event.metaKey;
}

export function initAppShortcuts({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onToggleSimulation
}) {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || isTextInputTarget(event.target) || !isCmd(event)) {
      return;
    }

    if (event.code === 'KeyN' && !event.shiftKey) {
      event.preventDefault();
      onNew();
      return;
    }

    if (event.code === 'KeyO' && !event.shiftKey) {
      event.preventDefault();
      onOpen();
      return;
    }

    if (event.code === 'KeyS' && event.shiftKey) {
      event.preventDefault();
      onSaveAs();
      return;
    }

    if (event.code === 'KeyS' && !event.shiftKey) {
      event.preventDefault();
      onSave();
      return;
    }

    if (event.code === 'KeyT' && event.shiftKey) {
      event.preventDefault();
      onToggleSimulation();
    }
  });
}
