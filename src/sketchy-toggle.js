import { t } from './app-ui-i18n.js';

export const SKETCHY_STORAGE_KEY = 'bpmn-io-sketchy-enabled';

export const SKETCHY_TEXT_RENDERER = {
  defaultStyle: {
    fontFamily: '"Nothing You Could Do", cursive',
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 1.1
  },
  externalStyle: {
    fontSize: 15,
    lineHeight: 1.1
  }
};

export function isSketchyEnabled() {
  return localStorage.getItem(SKETCHY_STORAGE_KEY) === 'true';
}

export function setSketchyEnabled(enabled) {
  localStorage.setItem(SKETCHY_STORAGE_KEY, String(enabled));
  document.body.classList.toggle('sketchy-active', enabled);
}

export function initSketchyUi({ toggle, onToggle }) {
  const enabled = isSketchyEnabled();

  toggle.checked = enabled;
  document.body.classList.toggle('sketchy-active', enabled);

  toggle.addEventListener('change', async () => {
    const next = toggle.checked;

    if (next === isSketchyEnabled()) {
      return;
    }

    toggle.disabled = true;

    try {
      setSketchyEnabled(next);
      await onToggle(next);
    } catch (error) {
      console.error('Failed to switch sketchy mode', error);
      setSketchyEnabled(!next);
      toggle.checked = isSketchyEnabled();
      alert(t('alert.sketchyFailed', undefined, { message: error.message }));
    } finally {
      toggle.disabled = false;
    }
  });
}
