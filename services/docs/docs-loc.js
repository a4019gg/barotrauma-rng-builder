const dictionaries = new Map();
let currentLang = "en";

export function registerDocumentationDictionary(lang, entries) {
  if (!lang || !entries || typeof entries !== "object") return;
  dictionaries.set(lang, { ...entries });
}

export function setDocumentationLanguage(lang) {
  if (!lang || !dictionaries.has(lang)) return;
  currentLang = lang;
}

export function getDocumentationLanguage() {
  return currentLang;
}

export function tDoc(key, fallback = "") {
  const dict = dictionaries.get(currentLang);
  if (dict && key in dict) return dict[key];
  const english = dictionaries.get("en");
  if (english && key in english) return english[key];
  return fallback || key;
}

export function hasDocKey(key, lang = currentLang) {
  const dict = dictionaries.get(lang);
  return Boolean(dict && key in dict);
}

registerDocumentationDictionary("en", {
  "docs.ui.title": "Documentation",
  "docs.ui.subtitle": "Built-in guide for Barotrauma event authoring.",
  "docs.ui.backToEditor": "Back to editor",
  "docs.ui.searchPlaceholder": "Search documentation...",
  "docs.ui.searchSummary": "{count} articles found",
  "docs.ui.searchEmptyTitle": "Nothing found",
  "docs.ui.searchEmptyText": "Try another search query.",
  "docs.ui.category.basic": "Basic",
  "docs.ui.category.advanced": "Advanced",
  "docs.ui.group.quickstart": "Quick Start",
  "docs.ui.group.concepts": "Concepts",
  "docs.ui.group.nodes": "Nodes",
  "docs.ui.group.examples": "Examples",
  "docs.ui.group.modes": "Modes",
  "docs.ui.group.faq": "FAQ",
  "docs.ui.group.advanced": "Advanced",

  "docs.quickstart.title": "Getting Started",
  "docs.quickstart.description": "This tool allows you to visually create random events for Barotrauma without writing XML manually.",
  "docs.quickstart.stepsTitle": "Steps",
  "docs.quickstart.step1": "Create EventSet",
  "docs.quickstart.step2": "Add Event inside EventSet",
  "docs.quickstart.step3": "Add RNG node",
  "docs.quickstart.step4": "Add Item or Creature",
  "docs.quickstart.step5": "Generate XML",

  "docs.concepts.eventset.title": "EventSet (When events happen)",
  "docs.concepts.eventset.content": "EventSet controls when events are triggered. It acts as a filter and selector for events based on conditions like difficulty, intensity, and location.",
  "docs.concepts.event.title": "Event (What happens)",
  "docs.concepts.event.content": "Event defines what actually happens in the game. It contains logic such as RNG and actions.",
  "docs.concepts.rng.title": "RNG (Random logic)",
  "docs.concepts.rng.content": "RNG defines probability-based branching. Each branch can lead to different outcomes such as spawning items or creatures.",

  "docs.nodes.rng.title": "RNG",
  "docs.nodes.rng.point1": "Defines probability-based branching",
  "docs.nodes.rng.point2": "Chance determines how likely this branch is selected",
  "docs.nodes.eventset.title": "EventSet",
  "docs.nodes.eventset.point1": "Controls event selection and conditions",
  "docs.nodes.eventset.point2": "Supports filtering by intensity, difficulty, and environment",
  "docs.nodes.event.title": "Event",
  "docs.nodes.event.point1": "Container for actions and logic",
  "docs.nodes.item.title": "Item",
  "docs.nodes.item.point1": "Spawns an item",
  "docs.nodes.creature.title": "Creature",
  "docs.nodes.creature.point1": "Spawns a creature",
  "docs.nodes.affliction.title": "Affliction",
  "docs.nodes.affliction.point1": "Applies a status effect",

  "docs.examples.simpleRng.title": "Simple RNG",
  "docs.examples.simpleRng.content": "50% chance to spawn item, 50% chance to spawn creature",
  "docs.examples.ambush.title": "Ambush",
  "docs.examples.ambush.content": "Spawn creature inside the submarine",
  "docs.examples.nestedRng.title": "Nested RNG",
  "docs.examples.nestedRng.content": "Random logic inside another random branch",

  "docs.modes.title": "Modes",
  "docs.modes.basic": "Basic: Simple RNG with limited options",
  "docs.modes.intermediate": "Intermediate: Supports multiple branches and nested RNG",
  "docs.modes.advanced": "Advanced: Full control with EventSet and complex structures",

  "docs.faq.troubleshooting.title": "Troubleshooting",
  "docs.faq.trigger.question": "Why does my event not trigger?",
  "docs.faq.trigger.answer": "Check intensity, difficulty, and cooldown settings.",
  "docs.faq.rng.question": "Why RNG does not behave as expected?",
  "docs.faq.rng.answer": "Check probabilities and nested RNG structure.",

  "docs.advanced.eventset.title": "EventSet Deep Dive",
  "docs.advanced.eventset.chooserandom": "If true, selects random events instead of executing all",
  "docs.advanced.eventset.eventcount": "Number of events selected when chooserandom is enabled",
  "docs.advanced.eventset.intensity": "Defines required intensity range",
  "docs.advanced.eventset.difficulty": "Defines level difficulty range (0–100)",
  "docs.advanced.eventset.allowatstart": "Allows triggering at level start",
  "docs.advanced.eventset.perstructure": "Applies event per structure",
  "docs.advanced.eventset.ignorecooldown": "Ignores global cooldown",
  "docs.advanced.eventset.triggereventcooldown": "Triggers cooldown after execution",
  "docs.advanced.rng.title": "RNG & Probability",
  "docs.advanced.rng.point1": "RNG can be nested",
  "docs.advanced.rng.point2": "Each branch has its own probability",
  "docs.advanced.rng.point3": "Complex behavior emerges from combining multiple RNG nodes",
  "docs.advanced.spawning.title": "Spawning System",
  "docs.advanced.spawning.point1": "Spawn types define where entities appear",
  "docs.advanced.spawning.point2": "Scatter controls spread",
  "docs.advanced.spawning.point3": "Offset shifts spawn position",
  "docs.advanced.spawning.point4": "Spawn probability controls if spawning happens",
  "docs.advanced.spawning.point5": "Max amount per level limits total entities"
});

registerDocumentationDictionary("ru", {
  "docs.ui.title": "Документация",
  "docs.ui.subtitle": "Встроенное руководство по созданию событий Barotrauma.",
  "docs.ui.backToEditor": "Вернуться в редактор",
  "docs.ui.searchPlaceholder": "Поиск по документации...",
  "docs.ui.searchSummary": "Найдено статей: {count}",
  "docs.ui.searchEmptyTitle": "Ничего не найдено",
  "docs.ui.searchEmptyText": "Попробуйте другой поисковый запрос.",
  "docs.ui.category.basic": "Базовый",
  "docs.ui.category.advanced": "Продвинутый",
  "docs.ui.group.quickstart": "Быстрый старт",
  "docs.ui.group.concepts": "Концепции",
  "docs.ui.group.nodes": "Узлы",
  "docs.ui.group.examples": "Примеры",
  "docs.ui.group.modes": "Режимы",
  "docs.ui.group.faq": "FAQ",
  "docs.ui.group.advanced": "Advanced",

  "docs.quickstart.title": "Начало работы",
  "docs.quickstart.description": "Этот инструмент позволяет визуально создавать случайные события для Barotrauma без ручного написания XML.",
  "docs.quickstart.stepsTitle": "Шаги",
  "docs.quickstart.step1": "Создайте EventSet",
  "docs.quickstart.step2": "Добавьте Event внутрь EventSet",
  "docs.quickstart.step3": "Добавьте узел RNG",
  "docs.quickstart.step4": "Добавьте Item или Creature",
  "docs.quickstart.step5": "Сгенерируйте XML",

  "docs.concepts.eventset.title": "EventSet (Когда происходят события)",
  "docs.concepts.eventset.content": "EventSet управляет тем, когда события срабатывают. Он действует как фильтр и селектор событий на основе условий вроде сложности, интенсивности и локации.",
  "docs.concepts.event.title": "Event (Что происходит)",
  "docs.concepts.event.content": "Event определяет, что именно происходит в игре. Он содержит логику, такую как RNG и действия.",
  "docs.concepts.rng.title": "RNG (Случайная логика)",
  "docs.concepts.rng.content": "RNG определяет ветвление на основе вероятностей. Каждая ветка может приводить к разным исходам, например к спавну предметов или существ.",

  "docs.nodes.rng.title": "RNG",
  "docs.nodes.rng.point1": "Определяет ветвление на основе вероятностей",
  "docs.nodes.rng.point2": "Chance определяет, насколько вероятно будет выбрана эта ветка",
  "docs.nodes.eventset.title": "EventSet",
  "docs.nodes.eventset.point1": "Управляет выбором событий и условиями",
  "docs.nodes.eventset.point2": "Поддерживает фильтрацию по интенсивности, сложности и окружению",
  "docs.nodes.event.title": "Event",
  "docs.nodes.event.point1": "Контейнер для действий и логики",
  "docs.nodes.item.title": "Item",
  "docs.nodes.item.point1": "Спавнит предмет",
  "docs.nodes.creature.title": "Creature",
  "docs.nodes.creature.point1": "Спавнит существо",
  "docs.nodes.affliction.title": "Affliction",
  "docs.nodes.affliction.point1": "Накладывает статусный эффект",

  "docs.examples.simpleRng.title": "Простой RNG",
  "docs.examples.simpleRng.content": "50% шанс заспавнить предмет, 50% шанс заспавнить существо",
  "docs.examples.ambush.title": "Засада",
  "docs.examples.ambush.content": "Заспавнить существо внутри субмарины",
  "docs.examples.nestedRng.title": "Вложенный RNG",
  "docs.examples.nestedRng.content": "Случайная логика внутри другой случайной ветки",

  "docs.modes.title": "Режимы",
  "docs.modes.basic": "Basic: простой RNG с ограниченными возможностями",
  "docs.modes.intermediate": "Intermediate: поддерживает несколько веток и вложенный RNG",
  "docs.modes.advanced": "Advanced: полный контроль с EventSet и сложными структурами",

  "docs.faq.troubleshooting.title": "Решение проблем",
  "docs.faq.trigger.question": "Почему моё событие не срабатывает?",
  "docs.faq.trigger.answer": "Проверьте настройки интенсивности, сложности и cooldown.",
  "docs.faq.rng.question": "Почему RNG ведёт себя не так, как ожидается?",
  "docs.faq.rng.answer": "Проверьте вероятности и структуру вложенного RNG.",

  "docs.advanced.eventset.title": "EventSet Deep Dive",
  "docs.advanced.eventset.chooserandom": "Если true, выбирает случайные события вместо выполнения всех",
  "docs.advanced.eventset.eventcount": "Количество событий, выбираемых при включённом chooserandom",
  "docs.advanced.eventset.intensity": "Определяет требуемый диапазон интенсивности",
  "docs.advanced.eventset.difficulty": "Определяет диапазон сложности уровня (0–100)",
  "docs.advanced.eventset.allowatstart": "Разрешает срабатывание в начале уровня",
  "docs.advanced.eventset.perstructure": "Применяет событие для каждой структуры",
  "docs.advanced.eventset.ignorecooldown": "Игнорирует глобальный cooldown",
  "docs.advanced.eventset.triggereventcooldown": "Запускает cooldown после выполнения",
  "docs.advanced.rng.title": "RNG и вероятность",
  "docs.advanced.rng.point1": "RNG можно вкладывать друг в друга",
  "docs.advanced.rng.point2": "Каждая ветка имеет собственную вероятность",
  "docs.advanced.rng.point3": "Сложное поведение возникает при комбинации нескольких RNG-узлов",
  "docs.advanced.spawning.title": "Система спавна",
  "docs.advanced.spawning.point1": "Типы спавна определяют, где появляются сущности",
  "docs.advanced.spawning.point2": "Scatter управляет разбросом",
  "docs.advanced.spawning.point3": "Offset смещает позицию спавна",
  "docs.advanced.spawning.point4": "Spawn probability управляет тем, произойдёт ли спавн",
  "docs.advanced.spawning.point5": "Max amount per level ограничивает общее число сущностей"
});
