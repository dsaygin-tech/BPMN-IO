import { EXPORT_FORMATS } from './export.js';

export function initExportMenu({ onExport }) {
  const exportButton = document.querySelector('#btn-export');
  const exportMenu = document.querySelector('#export-menu');

  exportButton.addEventListener('click', (event) => {
    event.stopPropagation();
    exportMenu.classList.toggle('open');
  });

  exportMenu.querySelectorAll('[data-format]').forEach((item) => {
    item.addEventListener('click', () => {
      exportMenu.classList.remove('open');
      onExport(item.dataset.format);
    });
  });

  document.addEventListener('click', (event) => {
    if (!exportMenu.contains(event.target) && event.target !== exportButton) {
      exportMenu.classList.remove('open');
    }
  });
}

export function renderExportMenu() {
  const exportMenu = document.querySelector('#export-menu');

  exportMenu.innerHTML = Object.values(EXPORT_FORMATS).map((format) => (
    `<button type="button" data-format="${format.id}">${format.label} (.${format.extension})</button>`
  )).join('');
}
