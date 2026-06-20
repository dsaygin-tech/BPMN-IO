import { EXPORT_FORMATS } from './export.js';

function bindExportItems(exportMenu, onExport) {
  exportMenu.querySelectorAll('[data-format]').forEach((item) => {
    item.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      onExport(item.dataset.format);
    });
  });
}

export function renderExportMenu({ onExport }) {
  const exportMenu = document.querySelector('#export-menu');
  const standardFormats = Object.values(EXPORT_FORMATS).filter((format) => !format.requiresSimulation);
  const snapshotFormats = Object.values(EXPORT_FORMATS).filter(
    (format) => format.requiresSimulation && !format.isAnimated
  );
  const animationFormats = Object.values(EXPORT_FORMATS).filter((format) => format.isAnimated);

  let html = standardFormats.map((format) => (
    `<button type="button" data-format="${format.id}">${format.label} (.${format.extension})</button>`
  )).join('');

  html += '<div class="dropdown-divider"></div>';
  html += snapshotFormats.map((format) => (
    `<button type="button" data-format="${format.id}" class="simulation-export">${format.label} (.${format.extension})</button>`
  )).join('');

  html += '<div class="dropdown-divider"></div>';
  html += animationFormats.map((format) => (
    `<button type="button" data-format="${format.id}" class="simulation-export">${format.label} (.${format.extension})</button>`
  )).join('');

  exportMenu.innerHTML = html;
  bindExportItems(exportMenu, onExport);
}

export function initExportMenu({ onExport }) {
  const exportButton = document.querySelector('#btn-export');
  const exportMenu = document.querySelector('#export-menu');

  renderExportMenu({ onExport });

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
    renderExportMenu({ onExport });
  };
}
