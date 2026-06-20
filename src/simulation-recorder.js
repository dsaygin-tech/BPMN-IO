import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import {
  beginCaptureSession,
  captureSessionFrame,
  endCaptureSession,
  getCaptureRegion
} from './simulation-capture.js';
import {
  createRecordingController,
  pauseSimulationAnimations,
  prepareAutoSimulation,
  resumeSimulationAnimations
} from './simulation-runner.js';

export const EXPORT_FPS = 30;
export const FRAME_MS = 1000 / EXPORT_FPS;

function getSupportedWebmMimeType() {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  return candidates.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? null;
}

function drawFrame(context, frame, width, height) {
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);

  if (frame) {
    context.drawImage(frame, 0, 0, frame.width, frame.height, 0, 0, width, height);
  }
}

function createGifEncoder(width, height) {
  const encoder = GIFEncoder();
  let globalPalette = null;
  let frameIndex = 0;

  return {
    addFrame(frameCanvas) {
      const imageData = frameCanvas.getContext('2d').getImageData(0, 0, width, height);

      if (frameIndex === 0) {
        globalPalette = quantize(imageData.data, 256);
      }

      const index = applyPalette(imageData.data, globalPalette);

      encoder.writeFrame(index, width, height, {
        palette: frameIndex === 0 ? globalPalette : undefined,
        delay: FRAME_MS,
        dispose: 2,
        repeat: frameIndex === 0 ? 0 : undefined
      });

      frameIndex += 1;
    },
    finish() {
      encoder.finish();
      return new Uint8Array(encoder.bytes());
    }
  };
}

async function recordSteppedGif(modeler, onProgress, signal) {
  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareAutoSimulation(modeler);
  pauseSimulationAnimations(modeler);

  const session = beginCaptureSession(modeler);
  const controller = createRecordingController(modeler, FRAME_MS);
  let encoder = null;
  let frameCount = 0;

  try {
    while (true) {
      controller.shouldAbort(signal);

      const frame = await captureSessionFrame(session);

      if (!encoder) {
        encoder = createGifEncoder(frame.width, frame.height);
      }

      encoder.addFrame(frame);
      frameCount += 1;
      controller.updateState();

      onProgress?.({
        phase: 'record',
        ratio: Math.min(0.9, frameCount / (EXPORT_FPS * 20))
      });

      if (controller.isComplete()) {
        break;
      }

      controller.advance();
    }
  } finally {
    endCaptureSession(session);
    resumeSimulationAnimations(modeler);
  }

  if (!encoder) {
    throw new Error('No frames captured');
  }

  onProgress?.({ phase: 'encode', ratio: 0.98 });
  return encoder.finish();
}

async function recordSteppedWebm(modeler, onProgress, signal) {
  const mimeType = getSupportedWebmMimeType();

  if (!mimeType) {
    throw new Error('WebM recording is not supported in this environment');
  }

  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareAutoSimulation(modeler);
  pauseSimulationAnimations(modeler);

  const session = beginCaptureSession(modeler);
  const controller = createRecordingController(modeler, FRAME_MS);
  const region = getCaptureRegion(modeler);
  const canvas = document.createElement('canvas');
  canvas.width = region.width;
  canvas.height = region.height;

  const context = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000
  });

  const chunks = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const recordingFinished = new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error('Failed to record WebM video'));
  });

  recorder.start(100);
  onProgress?.({ phase: 'record', ratio: 0.05 });

  let frameCount = 0;

  try {
    while (true) {
      controller.shouldAbort(signal);

      const frame = await captureSessionFrame(session);
      drawFrame(context, frame, canvas.width, canvas.height);

      if (typeof track.requestFrame === 'function') {
        track.requestFrame();
      }

      frameCount += 1;
      controller.updateState();

      onProgress?.({
        phase: 'record',
        ratio: Math.min(0.9, frameCount / (EXPORT_FPS * 20))
      });

      if (controller.isComplete()) {
        break;
      }

      controller.advance();
    }
  } finally {
    endCaptureSession(session);
    resumeSimulationAnimations(modeler);
  }

  recorder.stop();
  onProgress?.({ phase: 'encode', ratio: 0.98 });

  return new Uint8Array(await (await recordingFinished).arrayBuffer());
}

export async function recordSimulationAnimation(modeler, format, options = {}) {
  const { onProgress, signal } = options;

  if (format === 'simulation-webm') {
    return recordSteppedWebm(modeler, onProgress, signal);
  }

  if (format === 'simulation-gif') {
    return recordSteppedGif(modeler, onProgress, signal);
  }

  throw new Error(`Unsupported animation format: ${format}`);
}
