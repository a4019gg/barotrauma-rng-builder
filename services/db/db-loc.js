import { getLang, registerLocalizationBundle, setLang, t } from '../../ui/localization.js';

// Database panel translations are registered in the shared localization registry,
// but remain stored in a module-local bundle so keys stay easy to maintain.
registerLocalizationBundle('db', {
  en: {
    effects: 'Effects',
    items: 'Items',
    creatures: 'Creatures',
    searchPlaceholder: 'Search...',
    expandAll: 'Expand / collapse all',
    sortLabel: 'Sort A→Z',
    sortNameAsc: 'A→Z',
    sortNameDesc: 'Z→A',
    scaleLabel: 'Scale UI',
    scaleValue: '{value}',
    compactLabel: 'Compact',
    copyId: 'Copy ID',
    copyIdSuccess: 'ID copied to clipboard',
    copyIdError: 'Failed to copy ID',
    noEntries: 'No entries',
    nothingFound: 'Nothing found',
    countLabel: 'Results',
    countValue: '{count} results',
    typeLabel: 'Type',
    maxStrengthLabel: 'Max strength',
    limbSpecificLabel: 'Limb specific',
    isBuffLabel: 'Is buff',
    descriptionMissing: 'No description',
    yes: 'Yes',
    no: 'No',
    tagsLabel: 'Tags',
    legendTitle: 'Controls',
    legendSearch: '🔍 Search — filter by name, ID, or tags',
    legendSort: 'A–Z — toggle sort order',
    legendScale: '100% — scale cards',
    legendCompact: 'Compact — dense layout',
    legendCopy: '⧉ Copy — copy ID',
    legendToggleTitle: 'Collapse / expand controls',
    'filter-all': 'All',
    'filter-buff': 'Buff',
    'filter-debuff': 'Debuff',
    'filter-damage': 'Damage',
    'filter-status': 'Status',
    'filter-mental': 'Mental',
    'filter-electric': 'Electric'
  },
  ru: {
    effects: 'Эффекты',
    items: 'Предметы',
    creatures: 'Существа',
    searchPlaceholder: 'Поиск...',
    expandAll: 'Развернуть / свернуть все',
    sortLabel: 'Сортировка А→Я',
    sortNameAsc: 'А→Я',
    sortNameDesc: 'Я→А',
    scaleLabel: 'Масштаб UI',
    scaleValue: '{value}',
    compactLabel: 'Компактно',
    copyId: 'Копировать ID',
    copyIdSuccess: 'ID скопирован в буфер обмена',
    copyIdError: 'Не удалось скопировать ID',
    noEntries: 'Нет записей',
    nothingFound: 'Ничего не найдено',
    countLabel: 'Результаты',
    countValue: '{count} результатов',
    typeLabel: 'Тип',
    maxStrengthLabel: 'Макс. сила',
    limbSpecificLabel: 'Для конечности',
    isBuffLabel: 'Бафф',
    descriptionMissing: 'Описание отсутствует',
    yes: 'Да',
    no: 'Нет',
    tagsLabel: 'Теги',
    legendTitle: 'Управление',
    legendSearch: '🔍 Поиск — фильтр по имени, ID или тегам',
    legendSort: 'A–Я — переключение сортировки',
    legendScale: '100% — масштаб карточек',
    legendCompact: 'Компактно — плотный режим',
    legendCopy: '⧉ Копировать — копия ID',
    legendToggleTitle: 'Свернуть / развернуть управление',
    'filter-all': 'Все',
    'filter-buff': 'Бафф',
    'filter-debuff': 'Дебафф',
    'filter-damage': 'Урон',
    'filter-status': 'Статус',
    'filter-mental': 'Ментальный',
    'filter-electric': 'Электрический'
  }
});

export function getLanguage() {
  return getLang();
}

export function setLanguage(lang) {
  setLang(lang);
}

export { t };
