import html2canvas from 'html2canvas';
import { getBBox } from 'diagram-js/lib/util/Elements.js';

export const CAPTURE_SCALE_STATIC = 2;
export const MAX_EXPORT_DIMENSION = 4096;
export const MIN_EXPORT_PADDING = 48;
export const EXPORT_PADDING_RATIO = 0.08;
export const TIGHT_EXPORT_PADDING = 16;
export const EXPORT_FPS = 60;
export const EXPORT_FRAME_MS = 1000 / EXPORT_FPS;
export const PLAYBACK_FRAME_MS = Math.max(10, Math.round(EXPORT_FRAME_MS / 10) * 10);

const TOKEN_BOUNCE_PERIOD_MS = 1000;
const TOKEN_BOUNCE_HEIGHT_PX = 5;
const TOKEN_SIZE_PX = 25;
const TOKEN_STACK_OFFSET_PX = -8;

const SVG_EXPORT_ARTIFACTS = [
  '.djs-outline',
  '.djs-bendpoint',
  '.djs-segment-dragger',
  '.djs-resizer',
  '.djs-dragging',
  '.djs-connection-preview',
  '.djs-tooltip-container',
  '.djs-context-pad',
  '.djs-popup',
  '.djs-crosshair',
  '.djs-snapping'
].join(', ');

let cachedStyles = null;

export function getDiagramContainer(modeler) {
  return modeler.get('canvas').getContainer();
}

export function getSimulationChromeRoot(modeler) {
  return getDiagramContainer(modeler).closest('.bjs-container') ?? getDiagramContainer(modeler);
}

function getExportPadding(width, height) {
  const largestSide = Math.max(width, height);
  return Math.max(MIN_EXPORT_PADDING, Math.round(largestSide * EXPORT_PADDING_RATIO));
}

export function computeDiagramViewBox(modeler, paddingOverride) {
  const canvas = modeler.get('canvas');
  const elements = modeler.get('elementRegistry').getAll().filter((element) => (
    element.waypoints || (typeof element.x === 'number' && typeof element.width === 'number')
  ));

  if (!elements.length) {
    return { ...canvas.viewbox() };
  }

  const bbox = getBBox(elements);
  const padding = typeof paddingOverride === 'number'
    ? paddingOverride
    : getExportPadding(bbox.width, bbox.height);

  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + padding * 2,
    height: bbox.height + padding * 2
  };
}

export function resolveExportViewBox(modeler, cropOptions = {}) {
  const { cropMode = 'diagram', cropPadding } = cropOptions;
  const canvas = modeler.get('canvas');

  if (cropMode === 'viewport') {
    return { ...canvas.viewbox() };
  }

  if (cropMode === 'tight') {
    return computeDiagramViewBox(modeler, TIGHT_EXPORT_PADDING);
  }

  if (cropMode === 'custom') {
    const padding = Number.isFinite(cropPadding) ? cropPadding : MIN_EXPORT_PADDING;
    return computeDiagramViewBox(modeler, Math.max(0, padding));
  }

  if (cropMode === 'manual' && cropOptions.customViewBox) {
    const { x, y, width, height } = cropOptions.customViewBox;

    if (width > 0 && height > 0) {
      return { x, y, width, height };
    }
  }

  return computeDiagramViewBox(modeler);
}

export function getExportDimensions(viewBox, extraScale = 1) {
  const baseScale = Math.min(1, MAX_EXPORT_DIMENSION / Math.max(viewBox.width, viewBox.height));
  const scale = baseScale * extraScale;

  return {
    width: Math.max(1, Math.round(viewBox.width * scale)),
    height: Math.max(1, Math.round(viewBox.height * scale)),
    scale
  };
}

export function saveViewboxState(modeler) {
  return modeler.get('canvas').viewbox();
}

export function applyDiagramViewBox(modeler, viewBox) {
  modeler.get('canvas').viewbox(viewBox);
}

export function restoreViewboxState(modeler, viewbox) {
  if (viewbox) {
    modeler.get('canvas').viewbox(viewbox);
  }
}

export function hideExportChrome(modeler) {
  getSimulationChromeRoot(modeler).classList.add('export-capturing');
}

export function showExportChrome(modeler) {
  getSimulationChromeRoot(modeler).classList.remove('export-capturing');
}

function shouldIncludeExportStyle(text) {
  if (text.includes('.djs-') || text.includes('.bpmn-') || text.includes('@font-face')) {
    return true;
  }

  if (text.includes('--token-simulation')) {
    return true;
  }

  if (text.includes('.bts-token')
    || text.includes('.bts-circle')
    || text.includes('.bts-text')
    || text.includes('.bts-animation-tokens')
    || text.includes('.bts-token-count')
    || text.includes('bts-jump')) {
    return true;
  }

  return false;
}

function collectEmbeddedStyles() {
  if (cachedStyles) {
    return cachedStyles;
  }

  const chunks = [];

  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        const text = rule.cssText;

        if (shouldIncludeExportStyle(text)) {
          chunks.push(text);
        }
      }
    } catch {
      // Ignore cross-origin stylesheets.
    }
  }

  cachedStyles = chunks.join('\n');
  return cachedStyles;
}

function cleanupSvgExportNode(root) {
  root.querySelectorAll(SVG_EXPORT_ARTIFACTS).forEach((node) => {
    node.remove();
  });
}

function buildExportSvgElement(modeler, session) {
  const canvas = modeler.get('canvas');
  const { exportViewBox, exportDimensions } = session;
  const viewportClone = canvas._viewport.cloneNode(true);

  cleanupSvgExportNode(viewportClone);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svg.setAttribute(
    'viewBox',
    `${exportViewBox.x} ${exportViewBox.y} ${exportViewBox.width} ${exportViewBox.height}`
  );
  svg.setAttribute('width', String(exportDimensions.width));
  svg.setAttribute('height', String(exportDimensions.height));

  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = collectEmbeddedStyles();
  svg.appendChild(styleElement);
  svg.appendChild(viewportClone);

  return svg;
}

async function renderSvgToCanvas(modeler, session) {
  const { exportDimensions } = session;
  const svg = buildExportSvgElement(modeler, session);
  const svgMarkup = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement('canvas');
  canvas.width = exportDimensions.width;
  canvas.height = exportDimensions.height;

  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas;
}

function getTokenBounceOffset(elapsedMs) {
  const phase = (elapsedMs % TOKEN_BOUNCE_PERIOD_MS) / TOKEN_BOUNCE_PERIOD_MS;

  if (phase <= 0.5) {
    return TOKEN_BOUNCE_HEIGHT_PX * cssEase(phase / 0.5);
  }

  return TOKEN_BOUNCE_HEIGHT_PX * (1 - cssEase((phase - 0.5) / 0.5));
}

function cssEase(progress) {
  return progress * progress * (3 - 2 * progress);
}

function getCaptureElapsedMs(session) {
  return (session.frameIndex ?? 0) * PLAYBACK_FRAME_MS;
}

function getTokenOverlayScale(overlay, viewbox) {
  const minZoom = overlay.show?.minZoom;

  if (typeof minZoom !== 'number' || viewbox.scale >= minZoom) {
    return 1;
  }

  return minZoom / viewbox.scale;
}

function getWaitingTokenCacheKey(modeler) {
  const overlays = modeler.get('overlays').get({ type: 'bts-token-count' }) ?? [];

  return overlays.map((overlay) => {
    const element = overlay.element;
    const tokenCount = overlay.htmlContainer?.querySelectorAll('.bts-token-count:not(.inactive)').length ?? 0;

    if (!element) {
      return `none:${tokenCount}`;
    }

    return [
      element.id,
      tokenCount,
      Math.round(element.x),
      Math.round(element.y),
      Math.round(element.width),
      Math.round(element.height)
    ].join(':');
  }).join('|');
}

function buildWaitingTokenRenderLayouts(modeler, session) {
  const canvas = modeler.get('canvas');
  const viewbox = canvas.viewbox();
  const { exportViewBox, exportDimensions } = session;
  const exportScale = exportDimensions.width / exportViewBox.width;
  const overlays = modeler.get('overlays').get({ type: 'bts-token-count' }) ?? [];
  const layouts = [];

  for (const overlay of overlays) {
    const element = overlay.element;
    const htmlContainer = overlay.htmlContainer;

    if (!element || element.x === undefined || !htmlContainer || htmlContainer.offsetParent === null) {
      continue;
    }

    const position = overlay.position || { bottom: 10, left: -15 };
    const overlayScale = getTokenOverlayScale(overlay, viewbox);
    const tokenSize = TOKEN_SIZE_PX * overlayScale;
    const left = position.left ?? 0;
    const top = element.height - (position.bottom ?? 0);
    const tokens = htmlContainer.querySelectorAll('.bts-token-count:not(.inactive)');

    tokens.forEach((tokenElement, tokenIndex) => {
      const style = getComputedStyle(tokenElement);
      const stackOffset = tokenIndex * TOKEN_STACK_OFFSET_PX * overlayScale;
      const diagramX = element.x + left + stackOffset + tokenSize / 2;
      const diagramY = element.y + top + tokenSize / 2;

      layouts.push({
        centerX: (diagramX - exportViewBox.x) * exportScale,
        centerY: (diagramY - exportViewBox.y) * exportScale,
        radius: tokenSize / 2 * exportScale,
        bounceScale: exportScale,
        style,
        text: tokenElement.textContent.trim()
      });
    });
  }

  return layouts;
}

function resolveWaitingTokenRenderLayouts(modeler, session) {
  const cacheKey = getWaitingTokenCacheKey(modeler);

  if (session.waitingTokenCacheKey !== cacheKey || !session.waitingTokenLayouts) {
    session.waitingTokenCacheKey = cacheKey;
    session.waitingTokenLayouts = buildWaitingTokenRenderLayouts(modeler, session);
  }

  return session.waitingTokenLayouts;
}

function compositeWaitingTokens(context, session, layouts = resolveWaitingTokenRenderLayouts(session.modeler, session)) {
  if (!layouts.length) {
    return;
  }

  const bounceOffset = getTokenBounceOffset(getCaptureElapsedMs(session));

  for (const { centerX, centerY, radius, bounceScale, style, text } of layouts) {
    const drawY = centerY + bounceOffset * bounceScale;

    context.beginPath();
    context.arc(centerX, drawY, radius, 0, Math.PI * 2);
    context.fillStyle = style.backgroundColor;
    context.fill();

    if (text) {
      context.fillStyle = style.color;
      context.font = `${Math.max(10, Math.round(radius * 2 * 0.56))}px Arial, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, centerX, drawY);
    }
  }
}

async function captureViaHtml2Canvas(modeler, session, layouts = resolveWaitingTokenRenderLayouts(modeler, session)) {
  hideExportChrome(modeler);
  setTokenOverlayCaptureHidden(modeler, true);

  const target = getDiagramContainer(modeler);
  let canvas;

  try {
    canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      logging: false,
      imageTimeout: 0,
      removeContainer: true
    });
  } finally {
    setTokenOverlayCaptureHidden(modeler, false);
  }

  const { exportViewBox, exportDimensions } = session;
  const viewbox = modeler.get('canvas').viewbox();
  const scaleX = canvas.width / viewbox.width;
  const scaleY = canvas.height / viewbox.height;

  const cropX = Math.max(0, Math.round((exportViewBox.x - viewbox.x) * scaleX));
  const cropY = Math.max(0, Math.round((exportViewBox.y - viewbox.y) * scaleY));
  const cropWidth = Math.min(canvas.width - cropX, Math.round(exportViewBox.width * scaleX));
  const cropHeight = Math.min(canvas.height - cropY, Math.round(exportViewBox.height * scaleY));

  const output = document.createElement('canvas');
  output.width = exportDimensions.width;
  output.height = exportDimensions.height;

  const context = output.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(
    canvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    output.width,
    output.height
  );

  compositeWaitingTokens(context, session, layouts);

  return output;
}

function setTokenOverlayCaptureHidden(modeler, hidden) {
  getDiagramContainer(modeler).querySelectorAll('.djs-overlay-bts-token-count').forEach((element) => {
    element.classList.toggle('export-hide-token-overlay', hidden);
  });
}

export function beginCaptureSession(modeler, options = {}) {
  const { extraScale = 1, cropOptions = {} } = options;
  const previousViewbox = saveViewboxState(modeler);
  const exportViewBox = resolveExportViewBox(modeler, cropOptions);
  const exportDimensions = getExportDimensions(exportViewBox, extraScale);

  if (cropOptions.cropMode !== 'viewport') {
    applyDiagramViewBox(modeler, exportViewBox);
  }

  hideExportChrome(modeler);

  return {
    modeler,
    exportViewBox,
    exportDimensions,
    previousViewbox,
    cropOptions,
    captureStartedAt: performance.now(),
    frameIndex: 0
  };
}

export function endCaptureSession(session) {
  if (!session) {
    return;
  }

  showExportChrome(session.modeler);
  restoreViewboxState(session.modeler, session.previousViewbox);
}

export async function renderSessionFrame(session) {
  const layouts = resolveWaitingTokenRenderLayouts(session.modeler, session);

  try {
    setTokenOverlayCaptureHidden(session.modeler, true);
    const canvas = await renderSvgToCanvas(session.modeler, session);
    compositeWaitingTokens(canvas.getContext('2d'), session, layouts);
    return canvas;
  } catch (error) {
    console.warn('SVG render failed, falling back to html2canvas', error);
    return captureViaHtml2Canvas(session.modeler, session, layouts);
  } finally {
    setTokenOverlayCaptureHidden(session.modeler, false);
  }
}

export async function captureSessionFrame(session) {
  if (!session._overlaysReady) {
    session._overlaysReady = true;
    await waitNextFrame();
  }

  session.frameIndex = (session.frameIndex ?? 0) + 1;
  return renderSessionFrame(session);
}

export async function captureSimulationFrame(modeler, scale = CAPTURE_SCALE_STATIC, cropOptions = {}) {
  const session = beginCaptureSession(modeler, { extraScale: scale, cropOptions });

  try {
    return await renderSessionFrame(session);
  } finally {
    endCaptureSession(session);
  }
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

export async function paceFrame(startedAt, frameMs) {
  const elapsed = performance.now() - startedAt;
  const remaining = frameMs - elapsed;

  if (remaining > 0) {
    await sleep(remaining);
  }
}

export function createFixedIntervalTicker(frameMs) {
  let nextTickAt = performance.now();

  return {
    async waitForTick() {
      const wait = nextTickAt - performance.now();

      if (wait > 0) {
        await sleep(wait);
      }

      nextTickAt += frameMs;

      if (performance.now() - nextTickAt > frameMs * 4) {
        nextTickAt = performance.now() + frameMs;
      }
    },
    reset() {
      nextTickAt = performance.now();
    }
  };
}
