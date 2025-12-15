// js/db.js — v0.9.417 — БАЗА ДАННЫХ С ПЛЕЙСХОЛДЕРОМ ИЗ КАРТИНКИ И ФИКСОМ ЦВЕТА

const DB_VERSION = "v0.9.417";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];
    this.iconCache = new Map();
    this.atlasCache = new Map();
    this.pendingAtlases = new Map();
    this.missingIconImg = null; // Загруженный плейсхолдер
    this.currentTab = 'afflictions';
    this.isModalOpen = false;
    this.loadMissingIcon();
    this.loadData();
  }

  loadMissingIcon() {
    this.missingIconImg = new Image();
    this.missingIconImg.src = 'assets/Missing_Texture_icon.png';
    // Не ждём onload — если не загрузится, останется пустой canvas
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

  // ... createTabs, createSearchInput, renderGrid, createCard, append*Details — без изменений ...

  createRealIcon(iconInfo) {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    if (!iconInfo || !iconInfo.texture || !iconInfo.sourcerect) {
      this.drawMissingIcon(ctx);
      return canvas;
    }

    const texture = iconInfo.texture;
    const sourcerect = iconInfo.sourcerect;
    const colorKey = iconInfo.color_theme_key || 'icon-status-gray';

    const cacheKey = `${texture}|${sourcerect}|${colorKey}`;

    if (this.iconCache.has(cacheKey)) {
      const cached = this.iconCache.get(cacheKey);
      ctx.drawImage(cached, 0, 0);
      return canvas;
    }

    // Сначала рисуем плейсхолдер из картинки
    this.drawMissingIcon(ctx);

    this.loadAtlasAsync(texture).then(img => {
      if (img) {
        this.drawIconFromAtlas(ctx, img, sourcerect, colorKey);
        // Кэшируем готовую
        this.iconCache.set(cacheKey, canvas);
      }
    });

    // Кэшируем с плейсхолдером
    this.iconCache.set(cacheKey, canvas);

    return canvas;
  }

  drawMissingIcon(ctx) {
    if (this.missingIconImg && this.missingIconImg.complete) {
      ctx.drawImage(this.missingIconImg, 0, 0, 48, 48);
    } else {
      // Fallback если картинка не загрузилась
      ctx.fillStyle = '#2d2d30';
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#aaa';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 24, 24);
    }
  }

  loadAtlasAsync(texture) {
    if (this.pendingAtlases.has(texture)) {
      return this.pendingAtlases.get(texture);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = texture;

    const promise = new Promise(resolve => {
      img.onload = () => {
        this.atlasCache.set(texture, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn('Failed to load atlas:', texture);
        resolve(null);
      };
    });

    this.pendingAtlases.set(texture, promise);
    return promise;
  }

  drawIconFromAtlas(ctx, img, sourcerect, colorKey) {
    if (!img) return;

    const rect = sourcerect.split(',').map(v => parseInt(v.trim()));
    const [sx, sy, sw, sh] = rect;

    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    const rgbVar = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorKey}-rgb`).trim();

    if (rgbVar) {
      const [r, g, b] = rgbVar.split(',').map(v => parseInt(v.trim()));
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, 48, 48);
      // Сброс composite для будущих операций
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ... filterGrid без изменений ...
}

const dbManager = new DatabaseManager();
window.dbManager = dbManager;
