// js/main.js — ФИНАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ v0.9.9

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
  document.querySelectorAll('#events-tabs .tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  // Синхронизация имени вкладки
  const activeTab = document.querySelector('#events-tabs .tab.active .tab-name');
  if (activeTab) activeTab.textContent = events[index].eventId;

  updateAll();
}

// === УДАЛЕНИЕ СОБЫТИЯ ===
function deleteEvent(index, e) {
  e.stopPropagation();

  if (events.length <= 1) {
    alert(L.lastEventWarning || 'Нельзя удалить последнее событие!');
    return;
  }

  if (confirm(L.deleteEventConfirm || 'Удалить событие?')) {
    events.splice(index, 1);
    document.querySelectorAll('#events-tabs .tab')[index].remove();

    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

// === ДОБАВЛЕНИЕ СОБЫТИЯ ===
function addEvent() {
  const index = events.length;
  const newId = `event_${index + 1}`;
  events.push({ html: '', eventId: newId });

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.dataset.index = index;
  tab.innerHTML = `
    <span class="tab-name">${newId}</span>
    <span class="delete-tab">×</span>
  `;

  tab.onclick = (e) => {
    if (!e.target.classList.contains('delete-tab')) {
      switchEvent(index);
    }
  };
  tab.querySelector('.delete-tab').onclick = (e) => deleteEvent(index, e);

  document.querySelector('#events-tabs .add').before(tab);
  switchEvent(index);
}

// === ОБНОВЛЕНИЕ ИМЕНИ ВКЛАДКИ ===
function updateActiveTabName() {
  const value = document.getElementById('event-id').value.trim() || `event_${currentEvent + 1}`;
  events[currentEvent].eventId = value;

  const activeTab = document.querySelector('#events-tabs .tab.active .tab-name');
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

// === ИМПОРТ ===
function importFile() {
  document.getElementById('file-input').click();
}

document.getElementById('file-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach(ev => {
          events.push({
            html: ev.html || '',
            eventId: ev.eventId || 'imported_event'
          });
          addEvent();
        });
        switchEvent(events.length - 1);
        alert(L.importSuccess || 'Импорт завершён!');
      } else {
        alert(L.importError || 'Неверный формат файла');
      }
    } catch (err) {
      alert(L.importError + ': ' + err.message);
    }
  };
  reader.readAsText(file);
});

// === ОЧИСТКА ===
function clearAll() {
  if (confirm(L.clearAllConfirm || 'Очистить всё?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

// === ПРИМЕР ===
function loadExample() {
  clearAll();
  addRNG('');
  setTimeout(() => {
    const first = document.querySelector('#root-children > .node.rng');
    if (first) {
      first.querySelector('.chance').value = 0.6;
      addRNG(first.dataset.id + '-s');
      addSpawn(first.dataset.id + '-s.0-s');
      updateAll();
    }
  }, 100);
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  populateDatalist();
  setTheme(localStorage.getItem('theme') || 'dark');
  setLang(localStorage.getItem('lang') || 'en');

  // Старт с одного события
  addEvent();
  switchEvent(0);

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

  console.log('%cBarotrauma RNG Builder v0.9.9 запущен!', 'color:#61afef;font-size:16px');
});

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
window.updateActiveTabName = updateActiveTabName;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;
