const dialog = document.querySelector('#recording-dialog');
const progressOverlay = document.querySelector('#recording-progress');
const formatSelect = document.querySelector('#recording-format');
const startButton = document.querySelector('#recording-start');
const progressBar = document.querySelector('#recording-progress-bar');
const progressLabel = document.querySelector('#recording-progress-label');

let activeAbortController = null;

const PHASE_LABELS = {
  prepare: 'Preparing simulation...',
  record: 'Recording animation...',
  encode: 'Encoding file...'
};

export function initRecordingUi() {
  document.querySelector('#recording-cancel').addEventListener('click', () => {
    dialog.close();
  });

  document.querySelector('#recording-progress-cancel').addEventListener('click', () => {
    activeAbortController?.abort();
  });
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
        format: formatSelect.value
      });
    };

    const handleCancel = () => {
      finish(reject, new DOMException('Recording cancelled', 'AbortError'));
    };

    startButton.addEventListener('click', handleStart);
    dialog.addEventListener('cancel', handleCancel);
    dialog.showModal();
  });
}

export function beginRecordingProgress() {
  activeAbortController = new AbortController();
  progressOverlay.classList.add('visible');
  progressBar.value = 0;
  progressLabel.textContent = PHASE_LABELS.prepare;

  return {
    signal: activeAbortController.signal,
    updateProgress({ phase = 'record', ratio = 0 }) {
      const percent = Math.round(ratio * 100);
      progressBar.value = percent;
      progressLabel.textContent = `${PHASE_LABELS[phase] ?? PHASE_LABELS.record} ${percent}%`;
    },
    finish() {
      progressOverlay.classList.remove('visible');
      activeAbortController = null;
    },
    cancel() {
      activeAbortController?.abort();
    }
  };
}
