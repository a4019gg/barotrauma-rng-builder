// js/db.js — v0.9.418_debug_icons — ДОБАВЛЕНЫ ЛОГИ ДЛЯ ОТЛАДКИ ИКОНОК

// ... (остальная часть файла без изменений до конструктора DatabaseManager) ...

  // === ОБНОВЛЁННЫЙ createRealIcon с логами ===
  async createRealIcon(iconInfo) {
    console.group("=== Creating Real Icon ==="); // Начало группы логов
    console.log("Input iconInfo:", iconInfo);

    if (!iconInfo || !iconInfo.texture || !iconInfo.sourcerect) {
      console.warn("  Invalid iconInfo, returning missing icon");
      const fallback = this.createMissingIconCanvas();
      console.groupEnd(); // Конец группы
      return fallback;
    }

    const texture = iconInfo.texture;
    const sourcerect = iconInfo.sourcerect;
    const colorKeySnake = iconInfo.color_theme_key || 'icon-status-gray';
    const colorKeyKebab = this.toKebabCase(colorKeySnake);

    const cacheKey = `${texture}|${sourcerect}|${colorKeyKebab}`;
    console.log("  Cache key:", cacheKey);

    // Проверяем кэш готовых canvas
    if (this.iconCache.has(cacheKey)) {
      console.log("  Cache HIT for key:", cacheKey);
      const cached = this.iconCache.get(cacheKey).cloneNode(true);
      console.groupEnd(); // Конец группы
      return cached;
    }
    console.log("  Cache MISS for key:", cacheKey);

    // Создаём canvas
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error("  Could not get 2d context");
      console.groupEnd(); // Конец группы
      return canvas; // Возврат пустого canvas как fallback
    }
    console.log("  Created canvas and context");

    // Рисуем fallback (плейсхолдер) сразу
    this.drawMissingIcon(ctx);
    console.log("  Drew placeholder on canvas");

    // --- ИСПРАВЛЕНО: Ждём результат loadAtlasAsync ---
    let atlasImage = null;
    try {
      console.log("  Calling loadAtlasAsync for:", texture);
      atlasImage = await this.loadAtlasAsync(texture); // await
      console.log("  loadAtlasAsync returned:", atlasImage);
    } catch (e) {
      console.error("  Error in loadAtlasAsync:", e);
      console.groupEnd(); // Конец группы
      // Возвращаем fallback canvas (он уже с плейсхолдером)
      return this.createMissingIconCanvas();
    }
    // ------------------------------------------

    if (atlasImage) {
      console.log("  Atlas image is valid, calling drawIconFromAtlas");
      // Если атлас успешно получен, рисуем на canvas
      this.drawIconFromAtlas(ctx, atlasImage, sourcerect, colorKeyKebab);
    } else {
      console.warn("  Atlas image was null, keeping placeholder");
      // Если loadAtlasAsync вернул null (например, после ошибки)
      // Оставляем fallback
    }

    // --- ИСПРАВЛЕНО: Кэшируем *готовый* canvas ---
    console.log("  Setting canvas to cache with key:", cacheKey);
    this.iconCache.set(cacheKey, canvas);
    console.log("  Returning cloned canvas");
    const clone = canvas.cloneNode(true);
    console.groupEnd(); // Конец группы
    return clone;
  }
  // ===============================================

  // === ОБНОВЛЁННЫЙ loadAtlasAsync с логами ===
  async loadAtlasAsync(path) {
    console.group("  --- loadAtlasAsync ---"); // Начало группы для загрузки атласа
    console.log("    Requested path:", path);

    // Проверяем кэш атласов (ожидаем Promise(Image))
    if (this.atlasCache.has(path)) {
      console.log("    Atlas Cache HIT for path:", path);
      const cachedImg = this.atlasCache.get(path);
      console.log("    Cached image:", cachedImg, "Complete:", cachedImg?.complete);
      console.groupEnd(); // Конец группы загрузки
      return cachedImg;
    }
    console.log("    Atlas Cache MISS for path:", path);

    // Проверяем, не загружается ли уже
    if (this.pendingAtlases.has(path)) {
      console.log("    Pending atlas request found for path:", path);
      const pendingPromise = this.pendingAtlases.get(path);
      console.log("    Awaiting existing promise...");
      const result = await pendingPromise;
      console.log("    Existing promise resolved with:", result);
      console.groupEnd(); // Конец группы загрузки
      return result; // Это Promise
    }
    console.log("    No pending request, starting new load");

    // Создаём промис загрузки и кладём его в pending
    const imagePromise = new Promise((resolve, reject) => {
      const img = new Image();
      // img.crossOrigin = 'anonymous'; // Для CORS, если нужно и если атласы на другом домене
      console.log("    Created new Image object for path:", path);

      img.onload = () => {
        console.log("    Image onload fired for path:", path);
        console.log("    Image object:", img, "Complete:", img.complete, "Dimensions:", img.width, "x", img.height);
        this.atlasCache.set(path, img); // Кэшируем *изображение*
        this.pendingAtlases.delete(path); // Убираем из ожидаемых
        console.log("    Resolving promise with image:", img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`    Image onerror fired for path: ${path}`);
        // Удаляем из pending, если был
        this.pendingAtlases.delete(path);
        console.log("    Resolving promise with null due to error");
        // Разрешаем Promise с null
        resolve(null);
      };
      img.src = path; // Используем путь из JSON
      console.log("    Set img.src to:", path);
    });

    console.log("    Storing promise in pendingAtlases for path:", path);
    // Кэшируем *Promise*, чтобы другие вызовы ждали одну и ту же загрузку
    this.pendingAtlases.set(path, imagePromise);

    // Ждём и вернём результат
    console.log("    Awaiting imagePromise...");
    const loadedImage = await imagePromise;
    console.log("    Final result from loadAtlasAsync:", loadedImage);
    console.groupEnd(); // Конец группы загрузки
    return loadedImage; // Может быть HTMLImageElement или null
  }
  // ====================================

  // === ОБНОВЛЁННЫЙ drawIconFromAtlas с логами ===
  drawIconFromAtlas(ctx, img, sourcerectStr, colorKeyKebab) {
    console.group("    --- drawIconFromAtlas ---"); // Начало группы для отрисовки
    console.log("      Input img:", img, "Type:", typeof img, "Instance of HTMLImageElement:", img instanceof HTMLImageElement);
    console.log("      Input sourcerectStr:", sourcerectStr);
    console.log("      Input colorKeyKebab:", colorKeyKebab);

    // --- ПРОВЕРКА ---
    if (!img || !(img instanceof HTMLImageElement)) {
      console.error("      ERROR: img is not an HTMLImageElement, skipping drawImage");
      console.groupEnd(); // Конец группы отрисовки
      return;
    }
    console.log("      Image is valid HTMLImageElement, proceeding");
    // --------------------

    const rect = sourcerectStr.split(',').map(v => parseInt(v.trim()));
    if (rect.length !== 4) {
      console.warn(`      Invalid sourcerect format: ${sourcerectStr}`);
      console.groupEnd(); // Конец группы отрисовки
      return;
    }
    const [sx, sy, sw, sh] = rect;
    console.log("      Parsed sourcerect:", [sx, sy, sw, sh]);

    // Проверяем, не выходит ли sourcerect за границы атласа
    if (sx < 0 || sy < 0 || sx + sw > img.width || sy + sh > img.height) {
      console.warn(`      Sourcerect out of bounds for ${texturePath}: ${sourcerectStr}`);
      console.groupEnd(); // Конец группы отрисовки
      return;
    }

    // Очищаем и рисуем часть атласа на canvas 48x48
    console.log("      Calling ctx.clearRect");
    ctx.clearRect(0, 0, 48, 48);
    console.log("      Calling ctx.drawImage with img:", img, "at rect:", [sx, sy, sw, sh], "to dest:", [0, 0, 48, 48]);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48); // <-- ОШИБКА ВОЗНИКАЕТ ЗДЕСЬ
    console.log("      ctx.drawImage completed");

    // Накладываем цвет
    const rgbStr = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorKeyKebab}-rgb`).trim();
    console.log("      Retrieved CSS color value for key '--" + colorKeyKebab + "-rgb':", rgbStr);

    if (rgbStr) {
      const [r, g, b] = rgbStr.split(',').map(v => parseInt(v.trim(), 10));
      console.log("      Parsed RGB values:", [r, g, b]);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        console.log("      Applying color tint via canvas operations");
        // Используем source-atop для наложения цвета
        ctx.globalCompositeOperation = 'source-in'; // Оставляем только непрозрачные пиксели
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, 48, 48);

        ctx.globalCompositeOperation = 'destination-over'; // Переключаемся, чтобы нарисовать белый фон
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 48, 48);

        ctx.globalCompositeOperation = 'source-over'; // Возвращаемся к нормальному режиму
        console.log("      Color tint applied successfully");
      } else {
        console.warn(`      Invalid RGB values parsed from CSS variable --${colorKeyKebab}-rgb: ${rgbStr}`);
      }
    } else {
      console.info(`      No CSS variable --${colorKeyKebab}-rgb found, skipping color tint`);
    }
    console.groupEnd(); // Конец группы отрисовки
  }
  // ===============================================

// ... (остальная часть файла без изменений) ...
