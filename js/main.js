// js/main.js — ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ v0.9.2

let currentEvent = 0;
const events = [];

// Переключение события
function switchEvent(index) {
  if (index < 0 || index >= events.length) return;

  // Сохраняем текущее
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`
  };

  currentEvent = index;

  // Восстанавливаем выбранное
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId;

  // Обновляем вкладки
  document.querySelectorAll('#events-tabs .tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // Обновляем имя на вкладке
  const activeTab = document.querySelector('#events-tabs .tab.active');
  if (activeTab) {
    const nameSpan = activeTab.querySelector('.tab-name') || activeTab;
    nameSpan.textContent = events[index].eventId;
  }

  updateAll();
}

// Удаление события
function deleteEvent(index) {
  if (events.length <= 1) {
    alert('Нельзя удалить последнее событие!');
    return;
  }
  if (confirm('Удалить событие?')) {
    events.splice(index, 1);
    document.querySelectorAll('#events-tabs .tab')[index].remove();
    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

// Добавление события
function addEvent() {
  const index = events.length;
  const newId = `event_${index + 1}`;
  events.push({ html: '', eventId: newId });

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.innerHTML = `
    <span class="tab-name">${newId}</span>
    <span class="delete-tab">×</span>
  `;
  tab.onclick = (e) => {
    if (!e.target.classList.contains('delete-tab')) {
      switchEvent(index);
    }
  };
  tab.querySelector('.delete-tab').onclick = (e) => {
    e.stopPropagation();
    deleteEvent(index);
  };

  document.querySelector('#events-tabs .add').before(tab);
  switchEvent(index);
}

// Обновление имени вкладки при изменении Event ID
function updateActiveTabName() {
  const value = document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;

  const activeTab = document.querySelector('#events-tabs .tab.active .tab-name');
  if (activeTab) activeTab.textContent = value;
}

// Tree View
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  tree.classList.toggle('hidden');
  classic.classList.toggle('hidden');
  document.getElementById('view-btn').textContent = tree.classList.contains('hidden') ? 'Tree View' : 'Classic View';
  if (!tree.classList.contains('hidden')) renderTree();
}

// Инициализация при старте — 0 событий
function initEmpty() {
  document.getElementById('root-children').innerHTML = '';
  document.getElementById('event-id').value = 'new_event';
  updateAll();
}

// === DOM LOADED ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');
  initEmpty(); // ← старт с нуля событий

  // Подсказки
  document.addEventListener('mouseover', e => {
    if (e.target.classList.contains('prob') && e.target.dataset.tip) {
      let tooltip = document.getElementById('prob-tooltip');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'prob-tooltip';
        tooltip.style.cssText = 'position:absolute;background:#333;color:#fff;padding:4px 8px;border-radius:4px;font-size:11px;z-index:1000;pointer-events:none;';
        document.body.appendChild(tooltip);
      }
      tooltip.textContent = e.target.dataset.tip;
      tooltip.style.left = (e.pageX + 10) + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.classList.contains('prob')) {
      const tooltip = document.getElementById('prob-tooltip');
      if (tooltip) tooltip.remove();
    }
  });
});

// Глобальные функции
window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
window.updateActiveTabName = updateActiveTabName;
