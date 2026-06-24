import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { recordSimulationAnimation } from './simulation-recorder.js';

const MIN_EXPORT_PADDING = 48;
const EXPORT_PADDING_RATIO = 0.08;

export const EXPORT_FORMATS = {
  bpmn: {
    id: 'bpmn',
    label: 'BPMN XML',
    extension: 'bpmn',
    mimeType: 'application/xml',
    encoding: 'text'
  },
  json: {
    id: 'json',
    label: 'JSON',
    extension: 'json',
    mimeType: 'application/json',
    encoding: 'text'
  },
  svg: {
    id: 'svg',
    label: 'SVG',
    extension: 'svg',
    mimeType: 'image/svg+xml',
    encoding: 'text'
  },
  png: {
    id: 'png',
    label: 'PNG',
    extension: 'png',
    mimeType: 'image/png',
    encoding: 'binary'
  },
  pdf: {
    id: 'pdf',
    label: 'PDF',
    extension: 'pdf',
    mimeType: 'application/pdf',
    encoding: 'binary'
  },
  'simulation-png': {
    id: 'simulation-png',
    label: 'Simulation PNG',
    extension: 'png',
    mimeType: 'image/png',
    encoding: 'binary',
    requiresSimulation: true,
    isAnimated: true,
    nameSuffix: '-simulation'
  },
  'simulation-webm': {
    id: 'simulation-webm',
    label: 'Simulation WebM',
    extension: 'webm',
    mimeType: 'video/webm',
    encoding: 'binary',
    requiresSimulation: true,
    isAnimated: true,
    nameSuffix: '-simulation'
  }
};

export function isSimulationActive(modeler) {
  if (document.body.classList.contains('token-simulation-active')) {
    return true;
  }

  try {
    return modeler.get('toggleMode')._active ?? modeler.get('toggleMode').isActive?.();
  } catch {
    return false;
  }
}

export function getDefaultExportName(filePath, format) {
  const config = EXPORT_FORMATS[format];
  const baseName = filePath
    ? filePath.split(/[/\\]/).pop().replace(/\.[^.]+$/, '')
    : 'diagram';

  return `${baseName}${config.nameSuffix ?? ''}.${config.extension}`;
}

function getExportPadding(width, height) {
  const largestSide = Math.max(width, height);
  return Math.max(MIN_EXPORT_PADDING, Math.round(largestSide * EXPORT_PADDING_RATIO));
}

function parseSvgDocument(svg) {
  return new DOMParser().parseFromString(svg, 'image/svg+xml');
}

function getSvgDimensions(svgElement) {
  const viewBox = svgElement.getAttribute('viewBox');

  if (viewBox) {
    const [, , width, height] = viewBox.split(/\s+/).map(Number);
    return { width, height };
  }

  return {
    width: parseFloat(svgElement.getAttribute('width')),
    height: parseFloat(svgElement.getAttribute('height'))
  };
}

function prepareSvg(svg) {
  const doc = parseSvgDocument(svg);
  const svgElement = doc.documentElement;
  const viewBox = svgElement.getAttribute('viewBox');

  if (!viewBox) {
    return new XMLSerializer().serializeToString(svgElement);
  }

  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  const padding = getExportPadding(width, height);
  const paddedX = x - padding;
  const paddedY = y - padding;
  const paddedWidth = width + padding * 2;
  const paddedHeight = height + padding * 2;

  svgElement.setAttribute('viewBox', `${paddedX} ${paddedY} ${paddedWidth} ${paddedHeight}`);
  svgElement.setAttribute('width', String(paddedWidth));
  svgElement.setAttribute('height', String(paddedHeight));
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  return new XMLSerializer().serializeToString(svgElement);
}

function serializeModdleElement(element, seen = new WeakSet()) {
  if (element === null || element === undefined) {
    return element;
  }

  if (typeof element !== 'object' || !element.$type) {
    return element;
  }

  if (seen.has(element)) {
    return element.id ? { $type: element.$type, id: element.id, $ref: true } : { $ref: true };
  }

  seen.add(element);

  const result = { $type: element.$type };

  if (element.id) {
    result.id = element.id;
  }

  if (element.name) {
    result.name = element.name;
  }

  for (const property of element.$descriptor.properties) {
    const { name, isMany, isReference } = property;

    if (name === 'id' || name === 'name') {
      continue;
    }

    const value = element.get(name);

    if (value === undefined || value === null) {
      continue;
    }

    if (isMany) {
      result[name] = value.map((item) => serializeModdleElement(item, seen));
      continue;
    }

    if (isReference) {
      result[name] = value.id ?? serializeModdleElement(value, seen);
      continue;
    }

    result[name] = serializeModdleElement(value, seen);
  }

  for (const [attributeName, attributeValue] of Object.entries(element.$attrs ?? {})) {
    result[`@${attributeName}`] = attributeValue;
  }

  return result;
}

export async function exportSimulationAnimation(modeler, format, options = {}) {
  const config = EXPORT_FORMATS[format];

  if (!config?.isAnimated) {
    throw new Error(`Unsupported animation format: ${format}`);
  }

  const bytes = await recordSimulationAnimation(modeler, format, options);
  const content = arrayBufferToBase64(bytes);

  return { content, ...config };
}

async function getPreparedSvg(modeler) {
  const { svg } = await modeler.saveSVG({ format: true });
  return prepareSvg(svg);
}

function svgToPng(svg, scale = 2) {
  return new Promise((resolve, reject) => {
    const doc = parseSvgDocument(svg);
    const svgElement = doc.documentElement;
    const { width, height } = getSvgDimensions(svgElement);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);

        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Failed to create PNG'));
      }, 'image/png');
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG'));
    };

    image.src = url;
  });
}

async function svgToPdf(svg) {
  const doc = parseSvgDocument(svg);
  const svgElement = doc.documentElement;
  const { width, height } = getSvgDimensions(svgElement);

  const pdf = new jsPDF({
    orientation: width > height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
    hotfixes: ['px_scaling']
  });

  await svg2pdf(svgElement, pdf, {
    x: 0,
    y: 0,
    width,
    height
  });

  return pdf.output('arraybuffer');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result.split(',')[1]);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}

export async function exportDiagram(modeler, format) {
  const config = EXPORT_FORMATS[format];

  if (!config) {
    throw new Error(`Unsupported format: ${format}`);
  }

  if (config.requiresSimulation && !config.isAnimated && !isSimulationActive(modeler)) {
    throw new Error('Enable Token Simulation before exporting a simulation snapshot.');
  }

  if (format === 'bpmn') {
    const { xml } = await modeler.saveXML({ format: true });
    return { content: xml, ...config };
  }

  if (format === 'json') {
    const definitions = modeler.getDefinitions();
    const json = serializeModdleElement(definitions);
    return { content: JSON.stringify(json, null, 2), ...config };
  }

  const preparedSvg = await getPreparedSvg(modeler);

  if (format === 'svg') {
    return { content: preparedSvg, ...config };
  }

  if (format === 'png') {
    const pngBlob = await svgToPng(preparedSvg);
    const content = await blobToBase64(pngBlob);
    return { content, ...config };
  }

  if (format === 'pdf') {
    const pdfBuffer = await svgToPdf(preparedSvg);
    const content = arrayBufferToBase64(pdfBuffer);
    return { content, ...config };
  }

  throw new Error(`Unsupported format: ${format}`);
}

export function downloadExport({ content, encoding, mimeType }, fileName) {
  const blob = encoding === 'binary'
    ? base64ToBlob(content, mimeType)
    : new Blob([content], { type: mimeType });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}
