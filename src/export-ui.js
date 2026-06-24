import { EXPORT_FORMATS } from './export.js';
import { getExportLabel, t } from './app-ui-i18n.js';
import { getLocale } from './i18n.js';

function bindExportMenu(exportMenu, onExport, onExportAnimation) {
  exportMenu.querySelectorAll('[data-format]').forEach((item) => {
    item.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      onExport(item.dataset.format);
    });
  });

  const animationItem = exportMenu.querySelector('[data-action="export-animation"]');

  if (animationItem) {
    animationItem.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      onExportAnimation?.();
    });
  }
}

export function renderExportMenu({ onExport, onExportAnimation }) {
  const exportMenu = document.querySelector('#export-menu');
  const locale = getLocale();
  const standardFormats = Object.values(EXPORT_FORMATS).filter((format) => !format.requiresSimulation);

  let html = standardFormats.map((format) => (
    `<button type="button" data-format="${format.id}">${getExportLabel(format.id)} (.${format.extension})</button>`
  )).join('');

  html += '<div class="dropdown-divider"></div>';
  html += `<button type="button" data-action="export-animation" class="export-animation-item">${t('toolbar.exportAnimation', locale)}</button>`;

  exportMenu.innerHTML = html;
  bindExportMenu(exportMenu, onExport, onExportAnimation);
}

export function initExportMenu({ onExport, onExportAnimation }) {
  const exportButton = document.querySelector('#btn-export');
  const exportMenu = document.querySelector('#export-menu');

  renderExportMenu({ onExport, onExportAnimation });

  exportButton.addEventListener('click', (event) => {
    event.stopPropagation();
    exportMenu.classList.toggle('open');
  });

  document.addEventListener('click', (event) => {
    if (!exportMenu.contains(event.target) && event.target !== exportButton) {
      exportMenu.classList.remove('open');
    }
  });

  return () => {
    renderExportMenu({ onExport, onExportAnimation });
  };
}
