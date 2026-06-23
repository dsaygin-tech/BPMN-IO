const FOOTER_TOOL_ACTIONS = [ 'replace', 'set-color' ];
const FOOTER_DELETE_ACTION = 'delete';
const FOOTER_ACTION_IDS = new Set([ ...FOOTER_TOOL_ACTIONS, FOOTER_DELETE_ACTION ]);

function reorganizeContextPad(pad) {
  if (!pad) {
    return;
  }

  pad.querySelector('.context-pad-footer')?.remove();
  pad.querySelector('.context-pad-actions')?.remove();

  const toolEntries = FOOTER_TOOL_ACTIONS
    .map((action) => pad.querySelector(`[data-action="${ action }"]`))
    .filter(Boolean);

  const deleteEntry = pad.querySelector(`[data-action="${ FOOTER_DELETE_ACTION }"]`);

  const mainEntries = [ ...pad.querySelectorAll('.group .entry') ].filter((entry) => {
    return !FOOTER_ACTION_IDS.has(entry.getAttribute('data-action'));
  });

  if (mainEntries.length) {
    const actionsRow = document.createElement('div');
    actionsRow.className = 'context-pad-actions';

    for (const entry of mainEntries) {
      actionsRow.appendChild(entry);
    }

    pad.appendChild(actionsRow);
  }

  if (!toolEntries.length && !deleteEntry) {
    pad.querySelectorAll('.group').forEach((group) => {
      group.hidden = true;
    });

    return;
  }

  const footer = document.createElement('div');
  footer.className = 'context-pad-footer';

  const divider = document.createElement('div');
  divider.className = 'context-pad-footer-divider';
  divider.setAttribute('aria-hidden', 'true');
  footer.appendChild(divider);

  if (toolEntries.length) {
    const toolsRow = document.createElement('div');
    toolsRow.className = 'context-pad-footer-tools';

    for (const entry of toolEntries) {
      toolsRow.appendChild(entry);
    }

    footer.appendChild(toolsRow);
  }

  if (deleteEntry && toolEntries.length) {
    const innerDivider = document.createElement('div');
    innerDivider.className = 'context-pad-footer-divider context-pad-footer-divider-inner';
    innerDivider.setAttribute('aria-hidden', 'true');
    footer.appendChild(innerDivider);
  }

  if (deleteEntry) {
    const dangerRow = document.createElement('div');
    dangerRow.className = 'context-pad-footer-danger';
    dangerRow.appendChild(deleteEntry);
    footer.appendChild(dangerRow);
  }

  pad.appendChild(footer);

  pad.querySelectorAll('.group').forEach((group) => {
    group.hidden = true;
  });
}

export default {
  __init__: [
    [ 'eventBus', function(eventBus) {
      eventBus.on('contextPad.open', ({ current }) => {
        reorganizeContextPad(current?.html);
      });
    } ]
  ]
};
