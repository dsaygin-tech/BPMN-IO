const SHORTCUT_SECTIONS = [
  {
    title: 'Файлы',
    items: [
      { action: 'Новая диаграмма', keys: 'Ctrl/Cmd + N' },
      { action: 'Открыть', keys: 'Ctrl/Cmd + O' },
      { action: 'Сохранить', keys: 'Ctrl/Cmd + S' },
      { action: 'Сохранить как', keys: 'Ctrl/Cmd + Shift + S' }
    ]
  },
  {
    title: 'Моделирование',
    items: [
      { action: 'Создать элемент (поиск)', keys: 'N / Т' },
      { action: 'Добавить элемент (поиск)', keys: 'A / Ф' },
      { action: 'Отменить', keys: 'Ctrl/Cmd + Z / Я' },
      { action: 'Повторить', keys: 'Ctrl/Cmd + Y / Н' },
      { action: 'Копировать', keys: 'Ctrl/Cmd + C / С' },
      { action: 'Вставить', keys: 'Ctrl/Cmd + V / М' },
      { action: 'Вырезать', keys: 'Ctrl/Cmd + X / Ч' },
      { action: 'Дублировать', keys: 'Ctrl/Cmd + D / В' },
      { action: 'Выделить всё', keys: 'Ctrl/Cmd + A' },
      { action: 'Поиск', keys: 'Ctrl/Cmd + F / А' },
      { action: 'Рука (pan)', keys: 'H / Р' },
      { action: 'Lasso', keys: 'L / Д' },
      { action: 'Space tool', keys: 'S / Ы' },
      { action: 'Connect', keys: 'C / С' },
      { action: 'Редактировать подпись', keys: 'E / У' },
      { action: 'Заменить элемент', keys: 'R / К' }
    ]
  },
  {
    title: 'Симуляция токена',
    items: [
      { action: 'Включить / выключить', keys: 'Ctrl/Cmd + Shift + T / Е' },
      { action: 'Переключить (на холсте)', keys: 'T / Е' },
      { action: 'Пауза / продолжение', keys: 'Space' },
      { action: 'Сброс', keys: 'R / К' },
      { action: 'Журнал', keys: 'L / Д' }
    ]
  }
];

function renderShortcutSections(container) {
  container.replaceChildren();

  for (const section of SHORTCUT_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'shortcuts-section';

    const title = document.createElement('h3');
    title.textContent = section.title;
    sectionEl.appendChild(title);

    const list = document.createElement('dl');
    list.className = 'shortcuts-list';

    for (const { action, keys } of section.items) {
      const row = document.createElement('div');
      row.className = 'shortcuts-row';

      const dt = document.createElement('dt');
      dt.textContent = action;

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
}
