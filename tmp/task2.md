Давай внедрим библиотеки:
+ diagram-js-grid 
+ diagram-js-minimap 
bpmn-js-color-picker 
bpmn-js-create-append-anything 
bpmn-js-sketchy
bpmn-js-embedded-comments
+ bpmnlint 
bpmn-js-i18n
bpmn-js-create-append-anything



Что уже используется
Пакет / API	Как задействовано
bpmn-js (Modeler)
Полноценное редактирование BPMN
importXML / saveXML / saveSVG / getDefinitions
Открытие, сохранение, экспорт
bpmn-js-properties-panel
Только базовый BpmnPropertiesProviderModule
bpmn-js-token-simulation
Симуляция + программный запуск для GIF/WebM
diagram-js
getBBox, canvas, overlays, eventBus
Сервисы симуляции
simulator, toggleMode, animation, gateway settings
1. Встроено в Modeler, но не «продано» пользователю
BpmnModeler уже включает много модулей, которые работают на холсте, но в README и тулбаре не описаны:

Поиск элементов (SearchModule) — обычно Ctrl/Cmd + F
Undo / Redo — Ctrl/Cmd + Z / Ctrl/Cmd + Shift + Z
Копирование / вставка внутри одной диаграммы
Выравнивание и распределение элементов
Привязка к сетке (GridSnappingModule) — есть snapping, но без визуальной сетки
Контекстное меню, replace menu, bendpoints, resize, label editing
Навигация: pan (hand tool), zoom колёсиком, lasso selection
API createDiagram(), clear(), destroy() — не используются (свой шаблон newDiagram.bpmn)
То есть часть «функций bpmn.io» у вас уже есть — просто не задокументирована.

2. Расширения properties panel (пакет подключён, провайдеры — нет)
Сейчас в app.js только базовый BPMN-провайдер:


app.js
Lines 3-6
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';
Не задействовано, хотя bpmn-js-properties-panel это поддерживает:

Провайдер	Для чего
CamundaPlatformPropertiesProviderModule
Camunda 7: assignee, listeners, forms, async и т.д.
ZeebePropertiesProviderModule
Camunda 8: job workers, connectors, retries
moddleExtensions: { camunda / zeebe }
Чтение/запись vendor-атрибутов в XML
camunda-bpmn-js-behaviors
Корректное поведение при редактировании Camunda-моделей (уже в зависимостях, но не подключён)
propertiesPanel.registerProvider()
Свои группы свойств
propertiesPanel.attachTo() / detach()
Динамическое переключение панели
Пакет @bpmn-io/extract-process-variables тоже тянется транзитивно, но без Camunda/Zeebe-провайдеров практически бесполезен.

3. Отдельные npm-расширения (не установлены)
Из awesome-bpmn-io — наиболее полезные для вашего редактора:

UX / визуал
diagram-js-minimap — мини-карта больших диаграмм
diagram-js-grid — видимая сетка на холсте
diagram-js-origin — крест координат (0,0)
bpmn-js-color-picker — раскраска элементов (как на demo.bpmn.io)
bpmn-js-create-append-anything — улучшенный UX создания/добавления элементов
bpmn-js-sketchy — «нарисованный от руки» стиль
bpmn-js-embedded-comments — комментарии на диаграмме
Качество модели
bpmnlint — валидация BPMN (пустые задачи, недостижимые узлы и т.д.)
bpmn-js-differ — семантический diff двух диаграмм
camunda-transaction-boundaries — визуализация границ транзакций Camunda
Прочее
bpmn-js-i18n — локализация UI (сейчас всё на английском)
bpmn-js-cli — моделирование с клавиатуры без мыши
bpmn-js-native-copy-paste — копирование между вкладками/окнами через системный буфер
@bpmn-io/align-to-origin — выравнивание координат при сохранении
@bpmn-io/add-exporter — метаданные exporter в XML
bpmn-to-image — CLI-экспорт в картинки (у вас свой pipeline через html2canvas/jspdf)
4. Другие тулкиты bpmn.io (отдельные продукты)
Это уже не BPMN, а соседние нотации:

Библиотека	Назначение
dmn-js
DMN: decision tables, DRD, FEEL
cmmn-js
CMMN: case management диаграммы
form-js
Визуальный конструктор форм (Camunda Forms)
Их можно встроить в Electron-приложение по аналогии с BPMN, но сейчас проект — чисто BPMN.

5. API и сервисы bpmn-js, которые почти не используются
Сервис / API	Возможность
modeling
Программное создание/удаление/соединение элементов
selection
Управление выделением из кода
moddle / moddleExtensions
Прямая работа с моделью, кастомные namespace
searchPad
Программный поиск
editorActions
Кастомные действия и горячие клавиши
copyPaste
Расширение логики буфера обмена
rules / commandInterceptor
Кастомные правила моделирования
События eventBus
Подписка на element.click, import.done, saveXML.start и др. (сейчас только commandStack.changed и token simulation)
6. Token simulation — что ещё есть в библиотеке
Вы уже используете продвинутые вещи (simulator, animation, gateway defaults, автозапуск). Не задействовано или задействовано частично:

Полноценный интерактивный режим в UI (у вас есть для записи, но не как отдельный «режим прохождения»)
Настройка условий на потоках через панель (если добавить Camunda/FEEL)
Сценарии с таймерами, сообщениями, компенсацией — симулятор поддерживает, но без execution-свойств моделировать сложнее
Практические рекомендации «что добавить первым»
Если цель — улучшить редактор без большого рефакторинга:

bpmnlint — быстрая польза, мало кода
diagram-js-minimap + bpmn-js-color-picker — заметно улучшают UX на больших схемах
Camunda/Zeebe providers — если диаграммы идут в Camunda/Operaton
bpmn-js-i18n — если нужен русский интерфейс
bpmn-js-create-append-anything — UX как на demo.bpmn.io
Если интересна конкретная область (Camunda, валидация, minimap, локализация) — могу расписать, как именно подключить её в ваш app.js.