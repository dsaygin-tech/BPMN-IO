import { ScopeTraits } from 'bpmn-js-token-simulation/lib/simulator/ScopeTraits.js';
import { sleep } from './simulation-capture.js';

const MAX_RECORDING_MS = 120000;
const IDLE_TAIL_FRAMES = 30;
const STARTUP_GRACE_FRAMES = 90;

export async function prepareAutoSimulation(modeler) {
  const toggleMode = modeler.get('toggleMode');

  if (!toggleMode._active) {
    toggleMode.toggleMode(true);
    await sleep(100);
  }

  const simulator = modeler.get('simulator');
  const exclusiveGatewaySettings = modeler.get('exclusiveGatewaySettings');
  const inclusiveGatewaySettings = modeler.get('inclusiveGatewaySettings');
  const elementRegistry = modeler.get('elementRegistry');

  simulator.reset();
  clearPausePoints(modeler);

  if (exclusiveGatewaySettings?.setSequenceFlowsDefault) {
    exclusiveGatewaySettings.setSequenceFlowsDefault();
  }

  if (inclusiveGatewaySettings?.setDefaults) {
    inclusiveGatewaySettings.setDefaults();
  }

  triggerStartEvents(modeler);
  modeler.get('eventBus').fire('tokenSimulation.playSimulation');
  await waitNextFrame();

  return {
    elementRegistry,
    simulator
  };
}

function clearPausePoints(modeler) {
  const simulator = modeler.get('simulator');

  modeler.get('elementRegistry').forEach((element) => {
    simulator.waitAtElement(element, false);
  });
}

function triggerStartEvents(modeler) {
  const simulator = modeler.get('simulator');
  const elementRegistry = modeler.get('elementRegistry');
  const startEvents = elementRegistry.filter(({ type }) => type === 'bpmn:StartEvent');

  for (const startEvent of startEvents) {
    const subscriptions = simulator.findSubscriptions({ element: startEvent });

    for (const subscription of subscriptions) {
      simulator.trigger({
        event: subscription.event,
        scope: subscription.scope
      });
    }
  }
}

function waitNextFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function countActiveAnimations(modeler) {
  let count = 0;
  modeler.get('animation').each(() => {
    count += 1;
  });
  return count;
}

export function hasRunningScopes(modeler) {
  const simulator = modeler.get('simulator');
  return simulator.findScopes({ trait: ScopeTraits.RUNNING }).length > 0;
}

export function isSimulationActive(modeler) {
  return hasRunningScopes(modeler) || countActiveAnimations(modeler) > 0;
}

export function pauseSimulationAnimations(modeler) {
  modeler.get('animation').pause();
}

export function resumeSimulationAnimations(modeler) {
  modeler.get('animation').play();
}

export function advanceSimulationFrame(modeler, deltaMs) {
  const animation = modeler.get('animation');
  const step = deltaMs * animation.getAnimationSpeed();

  animation.each((tokenAnimation) => {
    tokenAnimation.tick(step);
  });
}

export function createRecordingController(modeler, frameMs) {
  let sawActivity = false;
  let idleFrames = 0;
  let frameIndex = 0;
  const startedAt = performance.now();

  return {
    frameMs,
    advance() {
      advanceSimulationFrame(modeler, frameMs);
      pauseSimulationAnimations(modeler);
      frameIndex += 1;
    },
    updateState() {
      if (isSimulationActive(modeler)) {
        sawActivity = true;
        idleFrames = 0;
        return;
      }

      if (sawActivity) {
        idleFrames += 1;
      }
    },
    isComplete() {
      return sawActivity && idleFrames >= IDLE_TAIL_FRAMES;
    },
    shouldAbort(signal) {
      if (signal?.aborted) {
        throw new DOMException('Recording cancelled', 'AbortError');
      }

      if (performance.now() - startedAt > MAX_RECORDING_MS) {
        if (!sawActivity) {
          throw new Error('Simulation did not start. Check that the diagram has a start event.');
        }

        throw new Error('Simulation recording timed out before completion.');
      }

      if (!sawActivity && frameIndex >= STARTUP_GRACE_FRAMES) {
        throw new Error('Simulation did not start. Check that the diagram has a start event.');
      }

      return false;
    }
  };
}
