import { t } from './app-ui-i18n.js';
import { getLocale } from './i18n.js';

const dialog = document.querySelector('#recording-dialog');
const progressOverlay = document.querySelector('#recording-progress');
const formatSelect = document.querySelector('#recording-format');
const modeSelect = document.querySelector('#recording-mode');
const modeDescription = document.querySelector('#recording-mode-description');
const cropModeSelect = document.querySelector('#recording-crop-mode');
const cropPaddingField = document.querySelector('#recording-crop-padding-field');
const cropPaddingInput = document.querySelector('#recording-crop-padding');
const cropHint = document.querySelector('#recording-crop-hint');
const startButton = document.querySelector('#recording-start');
const progressBar = document.querySelector('#recording-progress-bar');
const progressLabel = document.querySelector('#recording-progress-label');
const progressCancelButton = document.querySelector('#recording-progress-cancel');
const progressStopButton = document.querySelector('#recording-progress-stop');

let activeAbortController = null;
let stopRequested = false;

function getPhaseLabels(locale = getLocale()) {
  return {
    prepare: t('recording.progress.prepare', locale),
    wait: t('recording.progress.wait', locale),
    record: t('recording.progress.record', locale),
    encode: t('recording.progress.encode', locale)
  };
}

function updateCropFieldsVisibility(locale = getLocale()) {
  const cropMode = cropModeSelect.value;
  cropPaddingField.hidden = cropMode !== 'custom';
  cropHint.hidden = cropMode !== 'manual';
  startButton.textContent = cropMode === 'manual'
    ? t('recording.drawArea', locale)
    : t('recording.start', locale);
}

function updateModeDescription(locale = getLocale()) {
  modeDescription.textContent = t(`recording.modeDescription.${modeSelect.value}`, locale);
}

export function initRecordingUi() {
  document.querySelector('#recording-cancel').addEventListener('click', () => {
    dialog.close();
  });

  progressCancelButton.addEventListener('click', () => {
    activeAbortController?.abort();
  });

  progressStopButton.addEventListener('click', () => {
    stopRequested = true;
  });

  modeSelect.addEventListener('change', () => {
    updateModeDescription();
  });

  cropModeSelect.addEventListener('change', updateCropFieldsVisibility);
}

export function requestAnimationExport() {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      startButton.removeEventListener('click', handleStart);
      dialog.removeEventListener('cancel', handleCancel);
    };

    const finish = (action, value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      dialog.close();
      action(value);
    };

    const handleStart = () => {
      finish(resolve, {
        format: formatSelect.value,
        recordMode: modeSelect.value,
        cropOptions: {
          cropMode: cropModeSelect.value,
          cropPadding: Number.parseInt(cropPaddingInput.value, 10)
        }
      });
    };

    const handleCancel = () => {
      finish(reject, new DOMException('Recording cancelled', 'AbortError'));
    };

    updateModeDescription();
    updateCropFieldsVisibility();
    formatSelect.value = 'simulation-png';
    startButton.addEventListener('click', handleStart);
    dialog.addEventListener('cancel', handleCancel);
    dialog.showModal();
  });
}

export function beginRecordingProgress({ recordMode = 'auto' } = {}) {
  const locale = getLocale();
  const phaseLabels = getPhaseLabels(locale);

  activeAbortController = new AbortController();
  stopRequested = false;
  progressOverlay.classList.add('visible');
  progressBar.value = 0;
  progressLabel.textContent = phaseLabels.prepare;
  progressStopButton.hidden = recordMode !== 'interactive';
  progressCancelButton.textContent = t('recording.cancel', locale);

  return {
    signal: activeAbortController.signal,
    stopRequested: () => stopRequested,
    updateProgress({ phase = 'record', ratio = 0 }) {
      const percent = Math.round(ratio * 100);
      progressBar.value = percent;
      progressLabel.textContent = `${phaseLabels[phase] ?? phaseLabels.record} ${percent}%`;
    },
    finish() {
      progressOverlay.classList.remove('visible');
      progressStopButton.hidden = true;
      activeAbortController = null;
      stopRequested = false;
    },
    cancel() {
      activeAbortController?.abort();
    }
  };
}

export function refreshRecordingUi(locale = getLocale()) {
  updateModeDescription(locale);
  updateCropFieldsVisibility(locale);
}
