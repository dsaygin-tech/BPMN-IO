const dialog = document.querySelector('#recording-dialog');
const progressOverlay = document.querySelector('#recording-progress');
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

const PHASE_LABELS = {
  prepare: 'Preparing simulation...',
  wait: 'Waiting for simulation start...',
  record: 'Recording animation...',
  encode: 'Encoding file...'
};

const MODE_DESCRIPTIONS = {
  auto: 'Simulation starts automatically from the beginning. Recording stops when all tokens finish.',
  interactive: 'Start the simulation yourself. Recording stops when you click Stop or when a final end event is reached.'
};

function updateCropFieldsVisibility() {
  const cropMode = cropModeSelect.value;
  cropPaddingField.hidden = cropMode !== 'custom';
  cropHint.hidden = cropMode !== 'manual';
  startButton.textContent = cropMode === 'manual' ? 'Draw area…' : 'Start export';
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
    modeDescription.textContent = MODE_DESCRIPTIONS[modeSelect.value] ?? MODE_DESCRIPTIONS.auto;
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
        format: 'simulation-webm',
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

    modeDescription.textContent = MODE_DESCRIPTIONS[modeSelect.value] ?? MODE_DESCRIPTIONS.auto;
    updateCropFieldsVisibility();
    startButton.addEventListener('click', handleStart);
    dialog.addEventListener('cancel', handleCancel);
    dialog.showModal();
  });
}

export function beginRecordingProgress({ recordMode = 'auto' } = {}) {
  activeAbortController = new AbortController();
  stopRequested = false;
  progressOverlay.classList.add('visible');
  progressBar.value = 0;
  progressLabel.textContent = PHASE_LABELS.prepare;
  progressStopButton.hidden = recordMode !== 'interactive';
  progressCancelButton.textContent = 'Cancel';

  return {
    signal: activeAbortController.signal,
    stopRequested: () => stopRequested,
    updateProgress({ phase = 'record', ratio = 0 }) {
      const percent = Math.round(ratio * 100);
      progressBar.value = percent;
      progressLabel.textContent = `${PHASE_LABELS[phase] ?? PHASE_LABELS.record} ${percent}%`;
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
