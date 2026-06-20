import { ScopeTraits } from 'bpmn-js-token-simulation/lib/simulator/ScopeTraits.js';
import { sleep, waitNextFrame } from './simulation-capture.js';

const MAX_RECORDING_MS = 600000;
const MAX_WAIT_FOR_START_MS = 300000;
const IDLE_TAIL_FRAMES = 30;
const STARTUP_GRACE_FRAMES = 180;

const BPMN_CONTAINER_TYPES = new Set([
  'bpmn:Process',
  'bpmn:Collaboration',
  'bpmn:Participant',
  'bpmn:Lane'
]);

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

export async function prepareInteractiveSimulation(modeler) {
  const toggleMode = modeler.get('toggleMode');

  if (!toggleMode._active) {
    toggleMode.toggleMode(true);
    await sleep(100);
  }

  return {
    elementRegistry: modeler.get('elementRegistry'),
    simulator: modeler.get('simulator')
  };
}

export async function waitForSimulationStart(modeler, signal) {
  const startedAt = performance.now();

  while (performance.now() - startedAt < MAX_WAIT_FOR_START_MS) {
    if (signal?.aborted) {
      throw new DOMException('Recording cancelled', 'AbortError');
    }

    if (isSimulationActive(modeler)) {
      return;
    }

    await sleep(100);
  }

  throw new Error('Simulation did not start. Press play on a start event to begin recording.');
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

export function getEndEvents(modeler) {
  return modeler.get('elementRegistry').filter(({ type }) => type === 'bpmn:EndEvent');
}

export function hasTokenAtEndEvent(modeler) {
  const endEvents = getEndEvents(modeler);

  return endEvents.some((element) => {
    const gfx = modeler.get('canvas').getGraphics(element);

    if (!gfx) {
      return false;
    }

    return Boolean(gfx.querySelector('.bts-token-count:not(.inactive)'));
  });
}

export function countActiveAnimations(modeler) {
  let count = 0;
  modeler.get('animation').each(() => {
    count += 1;
  });
  return count;
}

export function isSimulationAnimatingInDom(modeler) {
  const container = modeler.get('canvas').getContainer();
  return Boolean(container.querySelector('.bts-animation-tokens .bts-token'));
}

export function countDomWaitingTokens(modeler) {
  const container = modeler.get('canvas').getContainer();
  return container.querySelectorAll('.bts-token-count.waiting:not(.inactive)').length;
}

export function hasExecutableScopes(modeler) {
  const simulator = modeler.get('simulator');
  const scopes = simulator.findScopes({ trait: ScopeTraits.ACTIVE });

  return scopes.some((scope) => {
    const type = scope.element?.type;

    if (!type || BPMN_CONTAINER_TYPES.has(type)) {
      return false;
    }

    if (type === 'bpmn:SubProcess') {
      return simulator.findScopes({ parent: scope, trait: ScopeTraits.ACTIVE }).length > 0;
    }

    return true;
  });
}

export function isSimulationActive(modeler) {
  return countActiveAnimations(modeler) > 0
    || isSimulationAnimatingInDom(modeler)
    || countDomWaitingTokens(modeler) > 0
    || hasExecutableScopes(modeler);
}

export function pauseSimulationAnimations(modeler) {
  modeler.get('animation').pause();
}

export function resumeSimulationAnimations(modeler) {
  modeler.get('animation').play();
}

export function pauseSimulationForCapture(modeler) {
  const eventBus = modeler.get('eventBus');
  pauseSimulationAnimations(modeler);
  eventBus.fire('tokenSimulation.pauseSimulation');
}

export function resumeSimulationAfterCapture(modeler) {
  const eventBus = modeler.get('eventBus');
  eventBus.fire('tokenSimulation.playSimulation');
  resumeSimulationAnimations(modeler);
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

export function createInteractiveRecordingController(modeler) {
  let sawActivity = false;
  let idleFrames = 0;
  const startedAt = performance.now();

  return {
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
    shouldStop({ stopRequested, signal }) {
      if (signal?.aborted) {
        throw new DOMException('Recording cancelled', 'AbortError');
      }

      if (performance.now() - startedAt > MAX_RECORDING_MS) {
        throw new Error('Simulation recording timed out before completion.');
      }

      if (stopRequested?.()) {
        return sawActivity;
      }

      if (!sawActivity) {
        return false;
      }

      const endEvents = getEndEvents(modeler);

      if (endEvents.length > 0) {
        return idleFrames >= IDLE_TAIL_FRAMES && !isSimulationActive(modeler);
      }

      return idleFrames >= IDLE_TAIL_FRAMES;
    }
  };
}
