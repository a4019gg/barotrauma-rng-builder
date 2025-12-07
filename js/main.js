// js/main.js — v0.9.99 — ФИНАЛЬНАЯ ВЕРСИЯ

const MAIN_VERSION = "v0.9.99";
window.MAIN_VERSION = MAIN_VERSION;

let currentEvent = 0;
const events = [];

// === ПЕРЕКЛЮЧЕНИЕ СОБЫТИЯ ===
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  // Сохраняем текущее
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  // Восстанавливаем
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId;

  // Подсвечиваем вкладку
  document.querySelectorAll('.event-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  updateAll();
}

// === УДАЛЕНИЕ СОБЫТИЯ ===
function deleteEvent(index, e) {
  e.stopPropagation();

  if (events.length <= 1) {
    alert('Нельзя удалить последнее событие!');
    return;
  }

  if (confirm('Удалить событие?')) {
    events.splice(index, 1);
    document.querySelectorAll('.event-tab')[index].remove();

    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

// === ДОБАВЛЕНИЕ СОБЫТИЯ ===
function addEvent() {
  const index = events.length;
  const newId = `event_${index + 1}`;
  events.push({ html: '', eventId: newId });

  const tab = document.createElement('div');
  tab.className = 'event-tab';
  tab.innerHTML = `
    <span class="tab-name">${newId}</span>
    <span class="delete-tab">×</span>
  `;

  tab.onclick = () => switchEvent(index);
  tab.querySelector('.delete-tab').onclick = (e) => deleteEvent(index, e);

  document.getElementById('events-list').appendChild(tab);
  switchEvent(index);
}

// === ОБНОВЛЕНИЕ ИМЕНИ ВКЛАДКИ ===
function updateActiveTabName() {
  const value = document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;

  const activeTab = document.querySelector('.event-tab.active .tab-name');
  if (activeTab) activeTab.textContent = value;
}

// === ПЕРЕКЛЮЧЕНИЕ TREE / CLASSIC ===
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  tree.classList.toggle('hidden');
  classic.classList.toggle('hidden');
  document.getElementById('view-btn').textContent = tree.classList.contains('hidden') ? 'Tree View' : 'Classic View';
  if (!tree.classList.contains('hidden')) renderTree();
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');

  // Старт с одного события
  addEvent();
  switchEvent(0);

  showScriptVersions();
});

window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
window.updateActiveTabName = updateActiveTabName;
