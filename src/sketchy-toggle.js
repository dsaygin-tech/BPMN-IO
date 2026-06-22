import { t } from './app-ui-i18n.js';

export const SKETCHY_FONT_FAMILY = '"Caveat", cursive';

export const SKETCHY_TEXT_RENDERER = {
  defaultStyle: {
    fontFamily: SKETCHY_FONT_FAMILY,
    fontWeight: 'normal',
    fontSize: 16,
    lineHeight: 1.1
  },
  externalStyle: {
    fontSize: 15,
    lineHeight: 1.1
  }
};

let sketchyEnabled = false;

export function isSketchyEnabled() {
  return sketchyEnabled;
}

export function setSketchyEnabled(enabled) {
  sketchyEnabled = Boolean(enabled);
  document.body.classList.toggle('sketchy-active', sketchyEnabled);
}

export function initSketchyUi({ toggle, onToggle }) {
  localStorage.removeItem('bpmn-io-sketchy-enabled');
  setSketchyEnabled(false);
  toggle.checked = false;

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
