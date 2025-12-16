// js/db.js — v0.9.419 — ИСПРАВЛЕНЫ ИКОНКИ, ЛОКАЛИЗАЦИЯ, АСИНХРОННОСТЬ

const DB_VERSION = "v0.9.419";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];
    this.iconCache = new Map(); // Ключ: `${texture}|${sourcerect}|${colorKey}`
    this.atlasCache = new Map(); // Ключ: путь к атласу
    this.pendingAtlases = new Map(); // Ключ: путь к атласу, Значение: Promise
    this.missingIconCanvas = null; // Кэшированный fallback canvas
    this.currentTab = 'afflictions';
    this.isModalOpen = false;
    this.loadData();
  }

  async loadData() {
    try {
      const [affResp, itemResp, creatureResp] = await Promise.all([
        fetch('data/afflictions.json'),
        fetch('data/items.json'),
        fetch('data/creatures.json')
      ]);

      if (affResp.ok) this.afflictions = await affResp.json();
      if (itemResp.ok) this.items = await itemResp.json();
      if (creatureResp.ok) this.creatures = await creatureResp.json();
    } catch (err) {
      console.error('Failed to load database', err);
      alert(loc('dbError'));
    }
  }

  openDB() {
    if (this.isModalOpen) return;
    this.isModalOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'db-modal-overlay';

    const content = document.createElement('div');
    content.className = 'db-modal-content';

    const header = document.createElement('div');
    header.className = 'db-modal-header';
    header.innerHTML = `<h2>${loc('dataBase')}</h2>`;

    const tabs = this.createTabs();
    const search = this.createSearchInput();
    header.appendChild(tabs);
    header.appendChild(search);

    const grid = document.createElement('div');
    grid.className = 'db-grid';
    grid.id = 'db-grid';

    // === ИСПРАВЛЕНО: Твёрдая строка вместо локализации ===
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'db-loading-indicator';
    loadingIndicator.textContent = 'Loading database...'; // <-- Твёрдая строка
    loadingIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      color: #aaa;
      text-align: center;
      z-index: 1001;
    `;
    content.appendChild(loadingIndicator);
    // ===============================================

    content.appendChild(header);
    content.appendChild(grid);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        overlay.remove();
        this.isModalOpen = false;
      }
    });

    // === ИСПРАВЛЕНО: ОТЛОЖЕННАЯ ОТРИСОВКА С ПОКАЗОМ ИНДИКАТОРА ===
    setTimeout(async () => {
      try {
        await this.renderGrid(this.currentTab);
      } catch (e) {
        console.error("Error rendering DB grid:", e);
        // Можно показать сообщение об ошибке в grid
        const errorDiv = document.createElement('div');
        errorDiv.textContent = loc('dbRenderError', 'Error loading database entries.');
        grid.appendChild(errorDiv);
      } finally {
        // Убираем индикатор после отрисовки или ошибки
        const indicator = document.getElementById('db-loading-indicator');
        if (indicator) indicator.remove();
      }
    }, 10);
    // ========================================================
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'db-tabs';

    const tabNames = {
      afflictions: 'tabAfflictions',
      items: 'tabItems',
      creatures: 'tabCreatures'
    };

    ['afflictions', 'items', 'creatures'].forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'db-tab-btn' + (tab === 'afflictions' ? ' active' : '');
      btn.textContent = loc(tabNames[tab]);
      btn.dataset.tab = tab;
      btn.onclick = () => {
        tabs.querySelectorAll('.db-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = tab;
        // === ИСПРАВЛЕНО: Очистка и показ индикатора перед рендером вкладки ===
        const grid = document.getElementById('db-grid');
        if (grid) {
          grid.innerHTML = '';
          const loadingIndicator = document.createElement('div');
          loadingIndicator.textContent = 'Loading...'; // Твёрдая строка
          loadingIndicator.style.cssText = `text-align: center; padding: 20px; color: #aaa;`;
          grid.appendChild(loadingIndicator);

          setTimeout(async () => {
            try {
              await this.renderGrid(tab);
            } catch (e) {
              console.error(`Error rendering ${tab} grid:`, e);
              grid.innerHTML = `<div>Error loading ${tab}.</div>`;
            }
          }, 0);
        }
        // ========================================================
      };
      if (tab === 'afflictions') btn.classList.add('active');
      tabs.appendChild(btn);
    });

    return tabs;
  }

  createSearchInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'db-search-input';
    input.placeholder = loc('searchPlaceholder');
    input.oninput = (e) => this.filterGrid(e.target.value);
    return input;
  }

  async renderGrid(type) {
    const grid = document.getElementById('db-grid');
    if (!grid) return;

    // Очистить индикатор загрузки, если он остался
    grid.innerHTML = '';

    const data = this[type] || [];

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'db-empty';
      empty.textContent = loc('nothingFound');
      grid.appendChild(empty);
      return;
    }

    const cardPromises = data.map(entry => this.createCard(entry, type));
    const cards = await Promise.allSettled(cardPromises); // Используем Promise.allSettled, чтобы не прерывать всё при ошибке одной карточки

    cards.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        grid.appendChild(result.value);
      } else {
        console.error(`Failed to create card for entry at index ${index}:`, result.reason);
        // Можно добавить "заглушку" для неудачной карточки
        const errorCard = document.createElement('div');
        errorCard.className = 'db-entry-btn';
        errorCard.style.padding = '12px';
        errorCard.style.color = 'red';
        errorCard.textContent = `Error loading entry: ${data[index].identifier || data[index].id || 'Unknown'}`;
        grid.appendChild(errorCard);
      }
    });
  }

  async createCard(entry, type) {
    const card = document.createElement('div');
    card.className = 'db-entry-btn';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';
    card.style.fontSize = '14px';

    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.alignItems = 'center';
    top.style.gap = '12px';
    top.style.marginBottom = '8px';

    // --- ИСПРАВЛЕНО ---
    let iconElement;
    try {
      // Ждём, пока иконка будет готова
      iconElement = await this.createRealIcon(entry.icon || {}); // await
    } catch (e) {
      console.error(`Failed to create icon for entry ${entry.identifier || entry.id}`, e);
      // Используем fallback иконку
      iconElement = this.createMissingIconCanvas();
    }
    top.appendChild(iconElement);
    // -----------------

    const displayName = entry.name || entry.identifier || 'Unknown';
    const nameDiv = document.createElement('div');
    nameDiv.textContent = displayName;
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.color = '#61afef';
    nameDiv.style.fontSize = '16px';
    top.appendChild(nameDiv);

    card.appendChild(top);

    const idLine = document.createElement('div');
    idLine.textContent = loc('dbDetailID') + ': ' + (entry.identifier || 'unknown');
    idLine.style.color = '#aaa';
    idLine.style.fontSize = '13px';
    idLine.style.wordBreak = 'break-all';
    card.appendChild(idLine);

    if (type === 'afflictions') {
      this.appendAfflictionDetails(card, entry);
    } else if (type === 'items') {
      this.appendItemDetails(card, entry);
    } else if (type === 'creatures') {
      this.appendCreatureDetails(card, entry);
    }

    return card;
  }

  // === ИСПРАВЛЕННЫЙ createRealIcon (асинхронный) ===
  async createRealIcon(iconInfo) {
    if (!iconInfo || !iconInfo.texture || !iconInfo.sourcerect) {
      return this.createMissingIconCanvas(); // Используем fallback
    }

    const texture = iconInfo.texture;
    const sourcerect = iconInfo.sourcerect;
    // Преобразуем color_theme_key из snake_case в kebab-case
    const colorKeySnake = iconInfo.color_theme_key || 'icon-status-gray';
    const colorKeyKebab = this.toKebabCase(colorKeySnake);

    const cacheKey = `${texture}|${sourcerect}|${colorKeyKebab}`;

    // Проверяем кэш готовых canvas
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey).cloneNode(true);
    }

    // Создаём canvas
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2d context');
      return canvas; // Возврат пустого canvas как fallback
    }

    // Рисуем fallback (плейсхолдер) сразу
    this.drawMissingIcon(ctx);

    // Пытаемся получить атлас
    let atlasImage = null;
    try {
      atlasImage = await this.loadAtlasAsync(texture); // await
    } catch (e) {
      console.warn(`Failed to load atlas for icon: ${texture}`, e);
      // Оставляем fallback и возвращаем его копию
      this.iconCache.set(cacheKey, canvas); // Кэшируем fallback canvas
      return canvas.cloneNode(true);
    }

    if (atlasImage) {
      // Если атлас успешно получен, рисуем на canvas
      this.drawIconFromAtlas(ctx, atlasImage, sourcerect, colorKeyKebab);
    } else {
      // Если loadAtlasAsync вернул null (например, после ошибки)
      console.warn(`Atlas was null for icon: ${texture}`);
      // Оставляем fallback
    }

    // Кэшируем готовый canvas (клон для возврата, оригинальный для кэша)
    this.iconCache.set(cacheKey, canvas);
    return canvas.cloneNode(true);
  }
  // ===============================================

  // === ИСПРАВЛЕННЫЙ drawIconFromAtlas ===
  drawIconFromAtlas(ctx, img, sourcerectStr, colorKeyKebab) {
    // --- НОВАЯ ПРОВЕРКА ---
    if (!img || !(img instanceof HTMLImageElement)) {
      console.warn("drawIconFromAtlas received invalid image:", img);
      // Можно нарисовать "missing texture" снова или оставить как есть
      return;
    }
    // --------------------

    const rect = sourcerectStr.split(',').map(v => parseInt(v.trim()));
    if (rect.length !== 4) {
      console.warn(`Invalid sourcerect format: ${sourcerectStr}`);
      return;
    }
    const [sx, sy, sw, sh] = rect;

    // Проверяем, не выходит ли sourcerect за границы атласа
    if (sx < 0 || sy < 0 || sx + sw > img.width || sy + sh > img.height) {
      console.warn(`Sourcerect out of bounds for ${texturePath}: ${sourcerectStr}`);
      return;
    }

    // Очищаем и рисуем часть атласа на canvas 48x48
    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    // Накладываем цвет
    const rgbStr = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorKeyKebab}-rgb`).trim();

    if (rgbStr) {
      const [r, g, b] = rgbStr.split(',').map(v => parseInt(v.trim(), 10));
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        // Используем source-atop для наложения цвета
        ctx.globalCompositeOperation = 'source-in'; // Оставляем только непрозрачные пиксели
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, 48, 48);

        ctx.globalCompositeOperation = 'destination-over'; // Переключаемся, чтобы нарисовать белый фон
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 48, 48);

        ctx.globalCompositeOperation = 'source-over'; // Возвращаемся к нормальному режиму
      } else {
        console.warn(`Invalid RGB values from CSS variable --${colorKeyKebab}-rgb: ${rgbStr}`);
      }
    } else {
      // console.warn(`CSS variable --${colorKeyKebab}-rgb not found`); // Может быть много в консоли
    }
  }
  // ===============================================

  // === ИСПРАВЛЕННЫЙ loadAtlasAsync ===
  async loadAtlasAsync(path) {
    // Проверяем кэш атласов (ожидаем Promise(Image))
    if (this.atlasCache.has(path)) {
      // Если в кэше, возвращаем изображение напрямую (оно уже загружено)
      return this.atlasCache.get(path);
    }

    // Проверяем, не загружается ли уже
    if (this.pendingAtlases.has(path)) {
      // Ждём завершения *уже запущенной* загрузки
      return this.pendingAtlases.get(path); // Это Promise
    }

    // Создаём промис загрузки и кладём его в pending
    const imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Для CORS, если нужно
      img.onload = () => {
        this.atlasCache.set(path, img); // Кэшируем *изображение*
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load atlas: ${path}`);
        // Не кэшируем 'null' в pendingAtlases, чтобы не "заражать" последующие попытки
        // Удаляем из pending, если был
        this.pendingAtlases.delete(path);
        // Разрешаем Promise с null
        resolve(null);
      };
      img.src = path; // Используем путь из JSON
    });

    // Кэшируем *Promise*, чтобы другие вызовы ждали одну и ту же загрузку
    this.pendingAtlases.set(path, imagePromise);

    // Ждём и вернём результат
    try {
      const loadedImage = await imagePromise;
      // Удаляем из pending после разрешения (успех или ошибка)
      this.pendingAtlases.delete(path);
      return loadedImage;
    } catch (e) {
      // Это не должно сработать, так как img.onerror разрешает Promise с null
      // Но на всякий случай
      this.pendingAtlases.delete(path);
      console.error("Unexpected error in loadAtlasAsync:", e);
      return null;
    }
  }
  // ====================================

  // === НОВЫЙ МЕТОД: Создание fallback иконки ===
  createMissingIconCanvas() {
    if (this.missingIconCanvas) {
      return this.missingIconCanvas.cloneNode(true); // Возвращаем клон кэшированного
    }

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Рисуем простую заглушку
      ctx.fillStyle = '#f00'; // Красный фон
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#fff'; // Белый текст
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 24, 24);
    }
    this.missingIconCanvas = canvas; // Кэшируем
    return canvas.cloneNode(true); // Возвращаем клон
  }
  // =============================================

  drawMissingIcon(ctx) {
    // Рисует простую сетку или цвет как плейсхолдер
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 48, 48);
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 44, 44);
    ctx.fillStyle = '#f00';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 24, 24);
  }

  // snake_case -> kebab-case
  toKebabCase(str) {
    return str.replace(/_/g, '-');
  }

  // === ИСПРАВЛЕНО appendAfflictionDetails ===
  appendAfflictionDetails(card, entry) {
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '8px';
    badges.style.flexWrap = 'wrap';
    badges.style.marginBottom = '8px';

    const typeBadge = document.createElement('span');
    // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
    const typeText = entry.type || 'unknown';
    typeBadge.textContent = `[${typeText}]`;
    // ---
    typeBadge.style.padding = '2px 8px';
    typeBadge.style.background = '#444';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.fontSize = '12px';
    badges.appendChild(typeBadge);

    const maxBadge = document.createElement('span');
    // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
    const maxStrText = loc('dbDetailMaxStrength'); // Получаем локализованную строку "Max Strength"
    const maxVal = entry.maxstrength || '—';
    maxBadge.textContent = `[${maxStrText}: ${maxVal}]`; // Комбинируем
    // ---
    maxBadge.style.padding = '2px 8px';
    maxBadge.style.background = '#555';
    maxBadge.style.borderRadius = '4px';
    maxBadge.style.fontSize = '12px';
    badges.appendChild(maxBadge);

    if (entry.limbspecific) {
      const limbBadge = document.createElement('span');
      // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
      limbBadge.textContent = `[${loc('dbDetailLimbSpecificShort', 'limb')}]`; // Используем короткий ключ или 'limb'
      // ---
      limbBadge.style.padding = '2px 8px';
      limbBadge.style.background = '#007acc';
      limbBadge.style.color = 'white';
      limbBadge.style.borderRadius = '4px';
      limbBadge.style.fontSize = '12px';
      badges.appendChild(limbBadge);
    }

    if (entry.isbuff) {
      const buffBadge = document.createElement('span');
      // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
      buffBadge.textContent = `[${loc('dbDetailIsBuffShort', 'buff')}]`; // Используем короткий ключ или 'buff'
      // ---
      buffBadge.style.padding = '2px 8px';
      buffBadge.style.background = '#218c21';
      buffBadge.style.color = 'white';
      buffBadge.style.borderRadius = '4px';
      buffBadge.style.fontSize = '12px';
      badges.appendChild(buffBadge);
    }

    card.appendChild(badges);

    const descText = entry.description || '';
    const shortDesc = document.createElement('div');
    shortDesc.textContent = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;
    shortDesc.style.color = '#aaa';
    shortDesc.style.fontSize = '13px';
    shortDesc.style.marginBottom = '8px';
    card.appendChild(shortDesc);

    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = '#444';
    separator.style.margin = '8px 0';
    card.appendChild(separator);

    const fullDesc = document.createElement('div');
    // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
    fullDesc.textContent = descText || loc('noDescription', 'No description'); // Используем локализацию для "No description"
    // ---
    fullDesc.style.marginBottom = '8px';
    card.appendChild(fullDesc);

    const details = [
      { key: 'dbDetailType', value: entry.type || '—' },
      { key: 'dbDetailMaxStrength', value: entry.maxstrength || '—' },
      // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
      { key: 'dbDetailLimbSpecific', value: entry.limbspecific ? loc('yes', 'Yes') : loc('no', 'No') },
      { key: 'dbDetailIsBuff', value: entry.isbuff ? loc('yes', 'Yes') : loc('no', 'No') }
      // ---
    ];

    details.forEach(d => {
      const line = document.createElement('div');
      // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc ---
      const label = document.createElement('strong');
      const localizedLabel = loc(d.key, d.key); // Используем ключ как fallback
      if (localizedLabel && localizedLabel.trim() !== "") { // Проверяем, что локализация не пустая
          label.textContent = localizedLabel + ': ';
      } else {
          label.textContent = d.key + ': '; // Используем ключ, если локализация пустая
      }
      // ---
      line.appendChild(label);
      // --- ИСПРАВЛЕНО: Проверка на пустую строку перед loc (для d.value) ---
      // d.value уже может быть "Yes"/"No" из предыдущего шага, или любым другим значением
      // loc() здесь НЕ вызывается для d.value. d.value используется как есть.
      line.appendChild(document.createTextNode(d.value));
      // ---
      line.style.fontSize = '13px';
      card.appendChild(line);
    });
  }
  // ===============================================

  appendItemDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = entry.name || entry.identifier || 'unknown';
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
  }

  appendCreatureDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = entry.name || entry.identifier || 'unknown';
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
  }

  filterGrid(query) {
    const grid = document.getElementById('db-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.db-entry-btn');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  }
}

// Глобальный экземпляр
const dbManager = new DatabaseManager();
window.dbManager = dbManager;
