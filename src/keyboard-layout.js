import {
  hasModifier,
  isCmd,
  isCopy,
  isCut,
  isKey,
  isPaste,
  isRedo,
  isShift,
  isUndo
} from 'diagram-js/lib/features/keyboard/KeyboardUtil.js';
import { shouldIgnoreDiagramShortcut } from './keyboard-input.js';

const CYRILLIC_BY_LATIN = {
  a: [ 'ф', 'Ф' ],
  b: [ 'и', 'И' ],
  c: [ 'с', 'С' ],
  d: [ 'в', 'В' ],
  e: [ 'у', 'У' ],
  f: [ 'а', 'А' ],
  g: [ 'п', 'П' ],
  h: [ 'р', 'Р' ],
  i: [ 'ш', 'Ш' ],
  j: [ 'о', 'О' ],
  k: [ 'л', 'Л' ],
  l: [ 'д', 'Д' ],
  m: [ 'ь', 'Ь' ],
  n: [ 'т', 'Т' ],
  o: [ 'щ', 'Щ' ],
  p: [ 'з', 'З' ],
  q: [ 'й', 'Й' ],
  r: [ 'к', 'К' ],
  s: [ 'ы', 'Ы' ],
  t: [ 'е', 'Е' ],
  u: [ 'г', 'Г' ],
  v: [ 'м', 'М' ],
  w: [ 'ц', 'Ц' ],
  x: [ 'ч', 'Ч' ],
  y: [ 'н', 'Н' ],
  z: [ 'я', 'Я' ]
};

const CODE_BY_LATIN = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
    letter,
    `Key${letter.toUpperCase()}`
  ])
);

export function expandKeys(keys) {
  const expanded = new Set();
  const list = Array.isArray(keys) ? keys : [ keys ];

  for (const key of list) {
    expanded.add(key);

    if (key.length !== 1) {
      continue;
    }

    const lower = key.toLowerCase();
    const code = CODE_BY_LATIN[lower];

    if (code) {
      expanded.add(code);
    }

    for (const cyrillic of CYRILLIC_BY_LATIN[lower] || []) {
      expanded.add(cyrillic);
    }
  }

  return [ ...expanded ];
}

export function matchKey(keys, event) {
  const expanded = expandKeys(keys);

  return expanded.includes(event.key) || expanded.includes(event.code);
}

function patchKeyboardIsKey(keyboard) {
  if (keyboard.isKey.__cyrillicPatched) {
    return;
  }

  const originalIsKey = keyboard.isKey.bind(keyboard);

  keyboard.isKey = function cyrillicIsKey(keys, event) {
    return originalIsKey(expandKeys(keys), event);
  };

  keyboard.isKey.__cyrillicPatched = true;
}

function isNativeTextEditingShortcut(event) {
  if (!isCmd(event)) {
    return false;
  }

  return isCopy(event)
    || isPaste(event)
    || isCut(event)
    || isUndo(event)
    || isRedo(event)
    || isKey([ 'a', 'A' ], event);
}

export const CyrillicKeyboardModule = {
  __init__: [
    [
      'eventBus',
      'keyboard',
      'injector',
      function (eventBus, keyboard, injector) {
        const editorActions = injector.get('editorActions', false);

        if (!editorActions) {
          return;
        }

        patchKeyboardIsKey(keyboard);

        let simulationActive = false;

        eventBus.on('tokenSimulation.toggleMode', (event) => {
          simulationActive = event.active;
        });

        eventBus.on('keyboard.init', () => {
          keyboard.addListener(1500, (context) => {
            const event = context.keyEvent;

            if (shouldIgnoreDiagramShortcut(context, injector) && isNativeTextEditingShortcut(event)) {
              return false;
            }

            if (shouldIgnoreDiagramShortcut(context, injector)) {
              return;
            }

            if (isCmd(event)) {
              if (matchKey([ 'z', 'Z' ], event) && !isShift(event)) {
                editorActions.trigger('undo');
                return true;
              }

              if (matchKey([ 'y', 'Y' ], event) || (matchKey([ 'z', 'Z' ], event) && isShift(event))) {
                editorActions.trigger('redo');
                return true;
              }

              if (matchKey([ 'c', 'C' ], event)) {
                editorActions.trigger('copy');
                return true;
              }

              if (matchKey([ 'v', 'V' ], event)) {
                editorActions.trigger('paste');
                return true;
              }

              if (matchKey([ 'x', 'X' ], event)) {
                editorActions.trigger('cut');
                return true;
              }

              if (matchKey([ 'd', 'D' ], event)) {
                editorActions.trigger('duplicate');
                return true;
              }
            }
          });

          keyboard.addListener(10001, (context) => {
            if (shouldIgnoreDiagramShortcut(context, injector)) {
              return;
            }

            const event = context.keyEvent;

            if (hasModifier(event)) {
              return;
            }

            if (matchKey([ 't', 'T' ], event)) {
              editorActions.trigger('toggleTokenSimulation');
              return true;
            }

            if (!simulationActive) {
              return;
            }

            if (matchKey([ 'l', 'L' ], event)) {
              editorActions.trigger('toggleTokenSimulationLog');
              return true;
            }

            if (matchKey([ ' ', 'Spacebar' ], event) || event.code === 'Space') {
              editorActions.trigger('togglePauseTokenSimulation');
              return true;
            }

            if (matchKey([ 'r', 'R' ], event)) {
              editorActions.trigger('resetTokenSimulation');
              return true;
            }
          });
        });
      }
    ]
  ]
};
