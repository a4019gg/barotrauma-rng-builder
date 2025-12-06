// main.js — запуск приложения

// Ждём загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем базу предметов
  populateDatalist();

  // Восстанавливаем тему и язык
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);
  const savedLang = localStorage.getItem('lang') || 'en';
  setLang(savedLang);

  // Загружаем пример при старте
  loadExample();

  // Добавляем подсказки к шансам
  document.addEventListener('mouseover', e => {
    if (e.target.classList.contains('prob') && e.target.dataset.tip) {
      const tooltip = document.createElement('div');
      tooltip.textContent = e.target.dataset.tip;
      tooltip.style.cssText = `
        position: absolute; background: #333; color: #fff; padding: 4px 8px;
        border-radius: 4px; font-size: 11px; z-index: 1000; pointer-events: none;
        left: ${e.pageX + 10}px; top: ${e.pageY + 10}px;
      `;
      tooltip.id = 'prob-tooltip';
      document.body.appendChild(tooltip);
    }
  });

  document.addEventListener('mouseout', e => {
    if (e.target.classList.contains('prob')) {
      const tooltip = document.getElementById('prob-tooltip');
      if (tooltip) tooltip.remove();
    }
  });

  console.log('%cBarotrauma RNG Builder v5.3 готов!', 'color: #61afef; font-size: 16px;');
});
