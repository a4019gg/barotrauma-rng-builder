// js/main.js — ПОЛНЫЙ, 100% РАБОЧИЙ

let currentEvent = 0;
const events = [{ html: '', eventId: 'lucky_box_event' }];

function switchEvent(index) {
  // Сохраняем текущее событие
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

function addEvent() {
  const index = events.length;
  events.push({ html: '', eventId: `event_${index + 1}` });

  const tab = document.createElement('button');
  tab.className = 'tab';
  tab.textContent = `Event ${index + 1}`;
  tab.dataset.index = index;

  tab.onclick = () => switchEvent(index);
  tab.ondblclick = (e) => {
    e.stopPropagation();
    if (events.length <= 1) return alert('Нельзя удалить последнее событие!');
    if (confirm('Удалить событие?')) {
      events.splice(index, 1);
      tab.remove();
      if (currentEvent >= events.length) currentEvent = events.length - 1;
      switchEvent(currentEvent);
    }
  };

  document.querySelector('#events-tabs .tab:last-child').before(tab);
  switchEvent(index);
}

function toggleView() {
  const classic = document.getElementById('classic-view');
  const isFullscreen = classic.classList.toggle('fullscreen');
  document.getElementById('tree-container').classList.toggle('hidden', isFullscreen);
  document.getElementById('view-btn').textContent = isFullscreen ? 'Tree View' : 'Classic View';
  if (!isFullscreen) renderTree();
}

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем базу
  populateDatalist();

  // Восстанавливаем настройки
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

  console.log('%cBarotrauma RNG Builder v0.5.6 запущен!', 'color:#61afef;font-size:16px');
});

// === Экспорт функций для других модулей ===
window.switchEvent = switchEvent;
window.addEvent = addEvent;
window.toggleView = toggleView;
