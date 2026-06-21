import defaultTranslate from 'diagram-js/lib/i18n/translate/translate.js';
import en from 'bpmn-js-i18n/translations/en.js';
import ru from 'bpmn-js-i18n/translations/ru.js';

import { EXTENSION_OVERRIDES } from './i18n-overrides.js';
import propertiesPanelRu from './properties-panel-ru.js';
import { translateUserMessage } from './user-messages.js';

export const LOCALE_STORAGE_KEY = 'bpmn-io-locale';

export const LOCALES = {
  en: { label: 'English', translations: en },
  ru: { label: 'Русский', translations: ru }
};

const DEFAULT_LOCALE = 'ru';

export function getLocale() {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

  if (stored && LOCALES[stored]) {
    return stored;
  }

  const browserLocale = navigator.language?.slice(0, 2);

  if (browserLocale && LOCALES[browserLocale]) {
    return browserLocale;
  }

  return DEFAULT_LOCALE;
}

export function setLocale(locale) {
  if (!LOCALES[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }

  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.documentElement.lang = locale;
}

export function applyDocumentLocale(locale = getLocale()) {
  document.documentElement.lang = locale;
}

export function createCustomTranslate(locale) {
  const { translations } = LOCALES[locale] || LOCALES.en;
  const overrides = EXTENSION_OVERRIDES[locale] || {};
  const panelTranslations = locale === 'ru' ? propertiesPanelRu : {};

  function lookup(template) {
    return overrides[template]
      || panelTranslations[template]
      || panelTranslations[template.trimEnd()]
      || translations[template]
      || translations[template.trimEnd()]
      || template;
  }

  return function customTranslate(template, replacements) {
    return defaultTranslate(lookup(template), replacements);
  };
}

export function createTranslateModule(locale) {
  return {
    translate: ['value', createCustomTranslate(locale)]
  };
}

export function initLocaleUi({ select, onChange }) {
  const locale = getLocale();

  applyDocumentLocale(locale);

  select.replaceChildren(...Object.entries(LOCALES).map(([ id, { label } ]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = label;
    return option;
  }));

  select.value = locale;

  select.addEventListener('change', async () => {
    const next = select.value;

    if (next === getLocale()) {
      return;
    }

    select.disabled = true;

    try {
      setLocale(next);
      await onChange(next);
    } catch (error) {
      console.error('Failed to switch locale', error);
      select.value = getLocale();
      alert(translateUserMessage('Failed to switch language: {message}', getLocale(), { message: error.message }));
    } finally {
      select.disabled = false;
    }
  });
}
