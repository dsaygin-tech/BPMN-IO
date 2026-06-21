import {
  enterSimulation,
  restartSimulation,
  afterLibraryReset,
  setStepMode
} from './simulation-runner.js';

export const SIMULATION_START_MODES = {
  interactive: {
    id: 'interactive',
    label: 'Interactive'
  },
  auto: {
    id: 'auto',
    label: 'Auto-start'
  }
};

export function initSimulationUi({
  modeler,
  onSimulationActiveChange
}) {
  const startModeSelect = document.querySelector('#simulation-start-mode');
  const stepModeCheckbox = document.querySelector('#simulation-step-mode');

  let simulationActive = false;
  let startMode = SIMULATION_START_MODES.auto.id;
  let stepMode = false;
  let pendingEnter = false;

  function getEditorActions() {
    try {
      return modeler.get('editorActions');
    } catch {
      return null;
    }
  }

  function syncStartModeFromUi() {
    startMode = startModeSelect.value;
    return startMode;
  }

  async function enterSimulationRun() {
    if (pendingEnter) {
      return;
    }

    pendingEnter = true;

    try {
      syncStartModeFromUi();
      await enterSimulation(modeler, { startMode, stepMode });
    } finally {
      pendingEnter = false;
    }
  }

  function handleSimulationEnter() {
    enterSimulationRun().catch(console.error);
  }

  async function applyStartMode(mode, { runImmediately = false } = {}) {
    startMode = mode;
    startModeSelect.value = mode;

    if (runImmediately && simulationActive && mode === SIMULATION_START_MODES.auto.id) {
      if (pendingEnter) {
        return;
      }

      pendingEnter = true;

      try {
        await restartSimulation(modeler, { startMode, stepMode });
      } finally {
        pendingEnter = false;
      }
    }
  }

  function handleSimulationReset() {
    syncStartModeFromUi();
    getEditorActions()?.trigger('resetTokenSimulation');
  }

  function handleLibraryReset() {
    syncStartModeFromUi();

    afterLibraryReset(modeler, { startMode, stepMode }).catch(console.error);
  }

  startModeSelect.addEventListener('change', () => {
    applyStartMode(startModeSelect.value, { runImmediately: true }).catch(console.error);
  });

  stepModeCheckbox.addEventListener('change', () => {
    stepMode = stepModeCheckbox.checked;
    setStepMode(modeler, stepMode);
  });

  modeler.get('eventBus').on('tokenSimulation.toggleMode', (event) => {
    simulationActive = event.active;
    onSimulationActiveChange?.(event.active);
  });

  // Run after bpmn-js-token-simulation resets the simulator (priority 5000).
  modeler.get('eventBus').on('tokenSimulation.resetSimulation', 1000, () => {
    if (!modeler.get('toggleMode')._active) {
      return;
    }

    handleLibraryReset();
  });

  return {
    getStartMode: () => startMode,
    setStartMode: (mode) => applyStartMode(mode, { runImmediately: true }),
    isStepMode: () => stepMode,
    setStepMode: (enabled) => {
      stepMode = enabled;
      stepModeCheckbox.checked = enabled;
      setStepMode(modeler, enabled);
    },
    triggerPause: () => getEditorActions()?.trigger('togglePauseTokenSimulation'),
    triggerReset: () => handleSimulationReset(),
    triggerLog: () => getEditorActions()?.trigger('toggleTokenSimulationLog'),
    enter: handleSimulationEnter,
    isSimulationActive: () => simulationActive
  };
}
