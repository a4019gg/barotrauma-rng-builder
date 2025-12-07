// js/main.js — ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ v0.9.0

let currentEvent = 0;
const events = [{ html: '', eventId: 'lucky_box_event' }];

// Переключение между событиями
function switchEvent(index) {
  // Сохраняем текущее
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value
  };

  currentEvent = index;

  // Восстанавливаем выбранное
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;

  // Подсвечиваем активную вкладку
  document.querySelectorAll('#events-tabs .tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  updateAll();
}

// Удаление события по индексу (кнопка × на вкладке)
function deleteEvent(index, e) {
  if (e) e.stopPropagation(); // Чтобы не сработал клик по вкладке

  if (events.length <= 1) {
    alert(L.lastEventWarning);
    return;
  }

  if (confirm(L.deleteEventConfirm)) {
    events.splice(index, 1);
    document.querySelectorAll('#events-tabs .tab')[index].remove();

    if (currentEvent >= events.length) currentEvent = events.length - 1;
    switchEvent(currentEvent);
  }
}

// Добавление нового события
function addEvent() {
  const index = events.length;
  events.push({ html: '', eventId: `event_${index + 1}` });

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.dataset.index = index;
  tab.innerHTML = `Event ${index + 1} <span class="delete-tab">×</span>`;

  // Клик по вкладке — переключаем
  tab.onclick = (e) => {
    if (!e.target.classList.contains('delete-tab')) {
      switchEvent(index);
    }
  };

  // Клик по × — удаляем
  tab.querySelector('.delete-tab').onclick = (e) => deleteEvent(index, e);

  document.querySelector('#events-tabs .add').before(tab);
  switchEvent(index);
}

// Переключение Tree / Classic
function toggleView() {
  const tree = document.getElementById('tree-container');
  const classic = document.getElementById('classic-view');
  tree.classList.toggle('hidden');
  classic.classList.toggle('hidden');
  document.getElementById('view-btn').textContent = tree.classList.contains('hidden') ? 'Tree View' : 'Classic View';
  if (!tree.classList.contains('hidden')) renderTree();
}

// Экспорт всех событий
function exportJSON() {
  const data = {
    version: "0.9.0",
    events: events.map(e => ({ eventId: e.eventId, html: e.html }))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rng-events.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Импорт (добавляет события, не заменяет)
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
          events.push({ html: ev.html || '', eventId: ev.eventId || 'imported' });
          addEvent();
        });
        switchEvent(events.length - 1);
        alert('Импорт завершён!');
      } else {
        alert('Неверный формат файла');
      }
    } catch (err) {
      alert('Ошибка импорта: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// Очистка текущего события
function clearAll() {
  if (confirm(L.clearAllConfirm || 'Clear all?')) {
    document.getElementById('root-children').innerHTML = '';
    updateAll();
  }
}

// Пример при запуске
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
  loadExample();

  // Подсказки для процентов
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

  console.log('%cBarotrauma RNG Builder v0.9.0 запущен!', 'color:#61afef;font-size:16px');
});

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
window.exportJSON = exportJSON;
window.importFile = importFile;
window.clearAll = clearAll;
window.loadExample = loadExample;
