export function initSettingsUi({ button, dialog, closeButton }) {
  button.addEventListener('click', () => {
    dialog.showModal();
  });

  closeButton.addEventListener('click', () => {
    dialog.close();
  });
}
