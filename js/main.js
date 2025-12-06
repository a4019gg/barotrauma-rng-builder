// js/main.js — ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ v0.7.1

let currentEvent = 0;
const events = [{ html: '', eventId: 'lucky_box_event' }];

function switchEvent(index) {
  // Сохраняем текущее событие
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value
  };

  currentEvent = index;

  // Восстанавливаем выбранное событие
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;

  // Подсвечиваем активную вкладку
  document.querySelectorAll('#events-tabs .tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });

  updateAll();
}

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

function addEvent() {
  const index = events.length;
  events.push({ html: '', eventId: `event_${index + 1}` });

  const tab = document.createElement('div');
  tab.className = 'tab';
  tab.innerHTML = `
    Event ${index + 1}
    <button class="delete-tab" onclick="deleteEvent(${index})">×</button>
  `;
  tab.onclick = (e) => {
    if (!e.target.classList.contains('delete-tab')) {
      switchEvent(index);
    }
  };

  document.querySelector('#events-tabs .add').before(tab);
  switchEvent(index);
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const isFullscreen = classic.classList.toggle('fullscreen');
  document.getElementById('tree-container').classList.toggle('hidden', isFullscreen);
  document.getElementById('view-btn').textContent = isFullscreen ? 'Tree View' : 'Classic View';
  if (!isFullscreen) renderTree();
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
        alert('События успешно импортированы!');
      } else {
        alert('Неверный формат файла');
      }
    } catch (err) {
      alert('Ошибка чтения файла: ' + err.message);
    }
  };
  reader.readAsText(file);
});

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  // Загрузка базы предметов
  populateDatalist();

  // Восстановление настроек
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  const savedLang = localStorage.getItem('lang') || 'en';
  setLang(savedLang);

  // Пример при старте
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

  console.log('%cBarotrauma RNG Builder v0.7.1 запущен!', 'color:#61afef;font-size:16px');
});

// === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
window.switchEvent = switchEvent;
window.deleteEvent = deleteEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
window.importFile = importFile;
