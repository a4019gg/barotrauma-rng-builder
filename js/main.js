// main.js — инициализация и управление событиями

let currentEvent = 0;
const events = [{ html: '', eventId: 'lucky_box_event' }];

function switchEvent(index) {
  // Сохраняем текущий
  events[currentEvent] = {
    html: document.getElementById('root-children').innerHTML,
    eventId: document.getElementById('event-id').value
  };
  currentEvent = index;

  // Восстанавливаем
  document.getElementById('root-children').innerHTML = events[index].html || '';
  document.getElementById('event-id').value = events[index].eventId || `event_${index + 1}`;

  // Активная вкладка
  document.querySelectorAll('#events-tabs .tab').forEach((t, i) => {
    t.classList.toggle('active', i === index);
  });

  updateAll();
}

function addEvent() {
  const index = events.length;
  events.push({ html: '', eventId: `event_${index + 1}` });

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.textContent = `Event ${index + 1}`;
  tab.dataset.index = index;
  tab.onclick = () => switchEvent(index);

  const addBtn = document.querySelector('#events-tabs .tab.add');
  addBtn.before(tab);

  switchEvent(index);
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const isFullscreen = classic.classList.toggle('fullscreen');
  document.getElementById('tree-container').classList.toggle('hidden', isFullscreen);
  document.getElementById('view-btn').textContent = isFullscreen ? 'Tree View' : 'Classic View';
  if (!isFullscreen) renderTree();
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
  // Загрузка базы предметов
  populateDatalist();

  // Восстановление настроек
  const theme = localStorage.getItem('theme') || 'dark';
  setTheme(theme);
  const lang = localStorage.getItem('lang') || 'en';
  setLang(lang);

  // Пример при старте
  loadExample();

  // Подсказки для вероятностей
  document.addEventListener('mouseover', e => {
    if (e.target.classList.contains('prob') && e.target.dataset.tip) {
      const tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.textContent = e.target.dataset.tip;
      tip.style.left = (e.pageX + 10) + 'px';
      tip.style.top = (e.pageY + 10) + 'px';
      document.body.appendChild(tip);
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.classList.contains('prob')) {
      const tip = document.querySelector('.tooltip');
      if (tip) tip.remove();
    }
  });
});

// Экспорт глобальных функций
window.switchEvent = switchEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
