import { getLocale } from './i18n.js';

const ERROR_MESSAGES = {
  en: {
    'Enable Token Simulation before exporting a simulation snapshot.': 'Enable Token Simulation before exporting a simulation snapshot.',
    'Failed to create PNG': 'Failed to create PNG',
    'Failed to render SVG': 'Failed to render SVG',
    'WebM recording is not supported in this environment': 'WebM recording is not supported in this environment',
    'Failed to record WebM video': 'Failed to record WebM video',
    'No frames captured': 'No frames captured',
    'Simulation did not start. Press play on a start event to begin recording.': 'Simulation did not start. Press play on a start event to begin recording.',
    'Simulation did not start. Check that the diagram has a start event.': 'Simulation did not start. Check that the diagram has a start event.',
    'Simulation recording timed out before completion.': 'Simulation recording timed out before completion.',
    'Failed to switch language: {message}': 'Failed to switch language: {message}'
  },
  ru: {
    'Enable Token Simulation before exporting a simulation snapshot.': 'Включите симуляцию токена перед экспортом снимка симуляции.',
    'Failed to create PNG': 'Не удалось создать PNG',
    'Failed to render SVG': 'Не удалось отрисовать SVG',
    'WebM recording is not supported in this environment': 'Запись WebM не поддерживается в этой среде',
    'Failed to record WebM video': 'Не удалось записать WebM-видео',
    'No frames captured': 'Кадры не захвачены',
    'Simulation did not start. Press play on a start event to begin recording.': 'Симуляция не запустилась. Нажмите ▶ на начальном событии для записи.',
    'Simulation did not start. Check that the diagram has a start event.': 'Симуляция не запустилась. Проверьте наличие начального события на диаграмме.',
    'Simulation recording timed out before completion.': 'Превышено время ожидания завершения записи симуляции.',
    'Failed to switch language: {message}': 'Не удалось сменить язык: {message}'
  }
};

const ERROR_PREFIXES = {
  ru: [
    ['Unsupported format: ', 'Неподдерживаемый формат: '],
    ['Unsupported animation format: ', 'Неподдерживаемый формат анимации: ']
  ]
};

export function translateUserMessage(message, locale = getLocale(), replacements = {}) {
  if (!message) {
    return message;
  }

  let template = ERROR_MESSAGES[locale]?.[message]
    ?? ERROR_MESSAGES.en[message]
    ?? message;

  if (template === message && locale === 'ru') {
    for (const [ prefix, translatedPrefix ] of ERROR_PREFIXES.ru) {
      if (message.startsWith(prefix)) {
        template = translatedPrefix + message.slice(prefix.length);
        break;
      }
    }
  }

  return template.replace(/\{([^}]+)\}/g, (_, name) => (
    replacements[name] ?? `{${name}}`
  ));
}

export function alertUserMessage(message, locale = getLocale()) {
  alert(translateUserMessage(message, locale));
}
