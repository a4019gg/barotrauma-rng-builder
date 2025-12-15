// js/constants.js — v0.9.401 — ВСЕ МАГИЧЕСКИЕ СТРОКИ И КОНСТАНТЫ

// Размеры
const GRID_SIZE = 30;

// Классы CSS
const CLASS_NAMES = {
  NODE: 'node',
  DRAGGABLE: 'draggable',
  HEADER: 'header-node',
  CHILDREN: 'children',
  PROB: 'prob',
  FINAL_CHANCE: 'final-chance',
  SUCCESS_LABEL: 'success-label',
  FAILURE_LABEL: 'failure-label',
  SMALL_BTN: 'small',
  DANGER_SMALL: 'danger small',
  EVENT_TAB: 'event-tab',
  ACTIVE_TAB: 'active',
  DELETE_TAB: 'delete-tab'
};

// Data-атрибуты
const DATA_ATTR = {
  ACTION: 'data-action',
  TYPE: 'data-type',
  ID: 'data-id',
  PARENT_ID: 'data-parent-id',
  BRANCH: 'data-branch',
  NODE_TYPE: 'data-node-type',
  L10N: 'data-l10n'
};

// Ключи локализации (для удобства)
const LOC_KEYS = {
  SUCCESS_LABEL: 'successLabel',
  FAILURE_LABEL: 'failureLabel',
  RNG_ACTION: 'rngAction',
  SPAWN_ITEM: 'spawnItem',
  SPAWN_CREATURE: 'spawnCreature',
  APPLY_AFFLICTION: 'applyAffliction',
  UNKNOWN_NODE: 'unknownNode',
  ADD_RNG: 'addRNG',
  ADD_ITEM: 'addItem',
  ADD_CREATURE: 'addCreature',
  ADD_AFFLICTION: 'addAffliction',
  ITEM_PLACEHOLDER: 'itemPlaceholder',
  CREATURE_PLACEHOLDER: 'creaturePlaceholder',
  AFFLICTION_PLACEHOLDER: 'afflictionPlaceholder',
  RANDOMIZE_POSITION: 'randomizePosition',
  INSIDE_SUB: 'insideSub',
  OUTSIDE_SUB: 'outsideSub',
  TARGET_CHARACTER: 'targetCharacter',
  TARGET_RANDOM_CREW: 'targetRandomCrew',
  TARGET_ALL_CREW: 'targetAllCrew',
  ROOT_LABEL: 'rootLabel',
  TREE_VIEW: 'treeView',
  CLASSIC_VIEW: 'classicView'
};

// Пути к атласам (для db.js)
const TEXTURE_PATHS = {
  MAIN_ICONS: 'assets/textures/MainIconsAtlas.png',
  COMMAND_UI: 'assets/textures/CommandUIAtlas.png',
  TALENT_ICONS: 'assets/textures/TalentIcons4.png'
};

// Экспорт для использования в других файлах (если используем модули, но пока просто глобально)
window.CONSTANTS = {
  GRID_SIZE,
  CLASS_NAMES,
  DATA_ATTR,
  LOC_KEYS,
  TEXTURE_PATHS
};
