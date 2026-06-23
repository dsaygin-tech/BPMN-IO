export function isTextInputTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  if (target.closest(
    'dialog[open], .bio-properties-panel-input, .djs-direct-editing-parent, .djs-direct-editing-content'
  )) {
    return true;
  }

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export function shouldIgnoreDiagramShortcut(context, injector) {
  const event = context.keyEvent;

  if (isTextInputTarget(event.target)) {
    return true;
  }

  const directEditing = injector.get('directEditing', false);

  return Boolean(directEditing?.isActive?.());
}
