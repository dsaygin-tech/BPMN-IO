import {
  beginCaptureSession,
  captureSessionFrame,
  endCaptureSession,
  paceFrame,
  PLAYBACK_FRAME_MS,
  sleep
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

async function runInteractiveRecording(modeler, onProgress, signal, stopRequested, handleFrame, cropOptions = {}) {
  const session = beginCaptureSession(modeler, { cropOptions });
  const controller = createInteractiveRecordingController(modeler);
  let frameCount = 0;

  try {
    while (true) {
      const frameStartedAt = performance.now();
      pauseSimulationForCapture(modeler);

      const frame = await captureSessionFrame(session);
      await handleFrame(frame);

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

  return frameCount;
}

async function recordSteppedWebm(modeler, onProgress, signal, cropOptions = {}) {
  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareAutoSimulation(modeler);
  pauseSimulationAnimations(modeler);

  const session = beginCaptureSession(modeler, { cropOptions });
  const controller = createRecordingController(modeler, FRAME_MS);
  let webmRecorder = null;
  let frameCount = 0;

  try {
    while (true) {
      const frameStartedAt = performance.now();
      controller.shouldAbort(signal);

      const frame = await captureSessionFrame(session);

      if (!webmRecorder) {
        webmRecorder = await createWebmRecorder(frame.width, frame.height);
      }

      webmRecorder.addFrame(frame);
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

  if (!webmRecorder) {
    throw new Error('No frames captured');
  }

  onProgress?.({ phase: 'encode', ratio: 0.98 });
  return webmRecorder.finish();
}

async function recordInteractiveWebm(modeler, onProgress, signal, stopRequested, cropOptions = {}) {
  onProgress?.({ phase: 'prepare', ratio: 0 });
  await prepareInteractiveSimulation(modeler);

  onProgress?.({ phase: 'wait', ratio: 0 });
  await waitForSimulationStart(modeler, signal);

  let webmRecorder = null;

  const frameCount = await runInteractiveRecording(
    modeler,
    onProgress,
    signal,
    stopRequested,
    async (frame) => {
      if (!webmRecorder) {
        webmRecorder = await createWebmRecorder(frame.width, frame.height);
      }

      webmRecorder.addFrame(frame);
    },
    cropOptions
  );

  if (!webmRecorder || frameCount === 0) {
    throw new Error('No frames captured');
  }

  onProgress?.({ phase: 'encode', ratio: 0.98 });
  return webmRecorder.finish();
}

export async function recordSimulationAnimation(modeler, format, options = {}) {
  const {
    onProgress,
    signal,
    recordMode = 'auto',
    stopRequested = () => false,
    cropOptions = {}
  } = options;

  if (format !== 'simulation-webm') {
    throw new Error(`Unsupported animation format: ${format}`);
  }

  if (recordMode === 'interactive') {
    return recordInteractiveWebm(modeler, onProgress, signal, stopRequested, cropOptions);
  }

  return recordSteppedWebm(modeler, onProgress, signal, cropOptions);
}
