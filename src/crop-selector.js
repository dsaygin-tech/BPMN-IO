import { getDiagramContainer } from './simulation-capture.js';

const MIN_SELECTION_SIZE = 12;

function normalizeClientRect(startX, startY, endX, endY) {
  const left = Math.min(startX, endX);
  const top = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  return { left, top, width, height, right: left + width, bottom: top + height };
}

function clientRectToViewBox(modeler, clientRect) {
  const canvas = modeler.get('canvas');
  const container = getDiagramContainer(modeler);
  const bounds = container.getBoundingClientRect();
  const viewbox = canvas.viewbox();

  const left = Math.max(0, clientRect.left - bounds.left);
  const top = Math.max(0, clientRect.top - bounds.top);
  const right = Math.min(bounds.width, clientRect.right - bounds.left);
  const bottom = Math.min(bounds.height, clientRect.bottom - bounds.top);
  const width = right - left;
  const height = bottom - top;

  if (width < MIN_SELECTION_SIZE || height < MIN_SELECTION_SIZE) {
    return null;
  }

  const scaleX = viewbox.width / bounds.width;
  const scaleY = viewbox.height / bounds.height;

  return {
    x: viewbox.x + left * scaleX,
    y: viewbox.y + top * scaleY,
    width: width * scaleX,
    height: height * scaleY
  };
}

export function requestManualCropArea(modeler) {
  const container = getDiagramContainer(modeler);

  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.className = 'crop-selector-overlay';

    const hint = document.createElement('div');
    hint.className = 'crop-selector-hint';
    hint.textContent = 'Drag to select the recording area. Press Esc to cancel.';

    const selection = document.createElement('div');
    selection.className = 'crop-selector-selection';

    overlay.append(hint, selection);

    const containerStyle = getComputedStyle(container);
    const hadRelativePosition = containerStyle.position === 'relative' || containerStyle.position === 'absolute';

    if (!hadRelativePosition) {
      container.style.position = 'relative';
    }

    container.appendChild(overlay);

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let settled = false;

    const cleanup = () => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.remove();

      if (!hadRelativePosition) {
        container.style.position = '';
      }
    };

    const finish = (action, value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      action(value);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(reject, new DOMException('Crop selection cancelled', 'AbortError'));
      }
    };

    const updateSelection = (currentX, currentY) => {
      const rect = normalizeClientRect(startX, startY, currentX, currentY);
      const bounds = overlay.getBoundingClientRect();

      selection.classList.add('visible');
      selection.style.left = `${rect.left - bounds.left}px`;
      selection.style.top = `${rect.top - bounds.top}px`;
      selection.style.width = `${rect.width}px`;
      selection.style.height = `${rect.height}px`;
    };

    const handlePointerDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      dragging = true;
      startX = event.clientX;
      startY = event.clientY;
      updateSelection(startX, startY);
      overlay.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event) => {
      if (!dragging) {
        return;
      }

      updateSelection(event.clientX, event.clientY);
    };

    const handlePointerUp = (event) => {
      if (!dragging) {
        return;
      }

      dragging = false;

      if (overlay.hasPointerCapture(event.pointerId)) {
        overlay.releasePointerCapture(event.pointerId);
      }

      const rect = normalizeClientRect(startX, startY, event.clientX, event.clientY);
      const viewBox = clientRectToViewBox(modeler, rect);

      if (!viewBox) {
        selection.classList.remove('visible');
        return;
      }

      finish(resolve, viewBox);
    };

    overlay.addEventListener('pointerdown', handlePointerDown);
    overlay.addEventListener('pointermove', handlePointerMove);
    overlay.addEventListener('pointerup', handlePointerUp);
    overlay.addEventListener('pointercancel', handlePointerUp);
    document.addEventListener('keydown', handleKeyDown);
  });
}
