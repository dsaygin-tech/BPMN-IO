import { SHORTCUT_SECTIONS, t } from './app-ui-i18n.js';
import { getLocale } from './i18n.js';

function renderShortcutSections(container, locale = getLocale()) {
  container.replaceChildren();

  for (const section of SHORTCUT_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'shortcuts-section';

    const title = document.createElement('h3');
    title.textContent = t(section.titleKey, locale);
    sectionEl.appendChild(title);

    const list = document.createElement('dl');
    list.className = 'shortcuts-list';

    for (const { actionKey, keys } of section.items) {
      const row = document.createElement('div');
      row.className = 'shortcuts-row';

      const dt = document.createElement('dt');
      dt.textContent = t(actionKey, locale);

      const dd = document.createElement('dd');
      dd.textContent = keys;

      row.append(dt, dd);
      list.appendChild(row);
    }

    sectionEl.appendChild(list);
    container.appendChild(sectionEl);
  }
}

export function initKeyboardHelp({
  button,
  dialog,
  content
}) {
  renderShortcutSections(content);

  button.addEventListener('click', () => {
    dialog.showModal();
  });

  dialog.querySelector('#shortcuts-close')?.addEventListener('click', () => {
    dialog.close();
  });

  dialog.querySelectorAll('[data-external-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();

      const url = link.getAttribute('href');

      if (!url) {
        return;
      }

      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    });
  });

  return {
    refresh(locale = getLocale()) {
      renderShortcutSections(content, locale);
    }
  };
}
