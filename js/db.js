// js/db.js — v0.9.421 — ИСПРАВЛЕННЫЕ ИКОНКИ С ЦВЕТОМ И МИССИНГОМ

const DB_VERSION = "v0.9.421";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];
    this.iconCache = new Map(); // Ключ: `${texture}|${sourcerect}|${colorKey}`, Значение: Promise(canvas)
    this.atlasCache = new Map(); // Ключ: путь к атласу, Значение: Promise(Image)
    this.missingIconCanvas = null; // Заглушка
    this.currentTab = 'afflictions';
    this.isModalOpen = false;
    this.loadMissingIcon(); // Загрузить заглушку
    this.loadData();
  }

  loadMissingIcon() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Нарисовать "Missing Texture" на канвасе
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
        this.missingIconCanvas = canvas;
        resolve(canvas);
      };
      img.onerror = () => {
        console.error('Failed to load missing texture icon');
        // Создать простую заглушку
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 48;
        fallbackCanvas.height = 48;
        const ctx = fallbackCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f00';
          ctx.fillRect(0, 0, 48, 48);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', 24, 24);
        }
        this.missingIconCanvas = fallbackCanvas;
        resolve(fallbackCanvas);
      };
      img.src = 'assets/missing_texture.png'; // Или другой путь к заглушке
    });
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
    await this.loadMissingIcon(); // Убедиться, что заглушка загружена
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

    this.renderGrid('afflictions');
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
        this.renderGrid(tab);
      };
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

  renderGrid(type) {
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

    data.forEach(async (entry) => { // async для createCard
      const card = await this.createCard(entry, type); // await
      grid.appendChild(card);
    });
  }

  // Асинхронная функция для создания карточки (с ожиданием иконки)
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

    // Ждём, пока иконка будет готова
    const icon = await this.createRealIcon(entry.icon || {});
    top.appendChild(icon);

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

  // === ИСПРАВЛЕННАЯ ФУНКЦИЯ createRealIcon ===
  async createRealIcon(iconInfo) {
    if (!iconInfo || !iconInfo.texture || !iconInfo.sourcerect) {
      // Вернуть заглушку, если нет данных
      return this.missingIconCanvas ? this.missingIconCanvas.cloneNode(true) : this.createFallbackIcon();
    }

    const texturePath = iconInfo.texture;
    const sourcerectStr = iconInfo.sourcerect;
    // Преобразуем color_theme_key из snake_case в kebab-case
    const colorKeySnake = iconInfo.color_theme_key || 'icon-status-gray';
    const colorKeyKebab = colorKeySnake.replace(/_/g, '-');
    const cacheKey = `${texturePath}|${sourcerectStr}|${colorKeyKebab}`;

    // Проверяем кэш (ожидаем Promise(canvas))
    if (this.iconCache.has(cacheKey)) {
      const canvasPromise = this.iconCache.get(cacheKey);
      try {
        const cachedCanvas = await canvasPromise;
        return cachedCanvas.cloneNode(true);
      } catch (e) {
        console.warn(`Cache miss for ${cacheKey} due to error:`, e);
        // Если кэш сломался, пересоздаём
      }
    }

    // Создаём промис для отрисовки иконки и кладём его в кэш
    const canvasPromise = this.renderIconToCanvas(texturePath, sourcerectStr, colorKeyKebab);
    this.iconCache.set(cacheKey, canvasPromise);

    try {
      const finalCanvas = await canvasPromise;
      return finalCanvas.cloneNode(true);
    } catch (e) {
      console.error(`Failed to render icon for ${cacheKey}:`, e);
      // В случае ошибки отрисовки, возвращаем заглушку
      return this.missingIconCanvas ? this.missingIconCanvas.cloneNode(true) : this.createFallbackIcon();
    }
  }

  // === ФУНКЦИЯ ОТРИСОВКИ ИКОНКИ ===
  async renderIconToCanvas(texturePath, sourcerectStr, colorKeyKebab) {
    const atlasImage = await this.loadAtlas(texturePath);
    if (!atlasImage) {
      // Если атлас не загрузился, возвращаем заглушку
      return this.missingIconCanvas ? this.missingIconCanvas.cloneNode(true) : this.createFallbackIcon();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get 2d context');
      return canvas; // Возврат пустого canvas как fallback
    }

    // Отрисовка из атласа
    const rect = sourcerectStr.split(',').map(Number);
    if (rect.length !== 4) {
      console.warn(`Invalid sourcerect format: ${sourcerectStr}`);
      return this.missingIconCanvas ? this.missingIconCanvas.cloneNode(true) : this.createFallbackIcon();
    }
    const [sx, sy, sw, sh] = rect;

    // Проверяем, не выходит ли sourcerect за границы атласа
    if (sx < 0 || sy < 0 || sx + sw > atlasImage.width || sy + sh > atlasImage.height) {
      console.warn(`Sourcerect out of bounds for ${texturePath}: ${sourcerectStr}`);
      return this.missingIconCanvas ? this.missingIconCanvas.cloneNode(true) : this.createFallbackIcon();
    }

    ctx.drawImage(atlasImage, sx, sy, sw, sh, 0, 0, 48, 48);

    // Наложение цвета
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

    return canvas;
  }

  // === ЗАГРУЗКА АТЛАСА С КЭШИРОВАНИЕМ ===
  async loadAtlas(path) {
    // Проверяем кэш атласов (ожидаем Promise(Image))
    if (this.atlasCache.has(path)) {
      const imagePromise = this.atlasCache.get(path);
      return imagePromise;
    }

    // Создаём промис загрузки и кладём его в кэш
    const imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Для CORS, если нужно
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`Failed to load atlas: ${path}`);
        reject(new Error(`Failed to load atlas: ${path}`));
      };
      img.src = path; // Используем путь из JSON (должен быть assets/textures/...)
    });

    this.atlasCache.set(path, imagePromise);

    try {
      const loadedImage = await imagePromise;
      return loadedImage;
    } catch (e) {
      // Удаляем сломанный промис из кэша
      this.atlasCache.delete(path);
      return null;
    }
  }

  createFallbackIcon() {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f00';
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 24, 24);
    }
    return canvas;
  }

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
