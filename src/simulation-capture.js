import html2canvas from 'html2canvas';

export const CAPTURE_SCALE_STATIC = 2;

export function getSimulationCaptureTarget(modeler) {
  const canvasContainer = modeler.get('canvas').getContainer();
  return canvasContainer.closest('.bjs-container') ?? canvasContainer;
}

export function getCaptureRegion(modeler) {
  const target = getSimulationCaptureTarget(modeler);
  const rect = target.getBoundingClientRect();

  return {
    x: Math.max(0, Math.round(rect.x)),
    y: Math.max(0, Math.round(rect.y)),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height))
  };
}

export function hideExportChrome(root) {
  root.querySelectorAll(
    '.bts-notifications, .djs-context-pad, .djs-popup, .djs-tooltip, .recording-overlay'
  ).forEach((element) => {
    element.style.visibility = 'hidden';
  });
}

export function showExportChrome(root) {
  root.querySelectorAll(
    '.bts-notifications, .djs-context-pad, .djs-popup, .djs-tooltip, .recording-overlay'
  ).forEach((element) => {
    element.style.visibility = '';
  });
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function blobToCanvas(blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return canvas;
}

function scaleCanvas(source, scale) {
  if (scale === 1) {
    return source;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(source.width * scale);
  canvas.height = Math.round(source.height * scale);

  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);

  return canvas;
}

async function captureRegionToCanvas(region, options = {}) {
  const { scale = 1, format = 'jpeg' } = options;
  const payload = await window.electronAPI.captureRegion(region, { format });
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const canvas = await blobToCanvas(base64ToBlob(payload, mimeType));
  return scaleCanvas(canvas, scale);
}

async function captureViaElectron(modeler, scale = 1, options = {}) {
  const target = getSimulationCaptureTarget(modeler);
  const region = getCaptureRegion(modeler);

  hideExportChrome(target);

  try {
    return await captureRegionToCanvas(region, { scale, ...options });
  } finally {
    showExportChrome(target);
  }
}

async function captureViaHtml2Canvas(modeler, scale = 1) {
  const target = getSimulationCaptureTarget(modeler);

  hideExportChrome(target);

  try {
    return await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: scale * (window.devicePixelRatio || 1),
      useCORS: true,
      logging: false,
      imageTimeout: 0,
      removeContainer: true,
      onclone: (clonedDocument) => {
        const clonedTarget = clonedDocument.body.querySelector('.bjs-container.simulation')
          ?? clonedDocument.body.querySelector('.bjs-container')
          ?? clonedDocument.body.querySelector('.djs-container');

        if (clonedTarget) {
          hideExportChrome(clonedTarget);
        }
      }
    });
  } finally {
    showExportChrome(target);
  }
}

export function beginCaptureSession(modeler) {
  const target = getSimulationCaptureTarget(modeler);
  hideExportChrome(target);

  return {
    modeler,
    target,
    region: getCaptureRegion(modeler)
  };
}

export function endCaptureSession(session) {
  if (session?.target) {
    showExportChrome(session.target);
  }
}

export async function captureSessionFrame(session, scale = 1) {
  if (window.electronAPI?.captureRegion) {
    return captureRegionToCanvas(session.region, { scale, format: 'jpeg' });
  }

  return captureViaHtml2Canvas(session.modeler, scale);
}

export async function captureSimulationFrame(modeler, scale = 1) {
  if (window.electronAPI?.captureRegion) {
    try {
      return await captureViaElectron(modeler, scale, { format: 'png' });
    } catch (error) {
      console.warn('Native capture failed, falling back to html2canvas', error);
    }
  }

  return captureViaHtml2Canvas(modeler, scale);
}

export function cloneCanvas(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  canvas.getContext('2d').drawImage(source, 0, 0);
  return canvas;
}

export function waitNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
