import UPNG from 'upng-js';
import {
  beginCaptureSession,
  captureSessionFrame,
  cloneCanvas,
  endCaptureSession,
  paceFrame,
  PLAYBACK_FRAME_MS
} from './simulation-capture.js';
import {
  createInteractiveRecordingController,
  createRecordingController,
  pauseSimulationAnimations,
  pauseSimulationForCapture,
  prepareAutoSimulation,
  prepareInteractiveSimulation,
  resumeSimulationAfterCapture,
  resumeSimulationAnimations,
  waitForSimulationStart
} from './simulation-runner.js';

export const EXPORT_FPS = 60;
export const FRAME_MS = 1000 / EXPORT_FPS;

const ANIMATION_FORMATS = new Set([ 'simulation-png', 'simulation-webm' ]);

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

function canvasToRgba(canvas) {
  const context = canvas.getContext('2d');
  const { width, height } = canvas;

  return context.getImageData(0, 0, width, height).data.buffer;
}

function encodeApng(frames, delayMs) {
  if (!frames.length) {
    throw new Error('No frames captured');
  }

  const width = frames[0].width;
  const height = frames[0].height;
  const buffers = frames.map(canvasToRgba);
  const delays = frames.map(() => delayMs);

  return new Uint8Array(UPNG.encode(buffers, width, height, 0, delays));
}

async function createWebmRecorder(width, height) {
  const mimeType = getSupportedWebmMimeType();

  if (!mimeType) {
    throw new Error('WebM recording is not supported in this environment');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { alpha: false });
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 12_000_000
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

  return {
    addFrame(frame) {
      drawFrame(context, frame, width, height);

      if (typeof track.requestFrame === 'function') {
        track.requestFrame();
      }
    },
    async finish() {
      recorder.stop();
      return new Uint8Array(await (await recordingFinished).arrayBuffer());
    }
  };
}

function createApngRecorder() {
  const frames = [];

  return {
    addFrame(frame) {
      frames.push(cloneCanvas(frame));
    },
    finish() {
      return encodeApng(frames, PLAYBACK_FRAME_MS);
    }
  };
}

function createAnimationRecorder(format, frame) {
  if (format === 'simulation-webm') {
    return createWebmRecorder(frame.width, frame.height);
  }

  return Promise.resolve(createApngRecorder());
}

async function addFrameToRecorder(recorderPromise, frame) {
  const recorder = await recorderPromise;
  recorder.addFrame(frame);
}

async function finishRecorder(recorderPromise) {
  const recorder = await recorderPromise;
  return recorder.finish();
}

async function runInteractiveRecording(modeler, format, onProgress, signal, stopRequested, cropOptions = {}) {
  const session = beginCaptureSession(modeler, { cropOptions });
  const controller = createInteractiveRecordingController(modeler);
  let frameCount = 0;
  let recorderPromise = null;

  try {
    while (true) {
      const frameStartedAt = performance.now();
      pauseSimulationForCapture(modeler);

      const frame = await captureSessionFrame(session);

      if (!recorderPromise) {
        recorderPromise = createAnimationRecorder(format, frame);
      }

      await addFrameToRecorder(recorderPromise, frame);

      frameCount += 1;
      controller.updateState();

      onProgress?.({
        phase: 'record',
        ratio: Math.min(0.9, frameCount / (EXPORT_FPS * 30))
      });

      if (controller.shouldStop({ stopRequested, signal })) {
        break;
      }

      resumeSimulationAfterCapture(modeler);
      await paceFrame(frameStartedAt, PLAYBACK_FRAME_MS);
    }
  } finally {
    pauseSimulationForCapture(modeler);
    endCaptureSession(session);
    resumeSimulationAfterCapture(modeler);
  }

  if (!recorderPromise || frameCount === 0) {
    throw new Error('No frames captured');
  }

  onProgress?.({ phase: 'encode', ratio: 0.98 });
  return finishRecorder(recorderPromise);
}

async function recordSteppedAnimation(modeler, format, onProgress, signal, cropOptions = {}) {
  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareAutoSimulation(modeler);
  pauseSimulationAnimations(modeler);

  const session = beginCaptureSession(modeler, { cropOptions });
  const controller = createRecordingController(modeler, FRAME_MS);
  let recorderPromise = null;
  let frameCount = 0;

  try {
    while (true) {
      const frameStartedAt = performance.now();
      controller.shouldAbort(signal);

      const frame = await captureSessionFrame(session);

      if (!recorderPromise) {
        recorderPromise = createAnimationRecorder(format, frame);
      }

      await addFrameToRecorder(recorderPromise, frame);
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
      await paceFrame(frameStartedAt, PLAYBACK_FRAME_MS);
    }
  } finally {
    endCaptureSession(session);
    resumeSimulationAnimations(modeler);
  }

  if (!recorderPromise || frameCount === 0) {
    throw new Error('No frames captured');
  }

  onProgress?.({ phase: 'encode', ratio: 0.98 });
  return finishRecorder(recorderPromise);
}

async function recordInteractiveAnimation(modeler, format, onProgress, signal, stopRequested, cropOptions = {}) {
  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareInteractiveSimulation(modeler);

  onProgress?.({ phase: 'wait', ratio: 0 });
  await waitForSimulationStart(modeler, signal);

  return runInteractiveRecording(
    modeler,
    format,
    onProgress,
    signal,
    stopRequested,
    cropOptions
  );
}

export async function recordSimulationAnimation(modeler, format, options = {}) {
  const {
    onProgress,
    signal,
    recordMode = 'auto',
    stopRequested = () => false,
    cropOptions = {}
  } = options;

  if (!ANIMATION_FORMATS.has(format)) {
    throw new Error(`Unsupported animation format: ${format}`);
  }

  if (recordMode === 'interactive') {
    return recordInteractiveAnimation(modeler, format, onProgress, signal, stopRequested, cropOptions);
  }

  return recordSteppedAnimation(modeler, format, onProgress, signal, cropOptions);
}
