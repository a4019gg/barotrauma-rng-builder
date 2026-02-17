const DICTS = {
  en: {
    treeView: 'Tree View',
    classicView: 'Classic View',
    database: 'Database',
    settings: 'Settings',
    theme: 'Base theme',
    themeStyle: 'Style overlay',
    uiScale: 'UI scale',
    grid: 'Background grid',
    projectImport: 'Import project',
    projectExport: 'Export project',
    projectStub: 'Feature stub: project import/export will be added later',
    generateXML: 'Generate XML',
    copyXML: 'Copy XML',
    downloadXML: 'Download XML',
    importXML: 'Import XML',
    addRng: '+ RNG',
    addItem: '+ Item',
    addCreature: '+ Creature',
    addAffliction: '+ Affliction',
    addEvent: '+ Add Event',
    clearEvent: 'Clear Event',
    events: 'Events',
    rootEvent: 'Root Event',
    eventId: 'Event ID:',
    treeEditor: 'Tree node editor',
    selectTreeNode: 'Select a node in tree to edit',
    nodeType: 'Type',
    removeNode: 'Remove node',
    addSuccess: 'Add to Success',
    addFailure: 'Add to Failure',
    language: 'Language',
    xmlGenerated: 'XML generated',
    xmlImported: 'XML imported',
    xmlCopied: 'XML copied',
    xmlDownloaded: 'XML downloaded',
    undo: 'Undo',
    redo: 'Redo',
    chanceColorCoding: 'Chance color coding',
    treeSettings: 'Tree mode settings',
    showPercentOnLinks: 'Show % on links',
    showPercentNearNodes: 'Show % near nodes',
    enableDragDrop: 'Enable drag & drop',
    snapToGrid: 'Snap to grid',
    showTreeGrid: 'Show tree grid',
    showMinimap: 'Show minimap',
    gridSize: 'Grid size',
    autoLayout: 'Auto-layout',
    collapseSubtree: 'Collapse subtree',
    expandSubtree: 'Expand subtree',
  },
  ru: {
    treeView: 'Древо',
    classicView: 'Классический вид',
    database: 'База',
    settings: 'Настройки',
    theme: 'Базовая тема',
    themeStyle: 'Надстройка темы',
    uiScale: 'Масштаб UI',
    grid: 'Фоновая сетка',
    projectImport: 'Импорт проекта',
    projectExport: 'Экспорт проекта',
    projectStub: 'Заглушка: импорт/экспорт проекта будет добавлен позже',
    generateXML: 'Сгенерировать XML',
    copyXML: 'Копировать XML',
    downloadXML: 'Скачать XML',
    importXML: 'Импорт XML',
    addRng: '+ RNG',
    addItem: '+ Предмет',
    addCreature: '+ Существо',
    addAffliction: '+ Эффект',
    addEvent: '+ Добавить событие',
    clearEvent: 'Очистить событие',
    events: 'События',
    rootEvent: 'Корневое событие',
    eventId: 'ID события:',
    treeEditor: 'Редактор нод дерева',
    selectTreeNode: 'Выберите ноду в дереве для редактирования',
    nodeType: 'Тип',
    removeNode: 'Удалить ноду',
    addSuccess: 'Добавить в Success',
    addFailure: 'Добавить в Failure',
    language: 'Язык',
    xmlGenerated: 'XML сгенерирован',
    xmlImported: 'XML импортирован',
    xmlCopied: 'XML скопирован',
    xmlDownloaded: 'XML скачан',
    undo: 'Отменить',
    redo: 'Повторить',
    chanceColorCoding: 'Цветовая кодировка шансов',
    treeSettings: 'Настройки Tree mod',
    showPercentOnLinks: 'Показывать % на линиях',
    showPercentNearNodes: 'Показывать % возле нод',
    enableDragDrop: 'Включить Drag & Drop',
    snapToGrid: 'Привязка к сетке',
    showTreeGrid: 'Показывать сетку дерева',
    showMinimap: 'Показывать мини-карту',
    gridSize: 'Размер сетки',
    autoLayout: 'Авто-layout',
    collapseSubtree: 'Свернуть поддерево',
    expandSubtree: 'Развернуть поддерево',
  }
};

let currentLang = localStorage.getItem('lang') || 'en';
const listeners = new Set();

export function t(key) {
  return DICTS[currentLang]?.[key] || DICTS.en[key] || key;
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!DICTS[lang]) return;
  currentLang = lang;
  localStorage.setItem('lang', lang);
  listeners.forEach(listener => listener(lang));
}

export function onLangChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyLocalization(root = document) {
  root.querySelectorAll('[data-l10n]').forEach(el => {
    const key = el.dataset.l10n;
    if (key) el.textContent = t(key);
  });

  root.querySelectorAll('[data-l10n-placeholder]').forEach(el => {
    const key = el.dataset.l10nPlaceholder;
    if (key) el.placeholder = t(key);
  });
}
