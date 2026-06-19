# BPMN-IO

Десктопный редактор BPMN для Windows и macOS. Построен на [bpmn-js](https://bpmn.io) с симуляцией токена, панелью свойств и экспортом в файлы `.bpmn`.

## Возможности

- Редактирование диаграмм BPMN 2.0 (задачи, шлюзы, события, дорожки и др.)
- **Симуляция токена** — анимация движения токена по процессу
- Открытие, сохранение и экспорт диаграмм в файлы `.bpmn`
- Панель свойств для настройки элементов

## Требования

- Node.js 20+
- npm

## Разработка

```bash
nvm use
npm install
npm run dev
```

Запускаются Vite и Electron. При изменении кода интерфейса приложение перезагружается автоматически.

## Сборка установщиков

```bash
# macOS (.dmg, .zip)
npm run dist:mac

# Windows (.exe-установщик, portable)
npm run dist:win

# Текущая платформа
npm run dist
```

Установщики сохраняются в папку `release/`.

## Горячие клавиши

| Действие | Сочетание |
|----------|-----------|
| Новый | `Ctrl/Cmd + N` |
| Открыть | `Ctrl/Cmd + O` |
| Сохранить | `Ctrl/Cmd + S` |
| Сохранить как | `Ctrl/Cmd + Shift + S` |
| Симуляция токена | `Ctrl/Cmd + Shift + T` |

## Симуляция токена

Нажмите **Token Simulation** на панели инструментов (или используйте горячую клавишу). Редактор переключится в режим симуляции:

1. Нажмите кнопку play на стартовом событии
2. Используйте контекстное меню элементов для продвижения токена
3. Нажмите **Exit Simulation**, чтобы вернуться к редактированию

## Стек технологий

- [Electron](https://www.electronjs.org/) — десктопная оболочка
- [Vite](https://vitejs.dev/) — сборщик
- [bpmn-js](https://github.com/bpmn-io/bpmn-js) — BPMN-редактор
- [bpmn-js-token-simulation](https://github.com/bpmn-io/bpmn-js-token-simulation) — анимация токена
- [bpmn-js-properties-panel](https://github.com/bpmn-io/bpmn-js-properties-panel) — панель свойств

## Лицензия

MIT