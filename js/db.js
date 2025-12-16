// js/db.js — v0.9.419 — БАЗА ДАННЫХ С ИНДИКАТОРОМ ЗАГРУЗКИ И ИСПРАВЛЕННЫМИ ИКОНКАМИ

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

  async openDB() {
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

    // === ДОБАВЛЕН ИНДИКАТОР ЗАГРУЗКИ ===
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'db-loading-indicator';
    loadingIndicator.textContent = loc('loadingDatabase', 'Загрузка базы данных...');
    loadingIndicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 18px;
      color: #aaa;
      text-align: center;
      z-index: 1001; /* Выше, чем карточки, но ниже оверлея */
    `;
    content.appendChild(loadingIndicator);
    // ================================

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

    // === ОТЛОЖЕННАЯ ОТРИСОВКА С ПОКАЗОМ ИНДИКАТОРА ===
    // Позволяем DOM обновиться и показать индикатор
    setTimeout(async () => {
      await this.renderGrid(this.currentTab); // Ждём завершения отрисовки
      loadingIndicator.remove(); // Убираем индикатор после отрисовки
    }, 10); // Небольшая задержка, чтобы индикатор успел отобразиться
    // =============================================
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
        // === ОБНОВЛЁННЫЙ ВЫЗОВ renderGrid ===
        this.renderGrid(tab).catch(console.error); // Обработка ошибок отрисовки
        // ===================================
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

  // === ОБНОВЛЁННЫЙ renderGrid (асинхронный) ===
  async renderGrid(type) {
    const grid = document.getElementById('db-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = this[type] || [];

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'db-empty';
      empty.textContent = loc('nothingFound');
      grid.appendChild(empty);
      return;
    }

    // Используем Promise.all для параллельной отрисовки всех карточек
    const cardPromises = data.map(entry => this.createCard(entry, type));
    const cards = await Promise.all(cardPromises);

    cards.forEach(card => {
      if (card) { // Проверяем, что карточка успешно создана
        grid.appendChild(card);
      }
    });
  }
  // =========================================

  // === ОБНОВЛЁННЫЙ createCard (асинхронный) ===
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
    // Ждём, пока иконка будет готова
    try {
      const icon = await this.createRealIcon(entry.icon || {}); // await
      top.appendChild(icon);
    } catch (e) {
      console.error(`Failed to create icon for entry ${entry.identifier || entry.id}`, e);
      // Используем fallback иконку
      const fallbackIcon = this.createMissingIconCanvas(); // <-- Новый метод для fallback
      top.appendChild(fallbackIcon);
    }
    // -----------------

    const displayName = entry.name || loc(entry.name_key || '') || entry.identifier || 'Unknown';
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
  // ==========================================

  appendAfflictionDetails(card, entry) {
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '8px';
    badges.style.flexWrap = 'wrap';
    badges.style.marginBottom = '8px';

    const typeBadge = document.createElement('span');
    typeBadge.textContent = `[${entry.type || 'unknown'}]`;
    typeBadge.style.padding = '2px 8px';
    typeBadge.style.background = '#444';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.fontSize = '12px';
    badges.appendChild(typeBadge);

    const maxBadge = document.createElement('span');
    maxBadge.textContent = `[${loc('dbDetailMaxStrength')}: ${entry.maxstrength || '—'}]`;
    maxBadge.style.padding = '2px 8px';
    maxBadge.style.background = '#555';
    maxBadge.style.borderRadius = '4px';
    maxBadge.style.fontSize = '12px';
    badges.appendChild(maxBadge);

    if (entry.limbspecific) {
      const limbBadge = document.createElement('span');
      limbBadge.textContent = '[limb]';
      limbBadge.style.padding = '2px 8px';
      limbBadge.style.background = '#007acc';
      limbBadge.style.color = 'white';
      limbBadge.style.borderRadius = '4px';
      limbBadge.style.fontSize = '12px';
      badges.appendChild(limbBadge);
    }

    if (entry.isbuff) {
      const buffBadge = document.createElement('span');
      buffBadge.textContent = '[buff]';
      buffBadge.style.padding = '2px 8px';
      buffBadge.style.background = '#218c21';
      buffBadge.style.color = 'white';
      buffBadge.style.borderRadius = '4px';
      buffBadge.style.fontSize = '12px';
      badges.appendChild(buffBadge);
    }

    card.appendChild(badges);

    const descText = entry.description || loc(entry.desc_key || '') || '';
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
    fullDesc.textContent = descText || loc('noDescription');
    fullDesc.style.marginBottom = '8px';
    card.appendChild(fullDesc);

    const details = [
      { key: 'dbDetailType', value: entry.type || '—' },
      { key: 'dbDetailMaxStrength', value: entry.maxstrength || '—' },
      { key: 'dbDetailLimbSpecific', value: entry.limbspecific ? loc('yes') : loc('no') },
      { key: 'dbDetailIsBuff', value: entry.isbuff ? loc('yes') : loc('no') }
    ];

    details.forEach(d => {
      const line = document.createElement('div');
      const label = document.createElement('strong');
      label.textContent = loc(d.key) + ': ';
      line.appendChild(label);
      line.appendChild(document.createTextNode(d.value));
      line.style.fontSize = '13px';
      card.appendChild(line);
    });
  }

  appendItemDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = entry.name || loc(entry.name_key || '') || entry.identifier || 'unknown';
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
  }

  appendCreatureDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = entry.name || loc(entry.name_key || '') || entry.identifier || 'unknown';
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
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
    let atlasImage = this.atlasCache.get(texture);

    if (!atlasImage) {
      // Если атлас не в кэше, проверяем, не загружается ли он уже
      if (this.pendingAtlases.has(texture)) {
        atlasImage = await this.pendingAtlases.get(texture); // Ждём завершения загрузки
      } else {
        // Если не загружается, начинаем загрузку
        const atlasPromise = this.loadAtlasAsync(texture);
        this.pendingAtlases.set(texture, atlasPromise);
        atlasImage = await atlasPromise; // Ждём завершения новой загрузки
      }
    }

    if (atlasImage) {
      // Если атлас успешно получен, рисуем на canvas
      this.drawIconFromAtlas(ctx, atlasImage, sourcerect, colorKeyKebab);
    } else {
      // Если атлас не удалось загрузить, оставляем fallback
      console.warn(`Could not load atlas for icon: ${texture}`);
    }

    // Кэшируем готовый canvas (клон для возврата, оригинальный для кэша)
    this.iconCache.set(cacheKey, canvas);
    return canvas.cloneNode(true);
  }
  // ===============================================

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

  // === МЕТОД ДЛЯ ОТРИСОВКИ ПЛЕЙШХОЛДЕРА (используется в createRealIcon до загрузки атласа) ===
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
  // ================================================================================

  // === МЕТОД ДЛЯ ЗАГРУЗКИ АТЛАСА С КЭШИРОВАНИЕМ ===
  async loadAtlasAsync(path) {
    // Проверяем кэш атласов (ожидаем Promise(Image))
    if (this.atlasCache.has(path)) {
      // Если в кэше, возвращаем изображение напрямую (оно уже загружено)
      return this.atlasCache.get(path);
    }

    // Создаём промис загрузки и кладём его в кэш
    const imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Для CORS, если нужно
      img.onload = () => {
        this.atlasCache.set(path, img); // Кэшируем изображение
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load atlas: ${path}`);
        // Не кэшируем 'null' или 'undefined', иначе всегда будет ошибка
        reject(new Error(`Failed to load atlas: ${path}`));
      };
      // Используем путь из JSON (должен быть assets/textures/...)
      // Предполагается, что путь уже изменён в JSON на 'assets/textures/...'
      img.src = path;
    });

    // Кэшируем *Promise*, чтобы другие вызовы ждали одну и ту же загрузку
    this.atlasCache.set(path, imagePromise);

    try {
      const loadedImage = await imagePromise;
      return loadedImage;
    } catch (e) {
      // Если загрузка не удалась, удаляем промис из кэша (но не сам 'null')
      // this.atlasCache.delete(path); // Не удаляем, чтобы не перезапускать неудачную попытку
      // Возвращаем null, чтобы вызывающая сторона знала об ошибке
      return null;
    }
  }
  // ====================================================================================================

  // === МЕТОД ДЛЯ ОТРИСОВКИ ИКОНКИ ИЗ АТЛАСА С ЦВЕТОМ ===
  drawIconFromAtlas(ctx, img, sourcerectStr, colorKeyKebab) {
    if (!img) return;

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
  // ======================================================================================

  // snake_case -> kebab-case
  toKebabCase(str) {
    return str.replace(/_/g, '-');
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
