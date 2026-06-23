import { getLocale } from './i18n.js';

export { getLocale };

export const APP_UI = {
  en: {
    'toolbar.new': 'New',
    'toolbar.new.title': 'New diagram (Ctrl+N)',
    'toolbar.open': 'Open',
    'toolbar.open.title': 'Open file (Ctrl+O)',
    'toolbar.save': 'Save',
    'toolbar.save.title': 'Save (Ctrl+S)',
    'toolbar.saveAs': 'Save As',
    'toolbar.saveAs.title': 'Save as (Ctrl+Shift+S)',
    'toolbar.export': 'Export ▾',
    'toolbar.export.title': 'Export diagram',
    'toolbar.sketchy': 'Sketchy',
    'toolbar.sketchy.title': 'Hand-drawn sketchy diagram style',
    'toolbar.sketchy.aria': 'Sketchy diagram style',
    'toolbar.language': 'Language',
    'toolbar.language.title': 'Diagram editor language',
    'toolbar.language.aria': 'Diagram editor language',
    'toolbar.exportAnimation': 'Export Animation',
    'toolbar.exportAnimation.title': 'Export token simulation as WebM video',
    'toolbar.simulation.start': 'Start',
    'toolbar.simulation.start.title': 'How simulation starts when entering token simulation mode',
    'toolbar.simulation.interactive': 'Interactive',
    'toolbar.simulation.auto': 'Auto-start',
    'toolbar.simulation.stepMode': 'Step mode',
    'toolbar.simulation.stepMode.title': 'Pause at each activity until you continue manually',
    'toolbar.shortcuts.title': 'Keyboard shortcuts',
    'toolbar.help.title': 'Help',
    'toolbar.shortcuts.close': 'Close',
    'file.untitled': 'Untitled',
    'drop.overlay': 'Drop BPMN file to open',
    'recording.title': 'Export simulation animation',
    'recording.modeDescription.auto': 'Simulation starts automatically from the beginning. Recording stops when all tokens finish.',
    'recording.modeDescription.interactive': 'Start the simulation yourself. Recording stops when you click Stop or when a final end event is reached.',
    'recording.mode': 'Recording mode',
    'recording.mode.auto': 'Automatic — full run from start',
    'recording.mode.interactive': 'Interactive — you control the simulation',
    'recording.area': 'Recording area',
    'recording.area.diagram': 'Entire diagram',
    'recording.area.viewport': 'Current view',
    'recording.area.tight': 'Tight crop',
    'recording.area.custom': 'Custom padding',
    'recording.area.manual': 'Draw with mouse',
    'recording.cropHint': 'After clicking Start export, drag on the diagram to select the recording area.',
    'recording.padding': 'Padding (px)',
    'recording.cancel': 'Cancel',
    'recording.start': 'Start export',
    'recording.drawArea': 'Draw area…',
    'recording.progress.prepare': 'Preparing simulation...',
    'recording.progress.wait': 'Waiting for simulation start...',
    'recording.progress.record': 'Recording animation...',
    'recording.progress.encode': 'Encoding file...',
    'recording.progress.stop': 'Stop recording',
    'shortcuts.title': 'Keyboard shortcuts',
    'help.title': 'Help',
    'help.aboutPrefix': 'Based on',
    'help.link.tokenSimulation': 'Token Simulation demo',
    'shortcuts.note': 'Shortcuts use physical keys and work in Russian layout. Letters in parentheses are on the ЙЦУКЕН keyboard.',
    'confirm.discardChanges': 'Discard unsaved changes?',
    'alert.openFailed': 'Failed to open diagram: {message}',
    'alert.exportFailed': '{message}',
    'alert.sketchyFailed': 'Failed to switch sketchy mode: {message}',
    'alert.localeFailed': 'Failed to switch language: {message}',
    'alert.unsupportedFile': 'Only .bpmn and .xml files are supported.',
    'alert.fileOpenFailed': 'Failed to open file: {message}',
    'export.bpmn': 'BPMN XML',
    'export.json': 'JSON',
    'export.svg': 'SVG',
    'export.png': 'PNG',
    'export.pdf': 'PDF',
    'export.simulationPng': 'Simulation PNG',
    'export.simulationWebm': 'Simulation WebM',
    'crop.hint': 'Drag to select the recording area. Press Esc to cancel.',
    'shortcuts.section.files': 'Files',
    'shortcuts.section.modeling': 'Modeling',
    'shortcuts.section.simulation': 'Token simulation',
    'shortcuts.action.newDiagram': 'New diagram',
    'shortcuts.action.open': 'Open',
    'shortcuts.action.save': 'Save',
    'shortcuts.action.saveAs': 'Save as',
    'shortcuts.action.createElement': 'Create element (search)',
    'shortcuts.action.appendElement': 'Append element (search)',
    'shortcuts.action.undo': 'Undo',
    'shortcuts.action.redo': 'Redo',
    'shortcuts.action.copy': 'Copy',
    'shortcuts.action.paste': 'Paste',
    'shortcuts.action.cut': 'Cut',
    'shortcuts.action.duplicate': 'Duplicate',
    'shortcuts.action.selectAll': 'Select all',
    'shortcuts.action.find': 'Find',
    'shortcuts.action.hand': 'Hand (pan)',
    'shortcuts.action.lasso': 'Lasso',
    'shortcuts.action.spaceTool': 'Space tool',
    'shortcuts.action.connect': 'Connect',
    'shortcuts.action.editLabel': 'Edit label',
    'shortcuts.action.replace': 'Replace element',
    'shortcuts.action.toggleSimulation': 'Toggle simulation',
    'shortcuts.action.toggleSimulationCanvas': 'Toggle (on canvas)',
    'shortcuts.action.pause': 'Pause / resume',
    'shortcuts.action.reset': 'Reset',
    'shortcuts.action.log': 'Log'
  },
  ru: {
    'toolbar.new': 'Создать',
    'toolbar.new.title': 'Новая диаграмма (Ctrl+N)',
    'toolbar.open': 'Открыть',
    'toolbar.open.title': 'Открыть файл (Ctrl+O)',
    'toolbar.save': 'Сохранить',
    'toolbar.save.title': 'Сохранить (Ctrl+S)',
    'toolbar.saveAs': 'Сохранить как',
    'toolbar.saveAs.title': 'Сохранить как (Ctrl+Shift+S)',
    'toolbar.export': 'Экспорт ▾',
    'toolbar.export.title': 'Экспорт диаграммы',
    'toolbar.sketchy': 'Скетч',
    'toolbar.sketchy.title': 'Стиль «скетч»',
    'toolbar.sketchy.aria': 'Стиль «скетч»',
    'toolbar.language': 'Язык',
    'toolbar.language.title': 'Язык редактора диаграммы',
    'toolbar.language.aria': 'Язык редактора диаграммы',
    'toolbar.exportAnimation': 'Экспорт анимации',
    'toolbar.exportAnimation.title': 'Экспорт симуляции токена в WebM',
    'toolbar.simulation.start': 'Старт',
    'toolbar.simulation.start.title': 'Как запускается симуляция при входе в режим',
    'toolbar.simulation.interactive': 'Интерактивно',
    'toolbar.simulation.auto': 'Автозапуск',
    'toolbar.simulation.stepMode': 'Пошаговый режим',
    'toolbar.simulation.stepMode.title': 'Пауза на каждой задаче до ручного продолжения',
    'toolbar.shortcuts.title': 'Горячие клавиши',
    'toolbar.help.title': 'Справка',
    'toolbar.shortcuts.close': 'Закрыть',
    'file.untitled': 'Без названия',
    'drop.overlay': 'Перетащите BPMN-файл для открытия',
    'recording.title': 'Экспорт анимации симуляции',
    'recording.modeDescription.auto': 'Симуляция запускается автоматически с начала. Запись останавливается, когда все токены завершат путь.',
    'recording.modeDescription.interactive': 'Запустите симуляцию сами. Запись остановится по кнопке «Стоп» или при достижении конечного события.',
    'recording.mode': 'Режим записи',
    'recording.mode.auto': 'Автоматически — полный прогон с начала',
    'recording.mode.interactive': 'Интерактивно — вы управляете симуляцией',
    'recording.area': 'Область записи',
    'recording.area.diagram': 'Вся диаграмма',
    'recording.area.viewport': 'Текущий вид',
    'recording.area.tight': 'Плотная обрезка',
    'recording.area.custom': 'Свои отступы',
    'recording.area.manual': 'Выделить мышью',
    'recording.cropHint': 'После нажатия «Начать экспорт» выделите область записи на диаграмме.',
    'recording.padding': 'Отступ (px)',
    'recording.cancel': 'Отмена',
    'recording.start': 'Начать экспорт',
    'recording.drawArea': 'Выделить область…',
    'recording.progress.prepare': 'Подготовка симуляции...',
    'recording.progress.wait': 'Ожидание запуска симуляции...',
    'recording.progress.record': 'Запись анимации...',
    'recording.progress.encode': 'Кодирование файла...',
    'recording.progress.stop': 'Остановить запись',
    'shortcuts.title': 'Горячие клавиши',
    'help.title': 'Справка',
    'help.aboutPrefix': 'На основе',
    'help.link.tokenSimulation': 'Демо Token Simulation',
    'shortcuts.note': 'Сочетания работают по физическим клавишам и в русской раскладке. В скобках — буквы на ЙЦУКЕН.',
    'confirm.discardChanges': 'Отменить несохранённые изменения?',
    'alert.openFailed': 'Не удалось открыть диаграмму: {message}',
    'alert.exportFailed': '{message}',
    'alert.sketchyFailed': 'Не удалось переключить режим Sketchy: {message}',
    'alert.localeFailed': 'Не удалось сменить язык: {message}',
    'alert.unsupportedFile': 'Поддерживаются только файлы .bpmn и .xml.',
    'alert.fileOpenFailed': 'Не удалось открыть файл: {message}',
    'export.bpmn': 'BPMN XML',
    'export.json': 'JSON',
    'export.svg': 'SVG',
    'export.png': 'PNG',
    'export.pdf': 'PDF',
    'export.simulationPng': 'PNG симуляции',
    'export.simulationWebm': 'WebM симуляции',
    'crop.hint': 'Выделите область записи. Esc — отмена.',
    'shortcuts.section.files': 'Файлы',
    'shortcuts.section.modeling': 'Моделирование',
    'shortcuts.section.simulation': 'Симуляция токена',
    'shortcuts.action.newDiagram': 'Новая диаграмма',
    'shortcuts.action.open': 'Открыть',
    'shortcuts.action.save': 'Сохранить',
    'shortcuts.action.saveAs': 'Сохранить как',
    'shortcuts.action.createElement': 'Создать элемент (поиск)',
    'shortcuts.action.appendElement': 'Добавить элемент (поиск)',
    'shortcuts.action.undo': 'Отменить',
    'shortcuts.action.redo': 'Повторить',
    'shortcuts.action.copy': 'Копировать',
    'shortcuts.action.paste': 'Вставить',
    'shortcuts.action.cut': 'Вырезать',
    'shortcuts.action.duplicate': 'Дублировать',
    'shortcuts.action.selectAll': 'Выделить всё',
    'shortcuts.action.find': 'Поиск',
    'shortcuts.action.hand': 'Рука (pan)',
    'shortcuts.action.lasso': 'Лассо',
    'shortcuts.action.spaceTool': 'Инструмент «Пробел»',
    'shortcuts.action.connect': 'Соединение',
    'shortcuts.action.editLabel': 'Редактировать подпись',
    'shortcuts.action.replace': 'Заменить элемент',
    'shortcuts.action.toggleSimulation': 'Включить / выключить',
    'shortcuts.action.toggleSimulationCanvas': 'Переключить (на холсте)',
    'shortcuts.action.pause': 'Пауза / продолжение',
    'shortcuts.action.reset': 'Сброс',
    'shortcuts.action.log': 'Журнал'
  }
};

const EXPORT_LABEL_KEYS = {
  bpmn: 'export.bpmn',
  json: 'export.json',
  svg: 'export.svg',
  png: 'export.png',
  pdf: 'export.pdf',
  'simulation-png': 'export.simulationPng',
  'simulation-webm': 'export.simulationWebm'
};

export const SHORTCUT_SECTIONS = [
  {
    titleKey: 'shortcuts.section.files',
    items: [
      { actionKey: 'shortcuts.action.newDiagram', keys: 'Ctrl/Cmd + N' },
      { actionKey: 'shortcuts.action.open', keys: 'Ctrl/Cmd + O' },
      { actionKey: 'shortcuts.action.save', keys: 'Ctrl/Cmd + S' },
      { actionKey: 'shortcuts.action.saveAs', keys: 'Ctrl/Cmd + Shift + S' }
    ]
  },
  {
    titleKey: 'shortcuts.section.modeling',
    items: [
      { actionKey: 'shortcuts.action.createElement', keys: 'N / Т' },
      { actionKey: 'shortcuts.action.appendElement', keys: 'A / Ф' },
      { actionKey: 'shortcuts.action.undo', keys: 'Ctrl/Cmd + Z / Я' },
      { actionKey: 'shortcuts.action.redo', keys: 'Ctrl/Cmd + Y / Н' },
      { actionKey: 'shortcuts.action.copy', keys: 'Ctrl/Cmd + C / С' },
      { actionKey: 'shortcuts.action.paste', keys: 'Ctrl/Cmd + V / М' },
      { actionKey: 'shortcuts.action.cut', keys: 'Ctrl/Cmd + X / Ч' },
      { actionKey: 'shortcuts.action.duplicate', keys: 'Ctrl/Cmd + D / В' },
      { actionKey: 'shortcuts.action.selectAll', keys: 'Ctrl/Cmd + A' },
      { actionKey: 'shortcuts.action.find', keys: 'Ctrl/Cmd + F / А' },
      { actionKey: 'shortcuts.action.hand', keys: 'H / Р' },
      { actionKey: 'shortcuts.action.lasso', keys: 'L / Д' },
      { actionKey: 'shortcuts.action.spaceTool', keys: 'S / Ы' },
      { actionKey: 'shortcuts.action.connect', keys: 'C / С' },
      { actionKey: 'shortcuts.action.editLabel', keys: 'E / У' },
      { actionKey: 'shortcuts.action.replace', keys: 'R / К' }
    ]
  },
  {
    titleKey: 'shortcuts.section.simulation',
    items: [
      { actionKey: 'shortcuts.action.toggleSimulation', keys: 'Ctrl/Cmd + Shift + T / Е' },
      { actionKey: 'shortcuts.action.toggleSimulationCanvas', keys: 'T / Е' },
      { actionKey: 'shortcuts.action.pause', keys: 'Space' },
      { actionKey: 'shortcuts.action.reset', keys: 'R / К' },
      { actionKey: 'shortcuts.action.log', keys: 'L / Д' }
    ]
  }
];

export function t(key, locale = getLocale(), replacements = {}) {
  const template = APP_UI[locale]?.[key] ?? APP_UI.en[key] ?? key;

  return template.replace(/\{([^}]+)\}/g, (_, name) => (
    replacements[name] ?? `{${name}}`
  ));
}

export function getExportLabel(formatId, locale = getLocale()) {
  const key = EXPORT_LABEL_KEYS[formatId];
  return key ? t(key, locale) : formatId;
}

export function applyAppUiLocale(locale = getLocale(), { refreshExportMenu, refreshRecordingUi, refreshKeyboardHelp } = {}) {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n, locale);
  });

  document.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle, locale);
  });

  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria, locale));
  });

  const recordingMode = document.querySelector('#recording-mode')?.value ?? 'auto';
  const modeDescription = document.querySelector('#recording-mode-description');

  if (modeDescription) {
    modeDescription.textContent = t(`recording.modeDescription.${recordingMode}`, locale);
  }

  refreshExportMenu?.();
  refreshRecordingUi?.(locale);
  refreshKeyboardHelp?.(locale);
  window.electronAPI?.setLocale?.(locale);
}
