(() => {
  const APP_VERSION = "16";
  const DB_NAME = "macro-tracker-v13";
  const DB_VERSION = 2;
  const LEGACY_RECORD_KEY = "macro_tracker_records_v8";
  const LEGACY_FAVORITE_KEY = "macro_tracker_favorites_v8";
  const DEFAULT_DAY_TYPE = "training";
  const MAX_FAVORITES = 30;
  const MEAL_LABELS = ["第一餐", "第二餐", "第三餐", "第四餐"];
  const TARGETS = {
    training: { label: "训练日", calories: 2300, protein: 170, carbs: 270, fat: 60 },
    rest: { label: "休息日", calories: 2000, protein: 170, carbs: 185, fat: 65 }
  };
  const DEFAULT_WEEKLY_TRAINING_DAYS = 4;
  const DEFAULT_WEEKLY_REST_DAYS = 3;
  const GOAL_WEIGHT = 75;
  const TARGET_DATE = "2026-06-30";
  const SETTINGS_META_KEY = "settings_v16";
  const LEGACY_SETTINGS_META_KEY = "settings_v15";
  const DEFAULT_SETTINGS = {
    bmr: 1700,
    currentWeightKg: 78,
    targetWeightKg: GOAL_WEIGHT,
    targetBodyFatPercent: 15,
    targetDate: TARGET_DATE,
    goalMode: "recomp",
    activityLevel: "medium",
    trainingDaysPerWeek: DEFAULT_WEEKLY_TRAINING_DAYS,
    trackingAccuracyBuffer: "medium",
    settingsVersion: 0,
    lastAutoAdjustmentDate: "",
    lastTrendAdjustment: null,
    generatedAt: ""
  };
  const GOAL_MODE_CONFIG = {
    cut: { label: "减脂优先", description: "体重稳步下降，保留训练表现", deficitRatio: 0.16, minDeficit: 300, maxDeficit: 550, boost: 125, proteinBase: 2.05, fatBase: 0.68 },
    recomp: { label: "Recomp 平衡", description: "小缺口，优先保训练质量", deficitRatio: 0.08, minDeficit: 100, maxDeficit: 250, boost: 200, proteinBase: 1.9, fatBase: 0.75 },
    performance: { label: "表现优先", description: "接近维持，训练日碳水更高", deficitRatio: 0.03, minDeficit: 0, maxDeficit: 120, boost: 250, proteinBase: 1.75, fatBase: 0.8 }
  };
  const ACTIVITY_LEVEL_CONFIG = {
    low: { label: "低", description: "久坐办公，日常步数少", baseFactor: 1.32 },
    medium: { label: "中", description: "正常通勤和走动", baseFactor: 1.42 },
    high: { label: "高", description: "日常走动多或工作较活跃", baseFactor: 1.55 }
  };
  const TRACKING_BUFFER_CONFIG = {
    low: { label: "低", description: "称重严格、外食少", calories: 0 },
    medium: { label: "中", description: "普通记录，默认保守一点", calories: 100 },
    high: { label: "高", description: "外食多、油量难估", calories: 175 }
  };
  const PERFORMANCE_LEVELS = {
    poor: { label: "偏差", score: -1 },
    normal: { label: "正常", score: 0 },
    great: { label: "很好", score: 1 }
  };
  const HUNGER_LEVELS = {
    low: { label: "低", score: 1 },
    medium: { label: "中", score: 2 },
    high: { label: "高", score: 3 }
  };
  const MIN_DAILY_DEFICIT = 250;
  const MAX_DAILY_DEFICIT = 650;
  const LEGACY_EXPORT_HEADER = ["date", "dayType", "bodyWeight", "meal", "item", "name", "calories", "protein", "carbs", "fat"];
  const EXPORT_HEADER = [...LEGACY_EXPORT_HEADER, "trainingPerformance", "hungerLevel", "sleepScore"];
  const FAVORITE_SECTION_MARKER = "__macro_tracker_favorites__";
  const FAVORITE_EXPORT_HEADER = ["favoriteId", "favoriteName", "entry", "name", "calories", "protein", "carbs", "fat", "usageCount", "lastUsedAt", "updatedAt", "createdAt"];
  const ENTRY_FIELDS = ["name", "calories", "protein", "carbs", "fat"];
  const NUMERIC_RULES = {
    bodyWeight: { label: "晨起体重", min: 0, max: 500, decimals: 1 },
    calories: { label: "kcal", min: 0, max: 5000, decimals: 1 },
    protein: { label: "蛋白", min: 0, max: 500, decimals: 1 },
    carbs: { label: "碳水", min: 0, max: 800, decimals: 1 },
    fat: { label: "脂肪", min: 0, max: 300, decimals: 1 }
  };

  const state = {
    ready: false,
    date: localDateString(),
    dayType: DEFAULT_DAY_TYPE,
    bodyWeight: "",
    trainingPerformance: "normal",
    hungerLevel: "medium",
    sleepScore: "",
    meals: mealTemplate(),
    records: {},
    favorites: [],
    dailyTargets: {},
    settings: null,
    settingsDraft: null,
    view: "today",
    activeMeal: 1,
    notice: "",
    noticeTone: "neutral",
    helpOpen: false,
    settingsOpen: false,
    importPreviewOpen: false,
    pendingImport: null,
    editingFavId: null,
    favoriteDraft: null,
    favoriteSelectionId: "",
    historyDateFilter: "",
    historySearchText: "",
    historyDayTypeFilter: "all",
    favoriteSearchText: "",
    lastSavedAt: "",
    lastDraftSavedAt: "",
    dirty: false,
    fatalError: "",
    syncingDraft: false
  };

  const dom = {
    subtitle: $("appSubtitle"),
    summaryChips: $("summaryChips"),
    statusLine: $("statusLine"),
    noticeBox: $("noticeBox"),
    view: $("view"),
    helpModal: $("helpModal"),
    closeHelpBtn: $("closeHelpBtn"),
    helpBtn: $("helpBtn"),
    settingsModal: $("settingsModal"),
    settingsBody: $("settingsBody"),
    saveSettingsBtn: $("saveSettingsBtn"),
    closeSettingsBtn: $("closeSettingsBtn"),
    settingsBtn: $("settingsBtn"),
    importModal: $("importModal"),
    importPreviewBody: $("importPreviewBody"),
    confirmImportBtn: $("confirmImportBtn"),
    cancelImportBtn: $("cancelImportBtn"),
    closeImportPreviewBtn: $("closeImportPreviewBtn"),
    csvImportInput: $("csvImportInput")
  };

  const storage = createStorage();
  let noticeTimer = 0;
  let draftTimer = 0;
  let lastModalTrigger = null;

  bootstrap().catch((error) => {
    console.error(error);
    state.fatalError = "初始化本地数据库失败，请在 Safari 或 Chrome 中重试。";
    render();
  });

  async function bootstrap() {
    dom.subtitle.textContent = `Private tracker · V${APP_VERSION}`;
    bindEvents();
    renderLoading();
    await migrateLegacyLocalStorage();
    await refreshPersistedData();
    await maybeRunScheduledTargetAdjustment();
    await hydrateCurrentDate({ announce: false });
    state.ready = true;
    render();
    registerServiceWorker();
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      handleClick(event).catch(handleAsyncError);
    });

    document.addEventListener("input", (event) => {
      handleInput(event).catch(handleAsyncError);
    });

    document.addEventListener("change", (event) => {
      handleInput(event).catch(handleAsyncError);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (state.importPreviewOpen) {
        closeImportPreview();
      } else if (state.settingsOpen) {
        closeSettingsModal();
      } else if (state.helpOpen) {
        closeHelpModal();
      }
    });

    dom.settingsModal.addEventListener("click", (event) => {
      if (event.target === dom.settingsModal) {
        closeSettingsModal();
      }
    });

    dom.helpModal.addEventListener("click", (event) => {
      if (event.target === dom.helpModal) {
        closeHelpModal();
      }
    });

    dom.importModal.addEventListener("click", (event) => {
      if (event.target === dom.importModal) {
        closeImportPreview();
      }
    });

    dom.csvImportInput.addEventListener("change", (event) => {
      handleCsvSelection(event).catch(handleAsyncError);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        flushDraftSave().catch(handleAsyncError);
      }
    });

    window.addEventListener("beforeunload", (event) => {
      if (draftTimer) {
        clearTimeout(draftTimer);
      }
      if (hasUnsavedFormalChanges()) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }

  async function handleClick(event) {
    const button = event.target.closest("button");
    if (!button) {
      return;
    }

    if (button.id === "helpBtn") {
      openHelpModal(button);
      return;
    }
    if (button.id === "settingsBtn") {
      openSettingsModal(button);
      return;
    }
    if (button.id === "closeSettingsBtn") {
      closeSettingsModal();
      return;
    }
    if (button.id === "saveSettingsBtn") {
      await saveSettings();
      return;
    }
    if (button.id === "closeHelpBtn") {
      closeHelpModal();
      return;
    }
    if (button.id === "closeImportPreviewBtn" || button.id === "cancelImportBtn") {
      closeImportPreview();
      return;
    }
    if (button.id === "confirmImportBtn") {
      await confirmPendingImport();
      return;
    }
    if (button.dataset.view) {
      state.view = button.dataset.view;
      render();
      return;
    }
    if (button.id === "saveDayBtn") {
      await saveDay();
      return;
    }
    if (button.dataset.meal) {
      state.activeMeal = Number(button.dataset.meal);
      render();
      return;
    }
    if (button.id === "saveFavBtn") {
      await saveFavoriteFromActive();
      return;
    }
    if (button.id === "applySelectedFavoriteBtn") {
      if (!state.favoriteSelectionId) {
        setNotice("请先从下拉菜单中选择一个常用餐", { tone: "warn" });
        return;
      }
      const selectedId = state.favoriteSelectionId;
      state.favoriteSelectionId = "";
      await applyFavorite(selectedId);
      return;
    }
    if (button.dataset.applyFavorite) {
      await applyFavorite(button.dataset.applyFavorite);
      return;
    }
    if (button.id === "nextMealBtn") {
      state.activeMeal = Math.min(MEAL_LABELS.length, state.activeMeal + 1);
      render();
      return;
    }
    if (button.id === "addEntryBtn") {
      addEntryToActiveMeal();
      return;
    }
    if (button.dataset.deleteEntry) {
      const [mealId, entryIndex] = button.dataset.deleteEntry.split("-").map(Number);
      deleteEntry(mealId, entryIndex);
      return;
    }
    if (button.dataset.loadDate) {
      await switchDate(button.dataset.loadDate);
      state.view = "today";
      render();
      return;
    }
    if (button.dataset.deleteRecord) {
      await deleteRecord(button.dataset.deleteRecord);
      return;
    }
    if (button.id === "exportAllBtn") {
      exportAll();
      return;
    }
    if (button.id === "importCsvBtn") {
      dom.csvImportInput.click();
      return;
    }
    if (button.dataset.editFavorite) {
      startEditFavorite(button.dataset.editFavorite);
      return;
    }
    if (button.id === "cancelEditFavBtn") {
      state.editingFavId = null;
      state.favoriteDraft = null;
      render();
      return;
    }
    if (button.id === "saveEditedFavBtn") {
      await saveEditedFavorite();
      return;
    }
    if (button.dataset.deleteFavorite) {
      await deleteFavorite(button.dataset.deleteFavorite);
      return;
    }
    if (button.id === "addFavEntryBtn") {
      addFavoriteDraftEntry();
      return;
    }
    if (button.dataset.deleteFavoriteEntry) {
      deleteFavoriteDraftEntry(Number(button.dataset.deleteFavoriteEntry));
      return;
    }
  }

  async function handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.id === "dateInput") {
      await switchDate(target.value);
      render();
      return;
    }

    if (target.id === "dayTypeInput" && target instanceof HTMLSelectElement) {
      state.dayType = target.value === "rest" ? "rest" : "training";
      markDirty();
      render();
      return;
    }

    if (target.id === "trainingPerformanceInput" && target instanceof HTMLSelectElement) {
      state.trainingPerformance = normalizeTrainingPerformance(target.value);
      markDirty();
      renderHeader();
      return;
    }

    if (target.id === "hungerLevelInput" && target instanceof HTMLSelectElement) {
      state.hungerLevel = normalizeHungerLevel(target.value);
      markDirty();
      renderHeader();
      return;
    }

    if (target.id === "sleepScoreInput" && target instanceof HTMLInputElement) {
      state.sleepScore = normalizeSleepScore(target.value);
      markDirty();
      renderHeader();
      return;
    }

    if (target.id === "favoriteSelect" && target instanceof HTMLSelectElement) {
      state.favoriteSelectionId = target.value;
      const applyButton = document.getElementById("applySelectedFavoriteBtn");
      if (applyButton) {
        applyButton.disabled = !state.favoriteSelectionId;
      }
      return;
    }

    if (target.id === "historyDateFilter" && target instanceof HTMLInputElement) {
      state.historyDateFilter = target.value;
      render();
      return;
    }

    if (target.id === "historySearchInput" && target instanceof HTMLInputElement) {
      state.historySearchText = target.value;
      render();
      return;
    }

    if (target.id === "historyDayTypeFilter" && target instanceof HTMLSelectElement) {
      state.historyDayTypeFilter = target.value;
      render();
      return;
    }

    if (target.id === "favoriteSearchInput" && target instanceof HTMLInputElement) {
      state.favoriteSearchText = target.value;
      render();
      return;
    }

    if (target.dataset.setting && state.settingsDraft) {
      updateSettingsDraft(target);
      return;
    }

    if (target.id === "bodyWeightInput" && target instanceof HTMLInputElement) {
      state.bodyWeight = normalizeLooseNumericText(target.value);
      markDirty();
      renderHeader();
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.entry) {
      const [mealIdText, entryIndexText, field] = target.dataset.entry.split("-");
      const mealId = Number(mealIdText);
      const entryIndex = Number(entryIndexText);
      if (!state.meals[mealId - 1] || !state.meals[mealId - 1].entries[entryIndex]) {
        return;
      }
      state.meals[mealId - 1].entries[entryIndex][field] = field === "name"
        ? target.value
        : normalizeLooseNumericText(target.value);
      markDirty();
      renderHeader();
      refreshTodayLiveBits();
      return;
    }

    if (target.id === "favAliasInput" && target instanceof HTMLInputElement && state.favoriteDraft) {
      state.favoriteDraft.name = target.value;
      refreshFavoriteDraftLiveBits();
      return;
    }

    if (target instanceof HTMLInputElement && target.dataset.favoriteEntry && state.favoriteDraft) {
      const [entryIndexText, field] = target.dataset.favoriteEntry.split("-");
      const entryIndex = Number(entryIndexText);
      if (!state.favoriteDraft.entries[entryIndex]) {
        return;
      }
      state.favoriteDraft.entries[entryIndex][field] = field === "name"
        ? target.value
        : normalizeLooseNumericText(target.value);
      refreshFavoriteDraftLiveBits();
    }
  }

  async function handleCsvSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    dom.csvImportInput.value = "";
    prepareImportPreview(text);
  }

  function renderLoading() {
    dom.view.innerHTML = '<div class="card"><h3>正在加载</h3><div class="hint-box">正在读取本地数据与草稿，请稍候…</div></div>';
  }

  function render() {
    renderHeader();
    if (state.fatalError) {
      dom.view.innerHTML = `<div class="card"><h3>无法继续加载</h3><div class="warn-box">${esc(state.fatalError)}</div></div>`;
      return;
    }
    if (!state.ready) {
      renderLoading();
      return;
    }
    if (state.view === "history") {
      dom.view.innerHTML = renderHistory();
      refreshFavoriteDraftLiveBits();
      return;
    }
    if (state.view === "overview") {
      dom.view.innerHTML = renderOverview();
      return;
    }
    dom.view.innerHTML = renderToday();
    refreshTodayLiveBits();
  }

  function renderHeader() {
    const overview = stats();
    const summaryItems = [
      ["热量", remainingChipText(overview.remaining.calories), overallTone("calories", overview.overall.cal), "primary"],
      ["蛋白", remainingChipText(overview.remaining.protein, "g"), overallTone("protein", overview.overall.pro), "support"],
      ["碳水", remainingChipText(overview.remaining.carbs, "g"), overallTone("carbs", overview.overall.carb), "support"],
      ["脂肪", remainingChipText(overview.remaining.fat, "g"), overallTone("fat", overview.overall.fat), "support"]
    ];
    dom.summaryChips.innerHTML = `
      <div class="summary-dashboard">
        ${summaryItems.map(([label, value, tone, weight]) => {
          return `<div class="chip ${tone} ${weight === "primary" ? "summary-primary" : "summary-support"}"><div class="k">${label}</div><div class="v">${value}</div></div>`;
        }).join("")}
      </div>
    `;

    dom.statusLine.textContent = buildStatusText();
    dom.noticeBox.innerHTML = state.notice
      ? `<div class="notice ${state.noticeTone}">${esc(state.notice)}</div>`
      : "";

    dom.settingsModal.classList.toggle("open", state.settingsOpen);
    dom.helpModal.classList.toggle("open", state.helpOpen);
    dom.importModal.classList.toggle("open", state.importPreviewOpen);
    document.body.classList.toggle("modal-open", state.settingsOpen || state.helpOpen || state.importPreviewOpen);
    dom.confirmImportBtn.disabled = !!state.pendingImport?.summary.invalidRows.length;

    document.querySelectorAll(".nav-btn[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    });

    if (state.importPreviewOpen) {
      dom.importPreviewBody.innerHTML = renderImportPreview();
    }
    if (state.settingsOpen) {
      dom.settingsBody.innerHTML = renderSettingsPanel();
    }
  }

  function renderToday() {
    const meal = state.meals[state.activeMeal - 1];
    return `
      <div class="card">
        <div class="grid-2">
          <div>
            <label class="label" for="dateInput">日期</label>
            <input id="dateInput" type="date" value="${esc(state.date)}" />
          </div>
          <div>
            <label class="label" for="dayTypeInput">日类型</label>
            <select id="dayTypeInput">
              <option value="training" ${state.dayType === "training" ? "selected" : ""}>训练日</option>
              <option value="rest" ${state.dayType === "rest" ? "selected" : ""}>休息日</option>
            </select>
          </div>
        </div>
        <div style="margin-top:10px">
          <label class="label" for="bodyWeightInput">晨起体重（kg）</label>
          <input id="bodyWeightInput" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="例如 78.5" value="${esc(state.bodyWeight)}" />
        </div>
        <div class="grid-2" style="margin-top:10px">
          ${state.dayType === "training" ? `
            <div>
              <label class="label" for="trainingPerformanceInput">训练表现</label>
              <select id="trainingPerformanceInput">
                ${Object.entries(PERFORMANCE_LEVELS).map(([key, item]) => `<option value="${key}" ${state.trainingPerformance === key ? "selected" : ""}>${item.label}</option>`).join("")}
              </select>
            </div>
          ` : ""}
          <div>
            <label class="label" for="hungerLevelInput">饥饿感</label>
            <select id="hungerLevelInput">
              ${Object.entries(HUNGER_LEVELS).map(([key, item]) => `<option value="${key}" ${state.hungerLevel === key ? "selected" : ""}>${item.label}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="label" for="sleepScoreInput">睡眠评分（0-100）</label>
            <input id="sleepScoreInput" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="例如 82" value="${esc(state.sleepScore)}" />
          </div>
        </div>
      </div>
      <div class="meal-tabs" aria-label="餐次切换">
        ${state.meals.map((mealItem) => {
          const active = state.activeMeal === mealItem.id;
          return `
            <button
              class="meal-tab ${active ? "active" : ""} ${filledMeal(mealItem) ? "done" : ""}"
              type="button"
              data-meal="${mealItem.id}"
              aria-pressed="${active ? "true" : "false"}"
            >
              <div style="font-size:12px;opacity:.8">第 ${mealItem.id} 餐</div>
              <div style="margin-top:2px;font-size:14px;font-weight:750">${esc(mealItem.label)}</div>
            </button>
          `;
        }).join("")}
      </div>
      <div class="card">
        <div class="item-top" style="margin-bottom:8px">
          <div>
            <h3>${esc(meal.label)}</h3>
            <div class="small">支持一餐内多个项目分别录入；草稿会自动保存到本机。</div>
          </div>
          <button class="btn" id="saveFavBtn" type="button">存为常用</button>
        </div>
        <div class="hint-box">
          <div class="item-top">
            <span>本餐合计</span>
            <strong style="color:var(--text)" id="mealTotalCalories">0 kcal</strong>
          </div>
          <div style="margin-top:6px" class="small" id="mealTotalMacros">P 0 · C 0 · F 0</div>
        </div>
        <div style="margin-top:12px">
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px">
            <div class="label" style="margin:0">常用餐快捷带入</div>
            <div class="small">${state.favorites.length} 条</div>
          </div>
          ${state.favorites.length
            ? `<div class="favorite-select-row">
                <select id="favoriteSelect" aria-label="选择常用餐">
                  <option value="">选择常用餐</option>
                  ${state.favorites.map((favorite) => {
                    return `<option value="${favorite.id}" ${state.favoriteSelectionId === favorite.id ? "selected" : ""}>${esc(favorite.name)}</option>`;
                  }).join("")}
                </select>
                <button class="btn" id="applySelectedFavoriteBtn" type="button" ${state.favoriteSelectionId ? "" : "disabled"}>套用</button>
              </div>
              <div class="small" style="margin-top:8px">下拉选择后可直接套用到当前餐次。</div>`
            : '<div class="hint-box empty-state"><div class="empty-icon">☆</div><strong>暂无常用餐</strong><span>保存一餐后可快速套用。</span></div>'}
        </div>
        <div>${meal.entries.map((entry, entryIndex) => renderEntry(meal, entry, entryIndex)).join("")}</div>
        <div class="grid-2" style="margin-top:12px">
          <button class="btn" id="addEntryBtn" type="button">新增一项</button>
          <button class="btn dark" id="nextMealBtn" type="button">下一餐</button>
        </div>
      </div>
    `;
  }

  function renderEntry(meal, entry, entryIndex) {
    return `
      <div class="entry-card">
        <div class="entry-head">
          <div><div class="item-title">Item ${entryIndex + 1}</div></div>
          <button
            class="mini-btn danger ${meal.entries.length <= 1 ? "hidden" : ""}"
            type="button"
            data-delete-entry="${meal.id}-${entryIndex}"
            aria-label="删除 ${meal.label} 的项目 ${entryIndex + 1}"
          >删除</button>
        </div>
        <div style="margin-top:10px">
          <label class="label">名称</label>
          <input data-entry="${meal.id}-${entryIndex}-name" autocomplete="off" spellcheck="false" placeholder="例如：蛋白饮料" value="${esc(entry.name)}" />
        </div>
        <div style="margin-top:10px">
          <label class="label">kcal</label>
          <input class="big" data-entry="${meal.id}-${entryIndex}-calories" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="例如 180" value="${esc(entry.calories)}" />
        </div>
        <div class="grid-3" style="margin-top:10px">
          <div>
            <label class="label">P</label>
          <input class="big macro-input protein-input" data-entry="${meal.id}-${entryIndex}-protein" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.protein)}" />
          </div>
          <div>
            <label class="label">C</label>
            <input class="big macro-input carb-input" data-entry="${meal.id}-${entryIndex}-carbs" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.carbs)}" />
          </div>
          <div>
            <label class="label">F</label>
            <input class="big macro-input fat-input" data-entry="${meal.id}-${entryIndex}-fat" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.fat)}" />
          </div>
        </div>
        <div data-entry-preview="${meal.id}-${entryIndex}">${entryPreviewMarkup(entry)}</div>
      </div>
    `;
  }

  function renderOverview() {
    const summary = stats();
    return `
      <div class="card">
        <h3>今日总览</h3>
        <div class="stat-grid">
          <div class="stat stat-calories"><div class="k">总热量</div><div class="v">${round1(summary.totals.calories)}</div><div class="h">目标 ${target().calories} kcal</div>${progressMarkup(summary.totals.calories, target().calories, "calories")}</div>
          <div class="stat"><div class="k">总蛋白</div><div class="v">${round1(summary.totals.protein)}</div><div class="h">目标 ${target().protein} g</div>${progressMarkup(summary.totals.protein, target().protein, "protein")}</div>
          <div class="stat"><div class="k">总碳水</div><div class="v">${round1(summary.totals.carbs)}</div><div class="h">目标 ${target().carbs} g</div>${progressMarkup(summary.totals.carbs, target().carbs, "carbs")}</div>
          <div class="stat"><div class="k">总脂肪</div><div class="v">${round1(summary.totals.fat)}</div><div class="h">目标 ${target().fat} g</div>${progressMarkup(summary.totals.fat, target().fat, "fat")}</div>
        </div>
        <div class="hint-box insight-box" style="margin-top:12px">
          <div class="small">总体结论</div>
          <div class="insight-title">${summary.overall.summary}</div>
          <div class="badges" style="margin-top:10px">
            <span class="badge ${badgeTone(summary.overall.cal, "cal")}">热量 ${summary.overall.cal}</span>
            <span class="badge ${badgeTone(summary.overall.pro, "pro")}">蛋白 ${summary.overall.pro}</span>
            <span class="badge ${badgeTone(summary.overall.carb, "other")}">碳水 ${summary.overall.carb}</span>
            <span class="badge ${badgeTone(summary.overall.fat, "other")}">脂肪 ${summary.overall.fat}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>系统判断</h3>
        <div class="hint-box insight-box">
          <div class="insight-title">${summary.systemInsight.title}</div>
          <div class="small" style="margin-top:8px;line-height:1.5">${summary.systemInsight.body}</div>
        </div>
        <div class="badges" style="margin-top:10px">
          ${summary.systemInsight.badges.map((badge) => `<span class="badge ${badge.tone}">${esc(badge.text)}</span>`).join("")}
        </div>
      </div>
      <div class="card">
        <h3>近 7 天滚动平均</h3>
        <div class="small">按当前日期往前看 7 个自然日计算，目标按当天训练/休息类型折算。</div>
        <div class="small" style="margin-top:6px">当前窗口内已记录 ${summary.rolling7.coveredDays} / 7 天${summary.rolling7.latestDate ? ` · 截止 ${fmtDate(summary.rolling7.latestDate)}` : ""}</div>
        <div class="stat-grid" style="margin-top:12px">
          ${renderRollingAverageStat("热量", summary.rolling7.average.calories, summary.rolling7.target.calories, "kcal")}
          ${renderRollingAverageStat("蛋白", summary.rolling7.average.protein, summary.rolling7.target.protein, "g")}
          ${renderRollingAverageStat("碳水", summary.rolling7.average.carbs, summary.rolling7.target.carbs, "g")}
          ${renderRollingAverageStat("脂肪", summary.rolling7.average.fat, summary.rolling7.target.fat, "g")}
        </div>
      </div>
      <div class="card">
        <h3>体重趋势</h3>
        <div class="hint-box">
          <div class="item-top">
            <div>
              <div class="small">目标体重</div>
              <div style="font-size:28px;font-weight:850;color:var(--text);margin-top:4px">${summary.goalWeight} kg</div>
            </div>
            <span class="badge ${summary.currentDisplayWeight && summary.distanceToGoal <= 0 ? "ok" : "warn"}">
              ${summary.currentDisplayWeight ? `当前 ${summary.currentDisplayWeight} kg` : "等待体重数据"}
            </span>
          </div>
          <div class="small" style="margin-top:10px">折线显示最近 14 次记录，虚线表示目标体重。</div>
          ${renderWeightTrendChart(summary)}
        </div>
        <div class="stat-grid">
          <div class="stat"><div class="k">今日体重</div><div class="v">${state.bodyWeight || "—"}</div><div class="h">kg</div></div>
          <div class="stat"><div class="k">近 7 次均重</div><div class="v">${summary.recent7Count ? summary.recent7Avg : "—"}</div><div class="h">${summary.recent7Count ? `已纳入 ${summary.recent7Count} 次记录` : "先连续记录几天"}</div></div>
          <div class="stat"><div class="k">相较前 7 次变化</div><div class="v">${summary.prev7Avg ? `${summary.recent7Avg - summary.prev7Avg > 0 ? "+" : ""}${round1(summary.recent7Avg - summary.prev7Avg)}` : "—"}</div><div class="h">${summary.prev7Avg ? `前 7 次均重 ${summary.prev7Avg} kg` : "需要至少 8 次记录"}</div></div>
          <div class="stat"><div class="k">倒计时</div><div class="v">${daysLeft()}</div><div class="h">天，目标日期 ${currentSettings().targetDate}</div></div>
        </div>
        <div class="hint-box" style="margin-top:12px">
          <div class="item-top">
            <div>
              <div class="small">距离目标体重</div>
              <div style="font-size:22px;font-weight:800;color:var(--text);margin-top:4px">${summary.currentDisplayWeight ? `${Math.max(0, summary.distanceToGoal)} kg` : "数据不足"}</div>
            </div>
            <span class="badge ${summary.currentDisplayWeight && summary.distanceToGoal <= 0 ? "ok" : ""}">目标 ${summary.goalWeight} kg</span>
          </div>
          <div style="margin-top:12px" class="bar"><div style="width:${summary.goalProgress}%"></div></div>
          <div class="row" style="justify-content:space-between;margin-top:8px;font-size:12px;color:var(--muted)">
            <span>起点 ${summary.firstLoggedWeight ? `${summary.firstLoggedWeight} kg` : "--"}</span>
            <span>当前 ${summary.currentDisplayWeight ? `${summary.currentDisplayWeight} kg` : "--"}</span>
            <span>目标 ${summary.goalWeight} kg</span>
          </div>
        </div>
      </div>
      <div class="card">
        <h3>7 天执行质量</h3>
        <div class="stat-grid">
          <div class="stat"><div class="k">记录完整度</div><div class="v">${summary.execution7.completeDays}/7</div><div class="h">有饮食记录的天数</div></div>
          <div class="stat"><div class="k">平均睡眠</div><div class="v">${summary.execution7.avgSleep || "—"}</div><div class="h">${summary.execution7.sleepDays ? `来自 ${summary.execution7.sleepDays} 天评分` : "未记录睡眠"}</div></div>
          <div class="stat"><div class="k">高饥饿</div><div class="v">${summary.execution7.highHungerDays}</div><div class="h">过去 7 天</div></div>
          <div class="stat"><div class="k">训练表现</div><div class="v">${summary.execution7.goodTrainingDays}/${summary.execution7.trainingDays}</div><div class="h">很好 / 训练日</div></div>
        </div>
      </div>
      ${summary.anomalies.length ? `
        <div class="card danger-card">
          <h3>数据异常提醒</h3>
          <div class="list">${summary.anomalies.map((item) => `<div class="warn-box">${esc(item)}</div>`).join("")}</div>
        </div>
      ` : ""}
    `;
  }

  function renderHistory() {
    const historyDates = getFilteredHistoryDates();
    const favoriteList = getFilteredFavorites();
    return `
      <div class="card">
        <h3>历史记录</h3>
        <div class="history-toolbar">
          <div class="grid-2">
            <button class="btn" id="exportAllBtn" type="button">导出全部</button>
            <button class="btn" id="importCsvBtn" type="button">导入 CSV</button>
          </div>
          <div class="hint-box">仅支持导入“导出全部”生成的 CSV；导入前会预览冲突日期。</div>
          <div class="grid-2">
            <div>
              <label class="label" for="historyDateFilter">按日期跳转</label>
              <input id="historyDateFilter" type="date" value="${esc(state.historyDateFilter)}" />
            </div>
            <div>
              <label class="label" for="historyDayTypeFilter">按类型筛选</label>
              <select id="historyDayTypeFilter">
                <option value="all" ${state.historyDayTypeFilter === "all" ? "selected" : ""}>全部</option>
                <option value="training" ${state.historyDayTypeFilter === "training" ? "selected" : ""}>训练日</option>
                <option value="rest" ${state.historyDayTypeFilter === "rest" ? "selected" : ""}>休息日</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label" for="historySearchInput">快速搜索</label>
            <input id="historySearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="搜索日期、体重或训练/休息日" value="${esc(state.historySearchText)}" />
          </div>
          <div class="small">当前显示 ${historyDates.length} 条记录。</div>
        </div>
        <div class="list compact-list" style="margin-top:12px">
          ${historyDates.length
            ? historyDates.map((date) => renderHistoryItem(date)).join("")
            : `<div class="hint-box">${Object.keys(state.records).length ? "没有符合当前筛选条件的历史记录。" : "还没有历史记录。先保存几天数据，这里会自动生成日期列表。"}</div>`}
        </div>
      </div>
      <div class="card">
        <h3>常用餐（可编辑）</h3>
        <div class="history-toolbar">
          <div>
            <label class="label" for="favoriteSearchInput">搜索常用餐</label>
            <input id="favoriteSearchInput" type="search" autocomplete="off" spellcheck="false" placeholder="按名称搜索常用餐" value="${esc(state.favoriteSearchText)}" />
          </div>
          <div class="small">按使用次数和最近使用排序，当前显示 ${favoriteList.length} 条。</div>
        </div>
        <div class="list compact-list">
          ${favoriteList.length
            ? favoriteList.map((favorite) => {
              return state.editingFavId === favorite.id ? renderFavoriteEditor(favorite) : renderFavoriteItem(favorite);
            }).join("")
            : `<div class="hint-box">${state.favorites.length ? "没有符合搜索条件的常用餐。" : "暂无常用餐。先在“今天”页面录一餐，再点“存为常用”。"}</div>`}
        </div>
      </div>
    `;
  }

  function renderHistoryItem(date) {
    const record = state.records[date];
    const totals = record.totals || mealTotals({ entries: [] });
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <div class="item-title">${fmtDate(date)}</div>
            <div class="item-sub">${record.dayType === "training" ? "训练日" : "休息日"} · ${round1(totals.calories || 0)} kcal · ${record.bodyWeight ? `${record.bodyWeight} kg` : "未填体重"}</div>
            <div class="small" style="margin-top:6px">${record.savedAt ? `保存于 ${fmtDateTime(record.savedAt)}` : "无保存时间"} · 共 ${record.meals.reduce((sum, meal) => sum + meal.entries.filter(entryStarted).length, 0)} 项</div>
            <div class="small" style="margin-top:6px">饥饿 ${HUNGER_LEVELS[record.hungerLevel]?.label || "中"}${record.dayType === "training" ? ` · 训练 ${PERFORMANCE_LEVELS[record.trainingPerformance]?.label || "正常"}` : ""}${record.sleepScore ? ` · 睡眠 ${record.sleepScore}` : ""}</div>
          </div>
        </div>
        <div class="item-actions">
          <button class="mini-btn" type="button" data-load-date="${date}" aria-label="打开 ${fmtDate(date)} 的记录">打开</button>
          <button class="mini-btn danger" type="button" data-delete-record="${date}" aria-label="删除 ${fmtDate(date)} 的记录">删除</button>
        </div>
      </div>
    `;
  }

  function renderFavoriteItem(favorite) {
    const totals = favoriteTotals(favorite);
    return `
      <div class="item">
        <div class="item-top">
          <div>
            <div class="item-title">${esc(favorite.name)}</div>
            <div class="item-sub">${round1(totals.calories)} kcal · P ${round1(totals.protein)} · C ${round1(totals.carbs)} · F ${round1(totals.fat)}</div>
            <div class="small" style="margin-top:6px">${favorite.entries.length} 项食物 · 已使用 ${favorite.usageCount || 0} 次${favorite.lastUsedAt ? ` · 最近使用 ${fmtDateTime(favorite.lastUsedAt)}` : ""}</div>
          </div>
        </div>
        <div class="item-actions">
          <button class="mini-btn" type="button" data-apply-favorite="${favorite.id}">套用</button>
          <button class="mini-btn" type="button" data-edit-favorite="${favorite.id}">编辑</button>
          <button class="mini-btn danger" type="button" data-delete-favorite="${favorite.id}">删除</button>
        </div>
      </div>
    `;
  }

  function renderFavoriteEditor(favorite) {
    return `
      <div class="item">
        <div class="grid-2">
          <div>
            <label class="label" for="favAliasInput">常用餐名称</label>
            <input id="favAliasInput" autocomplete="off" spellcheck="false" value="${esc(state.favoriteDraft.name)}" />
          </div>
          <div class="hint-box">
            <div class="small">当前汇总</div>
            <div style="font-size:18px;font-weight:800;color:var(--text)" id="favoriteDraftSummary">0 kcal</div>
            <div class="small" id="favoriteDraftMacros">P 0 · C 0 · F 0</div>
          </div>
        </div>
        <div class="list" style="margin-top:12px">
          ${state.favoriteDraft.entries.map((entry, entryIndex) => renderFavoriteDraftEntry(entry, entryIndex)).join("")}
        </div>
        <div class="item-actions">
          <button class="btn" id="addFavEntryBtn" type="button">新增食物项</button>
          <button class="btn dark" id="saveEditedFavBtn" type="button">保存</button>
          <button class="mini-btn" id="cancelEditFavBtn" type="button">取消</button>
          <button class="mini-btn danger" type="button" data-delete-favorite="${favorite.id}">删除</button>
        </div>
      </div>
    `;
  }

  function renderFavoriteDraftEntry(entry, entryIndex) {
    return `
      <div class="entry-card compact">
        <div class="entry-head">
          <div><div class="item-title">食物项 ${entryIndex + 1}</div></div>
          <button
            class="mini-btn danger ${state.favoriteDraft.entries.length <= 1 ? "hidden" : ""}"
            type="button"
            data-delete-favorite-entry="${entryIndex}"
            aria-label="删除常用餐食物项 ${entryIndex + 1}"
          >删除</button>
        </div>
        <div style="margin-top:10px">
          <label class="label">名称</label>
          <input data-favorite-entry="${entryIndex}-name" autocomplete="off" spellcheck="false" placeholder="例如：鸡胸肉" value="${esc(entry.name)}" />
        </div>
        <div style="margin-top:10px">
          <label class="label">kcal</label>
          <input class="big" data-favorite-entry="${entryIndex}-calories" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="例如 250" value="${esc(entry.calories)}" />
        </div>
        <div class="grid-3" style="margin-top:10px">
          <div>
            <label class="label">P</label>
            <input class="big" data-favorite-entry="${entryIndex}-protein" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.protein)}" />
          </div>
          <div>
            <label class="label">C</label>
            <input class="big" data-favorite-entry="${entryIndex}-carbs" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.carbs)}" />
          </div>
          <div>
            <label class="label">F</label>
            <input class="big" data-favorite-entry="${entryIndex}-fat" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="g" value="${esc(entry.fat)}" />
          </div>
        </div>
        <div data-favorite-preview="${entryIndex}">${entryPreviewMarkup(entry)}</div>
      </div>
    `;
  }

  function renderSettingsPanel() {
    const draft = state.settingsDraft || currentSettings();
    const settings = normalizeSettings(draft);
    return `
      <div class="settings-section">
        <h4>身体与目标</h4>
        <div class="settings-grid">
          ${renderSettingInput("BMR", "bmr", draft.bmr, "decimal")}
          ${renderSettingInput("当前体重 kg", "currentWeightKg", draft.currentWeightKg, "decimal")}
          ${renderSettingInput("目标体重 kg", "targetWeightKg", draft.targetWeightKg, "decimal")}
          ${renderSettingInput("目标体脂 %", "targetBodyFatPercent", draft.targetBodyFatPercent, "decimal")}
          ${renderSettingInput("目标日期", "targetDate", draft.targetDate, "date")}
          ${renderSettingInput("每周训练天数", "trainingDaysPerWeek", settings.trainingDaysPerWeek, "number")}
        </div>
      </div>
      <div class="settings-section">
        <h4>策略</h4>
        <div class="settings-grid">
          <div>
            <label class="label" for="setting-goalMode">目标模式</label>
            <select id="setting-goalMode" data-setting="goalMode">
              ${Object.entries(GOAL_MODE_CONFIG).map(([key, value]) => `<option value="${key}" ${settings.goalMode === key ? "selected" : ""}>${value.label} · ${value.description}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="label" for="setting-activityLevel">日常活动水平</label>
            <select id="setting-activityLevel" data-setting="activityLevel">
              ${Object.entries(ACTIVITY_LEVEL_CONFIG).map(([key, value]) => `<option value="${key}" ${settings.activityLevel === key ? "selected" : ""}>${value.label} · ${value.description}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="label" for="setting-trackingAccuracyBuffer">记录误差缓冲</label>
            <select id="setting-trackingAccuracyBuffer" data-setting="trackingAccuracyBuffer">
              ${Object.entries(TRACKING_BUFFER_CONFIG).map(([key, value]) => `<option value="${key}" ${settings.trackingAccuracyBuffer === key ? "selected" : ""}>${value.label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="hint-box" style="margin-top:10px">系统会自动估算 activity factor、蛋白、脂肪、训练日加成；每日只需要选择当天是训练日还是休息日。</div>
      </div>
      <div class="settings-section">
        <h4>系统计算预览</h4>
        <div id="settingsPreviewBody">${renderSettingsPreview(draft)}</div>
      </div>
    `;
  }

  function renderSettingInput(label, key, value, type) {
    const inputType = type === "date" ? "date" : "text";
    const inputMode = type === "date" ? "" : ` inputmode="${type === "number" ? "numeric" : "decimal"}"`;
    return `
      <div>
        <label class="label" for="setting-${key}">${esc(label)}</label>
        <input id="setting-${key}" type="${inputType}"${inputMode} data-setting="${key}" autocomplete="off" spellcheck="false" value="${esc(value ?? "")}" />
      </div>
    `;
  }

  function renderSettingsPreview(draft) {
    const preview = computeSettingsPreview(draft, { includeTrend: true });
    return `
      <div class="stat-grid">
        <div class="stat"><div class="k">TDEE</div><div class="v">${preview.tdee}</div><div class="h">activity factor ${preview.activityFactor}</div></div>
        <div class="stat"><div class="k">总缺口</div><div class="v">${preview.totalDeficit}</div><div class="h">kcal</div></div>
        <div class="stat"><div class="k">剩余天数</div><div class="v">${preview.daysRemaining}</div><div class="h">从明天到目标日</div></div>
        <div class="stat"><div class="k">计划日缺口</div><div class="v">${preview.plannedDailyDeficit}</div><div class="h">kcal/day</div></div>
      </div>
      <div class="stat-grid" style="margin-top:10px">
        <div class="stat"><div class="k">平均热量</div><div class="v">${preview.finalAverageCalories}</div><div class="h">含误差缓冲</div></div>
        <div class="stat"><div class="k">训练日</div><div class="v">${preview.trainingCalories}</div><div class="h">P ${preview.proteinTarget} · C ${preview.trainingCarbs} · F ${preview.fatTarget}</div></div>
        <div class="stat"><div class="k">休息日</div><div class="v">${preview.restCalories}</div><div class="h">P ${preview.proteinTarget} · C ${preview.restCarbs} · F ${preview.fatTarget}</div></div>
        <div class="stat"><div class="k">目标瘦体重</div><div class="v">${preview.targetLeanMass}</div><div class="h">kg</div></div>
      </div>
      <div class="hint-box" style="margin-top:10px">自动参数：蛋白 ${preview.proteinMultiplier} g/kg · 脂肪 ${preview.fatMultiplier} g/kg · 训练日加成 ${preview.effectiveBoost} kcal</div>
      ${preview.trend?.current7DayAvg ? `
        <div class="hint-box" style="margin-top:10px">
          <div class="small">14 天趋势</div>
          <div style="margin-top:4px;color:var(--text);font-weight:700">前 7 天 ${preview.trend.previous7DayAvg} kg → 近 7 天 ${preview.trend.current7DayAvg} kg</div>
          <div class="small" style="margin-top:4px">实际变化 ${preview.trend.actualChange} kg；计划变化 ${preview.trend.expectedChange} kg</div>
        </div>
      ` : ""}
      ${preview.warnings.length ? `
        <div class="list" style="margin-top:10px">
          ${preview.warnings.map((warning) => `<div class="warn-box">${esc(warning)}</div>`).join("")}
        </div>
      ` : '<div class="hint-box" style="margin-top:10px">当前设置可生成未来目标。</div>'}
    `;
  }

  function renderImportPreview() {
    if (!state.pendingImport) {
      return "";
    }
    const summary = state.pendingImport.summary;
    const blocks = [
      `<div class="step">本次将导入 <strong>${summary.totalRows}</strong> 行记录数据，涉及 <strong>${summary.totalDates}</strong> 个日期；另含 <strong>${summary.favoriteRows || 0}</strong> 行常用餐数据，涉及 <strong>${summary.totalFavorites || 0}</strong> 个常用餐。</div>`,
      `<div class="step">记录新增日期：<strong>${summary.newDates.length}</strong> 个；覆盖已有记录：<strong>${summary.collisions.length}</strong> 个；内容相同无需更新：<strong>${summary.unchangedDates.length}</strong> 个。</div>`
    ];

    if ((summary.totalFavorites || 0) > 0) {
      blocks.push(`<div class="step">常用餐新增：<strong>${summary.favoriteNew.length}</strong> 个；覆盖已有常用餐：<strong>${summary.favoriteCollisions.length}</strong> 个；内容相同无需更新：<strong>${summary.favoriteUnchanged.length}</strong> 个。</div>`);
    }

    if (summary.collisions.length) {
      blocks.push(`
        <div class="step">
          以下日期已有记录，确认后会整天替换：
          <ul class="preview-list">
            ${summary.collisions.slice(0, 8).map((date) => `<li>${fmtDate(date)}</li>`).join("")}
            ${summary.collisions.length > 8 ? `<li>以及另外 ${summary.collisions.length - 8} 个日期</li>` : ""}
          </ul>
        </div>
      `);
    }

    if (summary.favoriteCollisions.length) {
      blocks.push(`
        <div class="step">
          以下常用餐已存在，确认后会整体替换：
          <ul class="preview-list">
            ${summary.favoriteCollisions.slice(0, 8).map((name) => `<li>${esc(name)}</li>`).join("")}
            ${summary.favoriteCollisions.length > 8 ? `<li>以及另外 ${summary.favoriteCollisions.length - 8} 个常用餐</li>` : ""}
          </ul>
        </div>
      `);
    }

    if (summary.invalidRows.length) {
      blocks.push(`
        <div class="step">
          以下行已判定为无效并阻止导入：
          <ul class="preview-list">
            ${summary.invalidRows.slice(0, 5).map((item) => `<li>第 ${item.rowNumber} 行：${esc(item.reason)}</li>`).join("")}
          </ul>
        </div>
      `);
    }

    blocks.push('<div class="step">导入不会修改目标设定；如导入覆盖当前日期，当前日期的未保存草稿也会一并清除。旧版 CSV 缺少训练表现、饥饿感、睡眠评分时会自动按默认值导入。</div>');
    return blocks.join("");
  }

  function refreshTodayLiveBits() {
    if (state.view !== "today") {
      return;
    }
    const meal = state.meals[state.activeMeal - 1];
    const totals = mealTotals(meal);
    const caloriesNode = document.getElementById("mealTotalCalories");
    const macroNode = document.getElementById("mealTotalMacros");
    if (caloriesNode) {
      caloriesNode.textContent = `${round1(totals.calories)} kcal`;
    }
    if (macroNode) {
      macroNode.textContent = `P ${round1(totals.protein)} · C ${round1(totals.carbs)} · F ${round1(totals.fat)}`;
    }
    meal.entries.forEach((entry, index) => {
      const preview = document.querySelector(`[data-entry-preview="${meal.id}-${index}"]`);
      if (preview) {
        preview.innerHTML = entryPreviewMarkup(entry);
      }
    });
  }

  function refreshFavoriteDraftLiveBits() {
    if (state.view !== "history" || !state.favoriteDraft) {
      return;
    }
    const totals = favoriteTotals(state.favoriteDraft);
    const summaryNode = document.getElementById("favoriteDraftSummary");
    const macroNode = document.getElementById("favoriteDraftMacros");
    if (summaryNode) {
      summaryNode.textContent = `${round1(totals.calories)} kcal`;
    }
    if (macroNode) {
      macroNode.textContent = `P ${round1(totals.protein)} · C ${round1(totals.carbs)} · F ${round1(totals.fat)}`;
    }
    state.favoriteDraft.entries.forEach((entry, index) => {
      const preview = document.querySelector(`[data-favorite-preview="${index}"]`);
      if (preview) {
        preview.innerHTML = entryPreviewMarkup(entry);
      }
    });
  }

  function entryPreviewMarkup(entry) {
    const diff = round1(numberValue(entry.calories) - entryMacroCalories(entry));
    const bad = numberValue(entry.calories) > 0 && Math.abs(diff) > 80;
    return `
      <div class="${bad ? "warn-box" : "hint-box"}" style="margin-top:10px">
        <div class="item-top"><span>由 macro 推算</span><strong style="color:var(--text)">${round1(entryMacroCalories(entry))} kcal</strong></div>
        <div class="item-top" style="margin-top:6px"><span>差异</span><strong>${diff > 0 ? "+" : ""}${diff} kcal</strong></div>
        ${bad ? '<div style="margin-top:8px;font-size:12px">这项热量差异较大，建议复核包装或录入。</div>' : ""}
      </div>
    `;
  }

  async function switchDate(date) {
    if (!date || date === state.date) {
      return;
    }
    if (hasUnsavedFormalChanges()) {
      const shouldLeave = window.confirm("当前日期还有未正式保存的修改。草稿虽已自动保存，但仍建议确认后再切换日期。确定继续吗？");
      if (!shouldLeave) {
        return;
      }
    }
    await flushDraftSave();
    state.date = date;
    state.activeMeal = 1;
    await hydrateCurrentDate({ announce: true });
  }

  async function hydrateCurrentDate(options = {}) {
    const record = state.records[state.date];
    const draft = normalizeDraft(await storage.getDraft(state.date));

    if (draft && shouldRestoreDraft(draft, record)) {
      applyDayData(draft);
      state.lastDraftSavedAt = draft.updatedAt || "";
      state.lastSavedAt = record?.savedAt || "";
      state.dirty = true;
      if (options.announce) {
        setNotice(`已恢复 ${fmtDate(state.date)} 的未保存草稿`, { tone: "ok" });
      }
      render();
      return;
    }

    if (draft && record && sameDayData(draft, record)) {
      await storage.deleteDraft(state.date);
    }

    if (record) {
      applyDayData(record);
      state.lastSavedAt = record.savedAt || "";
      state.lastDraftSavedAt = "";
      state.dirty = false;
      render();
      return;
    }

    state.dayType = state.dailyTargets[state.date]?.dayType
      || (state.settings?.settingsVersion ? dayTypeForDate(currentSettings(), state.date) : DEFAULT_DAY_TYPE);
    state.bodyWeight = "";
    state.trainingPerformance = "normal";
    state.hungerLevel = "medium";
    state.sleepScore = "";
    state.meals = mealTemplate();
    state.lastSavedAt = "";
    state.lastDraftSavedAt = "";
    state.dirty = false;
    render();
  }

  function applyDayData(data) {
    state.dayType = data.dayType === "rest" ? "rest" : "training";
    state.bodyWeight = normalizeLooseNumericText(data.bodyWeight);
    state.trainingPerformance = normalizeTrainingPerformance(data.trainingPerformance);
    state.hungerLevel = normalizeHungerLevel(data.hungerLevel);
    state.sleepScore = normalizeSleepScore(data.sleepScore);
    state.meals = normalizeMeals(data.meals);
  }

  function startEditFavorite(id) {
    const favorite = state.favorites.find((item) => item.id === id);
    if (!favorite) {
      return;
    }
    state.editingFavId = id;
    state.favoriteDraft = {
      name: favorite.name,
      entries: favorite.entries.map((entry) => normalizeEntry(entry))
    };
    render();
  }

  function addFavoriteDraftEntry() {
    if (!state.favoriteDraft) {
      return;
    }
    state.favoriteDraft.entries.push(makeEntry());
    render();
  }

  function deleteFavoriteDraftEntry(index) {
    if (!state.favoriteDraft) {
      return;
    }
    if (state.favoriteDraft.entries.length <= 1) {
      state.favoriteDraft.entries = [makeEntry()];
    } else {
      state.favoriteDraft.entries.splice(index, 1);
    }
    render();
  }

  async function saveEditedFavorite() {
    if (!state.favoriteDraft || !state.editingFavId) {
      return;
    }
    const validation = validateFavoriteDraft(state.favoriteDraft);
    if (!validation.valid) {
      setNotice(validation.message, { tone: "warn" });
      focusField(validation.selector);
      return;
    }
    const favorite = normalizeFavorite({
      id: state.editingFavId,
      name: state.favoriteDraft.name.trim(),
      entries: state.favoriteDraft.entries,
      usageCount: state.favorites.find((item) => item.id === state.editingFavId)?.usageCount,
      lastUsedAt: state.favorites.find((item) => item.id === state.editingFavId)?.lastUsedAt,
      updatedAt: nowIso()
    });
    await storage.putFavorite(favorite);
    state.favorites = [favorite, ...state.favorites.filter((item) => item.id !== favorite.id)]
      .slice(0, MAX_FAVORITES)
      .sort(sortFavorites);
    state.editingFavId = null;
    state.favoriteDraft = null;
    render();
    setNotice("已更新", { tone: "ok" });
  }

  async function deleteFavorite(id) {
    await storage.deleteFavorite(id);
    state.favorites = state.favorites.filter((favorite) => favorite.id !== id);
    if (state.favoriteSelectionId === id) {
      state.favoriteSelectionId = "";
    }
    if (state.editingFavId === id) {
      state.editingFavId = null;
      state.favoriteDraft = null;
    }
    render();
    setNotice("已删除", { tone: "ok" });
  }

  async function saveFavoriteFromActive() {
    const meal = state.meals[state.activeMeal - 1];
    const startedEntries = meal.entries.filter(entryStarted).map((entry) => normalizeEntry(entry));
    if (!startedEntries.length) {
      setNotice("当前这餐还没有可保存的数据", { tone: "warn" });
      return;
    }
    const validation = validateEntries(startedEntries, { prefix: `${meal.label} · `, selectorPrefix: `data-entry="${meal.id}` });
    if (!validation.valid) {
      setNotice(validation.message, { tone: "warn" });
      focusField(validation.selector);
      return;
    }
    const nameCandidate = startedEntries.map((entry) => entry.name.trim()).join(" + ");
    const existing = state.favorites.find((favorite) => favorite.name === nameCandidate);
    const favorite = normalizeFavorite({
      id: existing?.id,
      name: nameCandidate,
      entries: startedEntries,
      createdAt: existing?.createdAt,
      usageCount: existing?.usageCount,
      lastUsedAt: existing?.lastUsedAt,
      updatedAt: nowIso()
    });
    await storage.putFavorite(favorite);
    state.favorites = [favorite, ...state.favorites.filter((item) => item.id !== favorite.id)]
      .slice(0, MAX_FAVORITES)
      .sort(sortFavorites);
    render();
    setNotice("已保存常用餐", { tone: "ok" });
  }

  async function applyFavorite(id) {
    const existing = state.favorites.find((item) => item.id === id);
    const favorite = existing ? normalizeFavorite({
      ...existing,
      usageCount: (existing.usageCount || 0) + 1,
      lastUsedAt: nowIso()
    }) : null;
    if (!favorite) {
      return;
    }
    await storage.putFavorite(favorite);
    state.favorites = [favorite, ...state.favorites.filter((item) => item.id !== favorite.id)].sort(sortFavorites);
    state.meals[state.activeMeal - 1].entries = favorite.entries.map((entry) => normalizeEntry(entry));
    markDirty();
    render();
    setNotice("已套用", { tone: "ok" });
  }

  function addEntryToActiveMeal() {
    state.meals[state.activeMeal - 1].entries.push(makeEntry());
    markDirty();
    render();
  }

  function deleteEntry(mealId, entryIndex) {
    const meal = state.meals[mealId - 1];
    if (!meal) {
      return;
    }
    if (meal.entries.length <= 1) {
      meal.entries = [makeEntry()];
    } else {
      meal.entries.splice(entryIndex, 1);
    }
    markDirty();
    render();
  }

  async function saveDay() {
    const validation = validateDay();
    if (!validation.valid) {
      setNotice(validation.message, { tone: "warn" });
      focusField(validation.selector);
      return;
    }

    const record = currentRecord();
    const saved = state.records[state.date];
    if (saved && !sameDayData(record, saved)) {
      const shouldOverwrite = window.confirm(`你正在修改 ${fmtDate(state.date)} 已保存过的内容。确定覆盖保存吗？`);
      if (!shouldOverwrite) {
        return;
      }
    }

    await storage.putRecord(record);
    await storage.deleteDraft(state.date);
    state.records[state.date] = record;
    state.lastSavedAt = record.savedAt;
    state.lastDraftSavedAt = "";
    state.dirty = false;
    renderHeader();
    setNotice("已保存", { tone: "ok" });
  }

  async function deleteRecord(date) {
    const confirmed = window.confirm(`确定删除 ${fmtDate(date)} 的记录吗？此操作不能撤销。`);
    if (!confirmed) {
      return;
    }
    await storage.deleteRecord(date);
    await storage.deleteDraft(date);
    delete state.records[date];
    if (state.date === date) {
      state.dayType = DEFAULT_DAY_TYPE;
      state.bodyWeight = "";
      state.trainingPerformance = "normal";
      state.hungerLevel = "medium";
      state.sleepScore = "";
      state.meals = mealTemplate();
      state.activeMeal = 1;
      state.dirty = false;
      state.lastSavedAt = "";
      state.lastDraftSavedAt = "";
      render();
    } else {
      render();
    }
    setNotice("已删除", { tone: "ok" });
  }

  function exportAll() {
    const rows = [EXPORT_HEADER];
    Object.keys(state.records).sort().forEach((date) => {
      const record = normalizeRecord(state.records[date]);
      record.meals.forEach((meal, mealIndex) => {
        meal.entries.forEach((entry, entryIndex) => {
          rows.push([
            date,
            record.dayType,
            record.bodyWeight,
            mealIndex + 1,
            entryIndex + 1,
            entry.name,
            entry.calories,
            entry.protein,
            entry.carbs,
            entry.fat,
            record.trainingPerformance,
            record.hungerLevel,
            record.sleepScore
          ]);
        });
      });
    });
    rows.push([FAVORITE_SECTION_MARKER]);
    rows.push(FAVORITE_EXPORT_HEADER);
    state.favorites
      .map((favorite) => normalizeFavorite(favorite))
      .sort(sortFavorites)
      .forEach((favorite) => {
        favorite.entries
          .map((entry) => normalizeEntry(entry))
          .filter(entryStarted)
          .forEach((entry, entryIndex) => {
            rows.push([
              favorite.id,
              favorite.name,
              entryIndex + 1,
              entry.name,
              entry.calories,
              entry.protein,
              entry.carbs,
              entry.fat,
              favorite.usageCount || 0,
              favorite.lastUsedAt || "",
              favorite.updatedAt || "",
              favorite.createdAt || ""
            ]);
          });
      });
    exportCsv(rows, `macro-tracker-all-records-v${APP_VERSION}-${exportTimestamp()}.csv`);
    setNotice("已导出", { tone: "ok" });
  }

  function prepareImportPreview(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setNotice("CSV 内容为空或格式不对", { tone: "warn" });
      return;
    }
    rows[0][0] = String(rows[0][0] || "").replace(/^\ufeff/, "");
    const favoriteMarkerIndex = rows.findIndex((row, index) => index > 0 && row.length === 1 && row[0] === FAVORITE_SECTION_MARKER);
    const recordRows = favoriteMarkerIndex >= 0 ? rows.slice(0, favoriteMarkerIndex) : rows;
    const favoriteRows = favoriteMarkerIndex >= 0 ? rows.slice(favoriteMarkerIndex + 1) : [];
    const recordHeader = recordRows[0] || [];
    const header = recordHeader.join("|");
    const headerIsCurrent = header === EXPORT_HEADER.join("|");
    const headerIsLegacy = header === LEGACY_EXPORT_HEADER.join("|");
    if (!headerIsCurrent && !headerIsLegacy) {
      setNotice("CSV 表头不匹配，请导入“导出全部”生成的文件", { tone: "warn" });
      return;
    }
    const recordColumnIndex = Object.fromEntries(recordHeader.map((name, index) => [name, index]));
    if (favoriteRows.length) {
      const favoriteHeader = (favoriteRows[0] || []).join("|");
      if (favoriteHeader !== FAVORITE_EXPORT_HEADER.join("|")) {
        setNotice("CSV 中的常用餐区块表头不匹配，请重新导出后再导入", { tone: "warn" });
        return;
      }
    }

    const candidateRecords = {};
    const candidateFavorites = new Map();
    const invalidRows = [];

    recordRows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;
      const date = row[recordColumnIndex.date] || "";
      const dayType = row[recordColumnIndex.dayType] || "";
      const bodyWeight = row[recordColumnIndex.bodyWeight] || "";
      const mealText = row[recordColumnIndex.meal] || "";
      const itemText = row[recordColumnIndex.item] || "";
      const name = row[recordColumnIndex.name] || "";
      const calories = row[recordColumnIndex.calories] || "";
      const protein = row[recordColumnIndex.protein] || "";
      const carbs = row[recordColumnIndex.carbs] || "";
      const fat = row[recordColumnIndex.fat] || "";
      const trainingPerformance = row[recordColumnIndex.trainingPerformance] || "";
      const hungerLevel = row[recordColumnIndex.hungerLevel] || "";
      const sleepScore = row[recordColumnIndex.sleepScore] || "";
      if (!date) {
        invalidRows.push({ rowNumber, reason: "缺少日期" });
        return;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        invalidRows.push({ rowNumber, reason: "日期格式必须为 YYYY-MM-DD" });
        return;
      }
      const mealIndex = Number(mealText);
      const itemIndex = Number(itemText);
      if (bodyWeight) {
        const weightValidation = validateNumericText(bodyWeight, NUMERIC_RULES.bodyWeight, "晨起体重");
        if (!weightValidation.valid) {
          invalidRows.push({ rowNumber, reason: weightValidation.message });
          return;
        }
      }
      if (sleepScore) {
        const sleepScoreNumber = Number(normalizeLooseNumericText(sleepScore));
        if (!Number.isFinite(sleepScoreNumber) || sleepScoreNumber < 0 || sleepScoreNumber > 100) {
          invalidRows.push({ rowNumber, reason: "sleepScore 必须是 0 到 100 的数字" });
          return;
        }
      }
      if (!Number.isInteger(mealIndex) || mealIndex < 1 || mealIndex > MEAL_LABELS.length) {
        invalidRows.push({ rowNumber, reason: "meal 列必须是 1 到 4 的整数" });
        return;
      }
      if (!Number.isInteger(itemIndex) || itemIndex < 1) {
        invalidRows.push({ rowNumber, reason: "item 列必须是大于等于 1 的整数" });
        return;
      }
      const entry = normalizeEntry({ name, calories, protein, carbs, fat });
      const entryValidation = validateEntries([entry], { prefix: `第 ${rowNumber} 行 · ` });
      if (!entryValidation.valid) {
        invalidRows.push({ rowNumber, reason: entryValidation.message.replace(`第 ${rowNumber} 行 · `, "") });
        return;
      }
      if (!candidateRecords[date]) {
        candidateRecords[date] = normalizeRecord({
          date,
          dayType: dayType === "rest" ? "rest" : "training",
          bodyWeight,
          trainingPerformance,
          hungerLevel,
          sleepScore,
          meals: mealTemplate()
        });
      }
      const entries = candidateRecords[date].meals[mealIndex - 1].entries;
      while (entries.length < itemIndex) {
        entries.push(makeEntry());
      }
      entries[itemIndex - 1] = entry;
      candidateRecords[date].dayType = dayType === "rest" ? "rest" : candidateRecords[date].dayType;
      candidateRecords[date].bodyWeight = bodyWeight ? normalizeLooseNumericText(bodyWeight) : candidateRecords[date].bodyWeight;
      candidateRecords[date].trainingPerformance = trainingPerformance
        ? normalizeTrainingPerformance(trainingPerformance)
        : candidateRecords[date].trainingPerformance;
      candidateRecords[date].hungerLevel = hungerLevel
        ? normalizeHungerLevel(hungerLevel)
        : candidateRecords[date].hungerLevel;
      candidateRecords[date].sleepScore = sleepScore
        ? normalizeSleepScore(sleepScore)
        : candidateRecords[date].sleepScore;
    });

    if (!invalidRows.length && favoriteRows.length > 1) {
      favoriteRows.slice(1).forEach((row, index) => {
        const rowNumber = favoriteMarkerIndex + index + 3;
        const [
          favoriteId,
          favoriteName,
          entryText,
          name,
          calories,
          protein,
          carbs,
          fat,
          usageCountText,
          lastUsedAt,
          updatedAt,
          createdAt
        ] = row;

        if (!favoriteId) {
          invalidRows.push({ rowNumber, reason: "常用餐区块缺少 favoriteId" });
          return;
        }
        if (!favoriteName || !String(favoriteName).trim()) {
          invalidRows.push({ rowNumber, reason: "常用餐区块缺少 favoriteName" });
          return;
        }
        const entryIndex = Number(entryText);
        if (!Number.isInteger(entryIndex) || entryIndex < 1) {
          invalidRows.push({ rowNumber, reason: "常用餐区块的 entry 列必须是大于等于 1 的整数" });
          return;
        }
        if (usageCountText !== "") {
          const usageCount = Number(usageCountText);
          if (!Number.isInteger(usageCount) || usageCount < 0) {
            invalidRows.push({ rowNumber, reason: "常用餐区块的 usageCount 必须是大于等于 0 的整数" });
            return;
          }
        }
        const entry = normalizeEntry({ name, calories, protein, carbs, fat });
        const entryValidation = validateEntries([entry], { prefix: `第 ${rowNumber} 行 · ` });
        if (!entryValidation.valid) {
          invalidRows.push({ rowNumber, reason: entryValidation.message.replace(`第 ${rowNumber} 行 · `, "") });
          return;
        }

        if (!candidateFavorites.has(favoriteId)) {
          candidateFavorites.set(favoriteId, {
            id: favoriteId,
            name: String(favoriteName).trim(),
            entries: [],
            usageCount: usageCountText === "" ? 0 : Number(usageCountText),
            lastUsedAt: lastUsedAt || "",
            updatedAt: updatedAt || "",
            createdAt: createdAt || ""
          });
        }

        const favorite = candidateFavorites.get(favoriteId);
        if (favorite.name !== String(favoriteName).trim()) {
          invalidRows.push({ rowNumber, reason: "同一个 favoriteId 对应了不同的常用餐名称" });
          return;
        }
        while (favorite.entries.length < entryIndex) {
          favorite.entries.push(makeEntry());
        }
        favorite.entries[entryIndex - 1] = entry;
        favorite.usageCount = Math.max(favorite.usageCount || 0, usageCountText === "" ? 0 : Number(usageCountText));
        favorite.lastUsedAt = favorite.lastUsedAt || lastUsedAt || "";
        favorite.updatedAt = favorite.updatedAt || updatedAt || "";
        favorite.createdAt = favorite.createdAt || createdAt || "";
      });
    }

    if (invalidRows.length) {
      setNotice(`导入失败：发现 ${invalidRows.length} 行无效数据`, { tone: "bad", duration: 4200 });
      state.pendingImport = {
        records: candidateRecords,
        favorites: Array.from(candidateFavorites.values()),
        summary: {
          totalRows: recordRows.length - 1,
          totalDates: Object.keys(candidateRecords).length,
          favoriteRows: Math.max(0, favoriteRows.length - 1),
          totalFavorites: candidateFavorites.size,
          collisions: [],
          newDates: [],
          unchangedDates: [],
          favoriteCollisions: [],
          favoriteNew: [],
          favoriteUnchanged: [],
          invalidRows
        }
      };
      openImportPreview();
      return;
    }

    Object.keys(candidateRecords).forEach((date) => {
      candidateRecords[date] = normalizeRecord(candidateRecords[date]);
    });
    const favorites = Array.from(candidateFavorites.values()).map((favorite) => normalizeFavorite(favorite));

    const dates = Object.keys(candidateRecords).sort();
    const collisions = dates.filter((date) => state.records[date] && !sameDayData(candidateRecords[date], state.records[date]));
    const unchangedDates = dates.filter((date) => state.records[date] && sameDayData(candidateRecords[date], state.records[date]));
    const newDates = dates.filter((date) => !state.records[date]);
    const favoriteCollisions = favorites.filter((favorite) => {
      const current = state.favorites.find((item) => item.id === favorite.id);
      return current && !sameFavoriteData(favorite, current);
    });
    const favoriteUnchanged = favorites.filter((favorite) => {
      const current = state.favorites.find((item) => item.id === favorite.id);
      return current && sameFavoriteData(favorite, current);
    });
    const favoriteNew = favorites.filter((favorite) => !state.favorites.find((item) => item.id === favorite.id));

    if (!dates.length && !favorites.length) {
      setNotice("CSV 中没有可导入的记录或常用餐", { tone: "warn" });
      return;
    }

    state.pendingImport = {
      records: candidateRecords,
      favorites,
      summary: {
        totalRows: recordRows.length - 1,
        totalDates: dates.length,
        favoriteRows: Math.max(0, favoriteRows.length - 1),
        totalFavorites: favorites.length,
        collisions,
        newDates,
        unchangedDates,
        favoriteCollisions: favoriteCollisions.map((favorite) => favorite.name),
        favoriteNew: favoriteNew.map((favorite) => favorite.name),
        favoriteUnchanged: favoriteUnchanged.map((favorite) => favorite.name),
        invalidRows: []
      }
    };
    openImportPreview();
  }

  async function confirmPendingImport() {
    if (!state.pendingImport) {
      return;
    }
    if (state.pendingImport.summary.invalidRows.length) {
      setNotice("当前 CSV 含有无效行，请修正后再导入", { tone: "warn" });
      return;
    }
    const dates = Object.keys(state.pendingImport.records);
    const favorites = Array.isArray(state.pendingImport.favorites) ? state.pendingImport.favorites : [];
    if (dates.includes(state.date) && hasUnsavedFormalChanges()) {
      const shouldImport = window.confirm("导入会覆盖当前日期，并清除当前日期的未正式保存修改。确定继续导入吗？");
      if (!shouldImport) {
        return;
      }
    }
    const changedRecords = dates
      .map((date) => state.pendingImport.records[date])
      .filter((record) => !state.records[record.date] || !sameDayData(record, state.records[record.date]));
    const changedFavorites = favorites
      .map((favorite) => normalizeFavorite(favorite))
      .filter((favorite) => {
        const current = state.favorites.find((item) => item.id === favorite.id);
        return !current || !sameFavoriteData(favorite, current);
      });

    if (!changedRecords.length && !changedFavorites.length) {
      closeImportPreview();
      setNotice("无需导入", { tone: "ok" });
      return;
    }

    await Promise.all([
      changedRecords.length ? storage.putRecords(changedRecords) : Promise.resolve(),
      changedFavorites.length ? storage.putFavorites(changedFavorites) : Promise.resolve(),
      dates.length ? storage.deleteDrafts(dates) : Promise.resolve()
    ]);
    changedRecords.forEach((record) => {
      state.records[record.date] = record;
    });
    if (changedFavorites.length) {
      const favoriteMap = new Map(state.favorites.map((favorite) => [favorite.id, normalizeFavorite(favorite)]));
      changedFavorites.forEach((favorite) => {
        favoriteMap.set(favorite.id, normalizeFavorite(favorite));
      });
      state.favorites = Array.from(favoriteMap.values()).sort(sortFavorites);
    }

    if (dates.includes(state.date)) {
      state.dirty = false;
      state.lastDraftSavedAt = "";
      await hydrateCurrentDate({ announce: false });
    } else {
      render();
    }

    closeImportPreview();
    const messageParts = [];
    if (changedRecords.length) {
      messageParts.push(`${changedRecords.length} 个日期的记录`);
    }
    if (changedFavorites.length) {
      messageParts.push(`${changedFavorites.length} 个常用餐`);
    }
    setNotice("已导入", { tone: "ok" });
  }

  function openSettingsModal(trigger) {
    lastModalTrigger = trigger;
    state.settingsDraft = clone(currentSettings());
    state.settingsOpen = true;
    renderHeader();
    dom.closeSettingsBtn.focus();
  }

  function closeSettingsModal() {
    state.settingsOpen = false;
    state.settingsDraft = null;
    renderHeader();
    restoreFocus();
  }

  function updateSettingsDraft(target) {
    const key = target.dataset.setting;
    if (!key || !state.settingsDraft) {
      return;
    }
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      state.settingsDraft[key] = target.checked;
    } else {
      state.settingsDraft[key] = target.value;
    }
    if (key === "trainingDaysPerWeek") {
      const count = Math.min(7, Math.max(0, Math.round(Number(target.value) || 0)));
      state.settingsDraft.trainingDaysPerWeek = count;
    }
    refreshSettingsPreview();
  }

  function refreshSettingsPreview() {
    const node = document.getElementById("settingsPreviewBody");
    if (node && state.settingsDraft) {
      node.innerHTML = renderSettingsPreview(state.settingsDraft);
    }
  }

  async function saveSettings() {
    if (!state.settingsDraft) {
      return;
    }
    const validation = validateSettings(state.settingsDraft);
    if (!validation.valid) {
      setNotice(validation.message, { tone: "warn", duration: 3600 });
      focusField(validation.selector);
      return;
    }
    const settings = normalizeSettings({
      ...state.settingsDraft,
      trainingDaysPerWeek: state.settingsDraft.trainingDaysPerWeek,
      settingsVersion: (state.settings?.settingsVersion || 0) + 1,
      generatedAt: nowIso()
    });
    const generation = generateFutureTargets(settings, { includeTrend: true });
    settings.lastTrendAdjustment = generation.trend || null;
    if (generation.trend?.evaluated) {
      settings.lastAutoAdjustmentDate = localDateString();
    }

    await Promise.all([
      storage.putSettings(settings),
      generation.targets.length ? storage.putTargets(generation.targets) : Promise.resolve(),
      generation.deleteDates.length ? storage.deleteTargets(generation.deleteDates) : Promise.resolve()
    ]);

    state.settings = settings;
    generation.deleteDates.forEach((date) => {
      delete state.dailyTargets[date];
    });
    generation.targets.forEach((targetRow) => {
      state.dailyTargets[targetRow.date] = normalizeDailyTarget(targetRow);
    });

    closeSettingsModal();
    render();
    setNotice("设置已保存", { tone: "ok", duration: 3000 });
  }

  function openHelpModal(trigger) {
    lastModalTrigger = trigger;
    state.helpOpen = true;
    renderHeader();
    dom.closeHelpBtn.focus();
  }

  function closeHelpModal() {
    state.helpOpen = false;
    renderHeader();
    restoreFocus();
  }

  function openImportPreview() {
    lastModalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.importPreviewOpen = true;
    renderHeader();
    dom.closeImportPreviewBtn.focus();
  }

  function closeImportPreview() {
    state.importPreviewOpen = false;
    state.pendingImport = null;
    renderHeader();
    restoreFocus();
  }

  function restoreFocus() {
    if (lastModalTrigger && typeof lastModalTrigger.focus === "function") {
      lastModalTrigger.focus();
    }
    lastModalTrigger = null;
  }

  function markDirty() {
    if (!state.ready) {
      return;
    }
    state.dirty = true;
    scheduleDraftSave();
  }

  function scheduleDraftSave() {
    if (draftTimer) {
      clearTimeout(draftTimer);
    }
    state.syncingDraft = true;
    renderHeader();
    draftTimer = window.setTimeout(() => {
      flushDraftSave().catch(handleAsyncError);
    }, 450);
  }

  async function flushDraftSave() {
    if (!state.ready) {
      return;
    }
    if (draftTimer) {
      clearTimeout(draftTimer);
      draftTimer = 0;
    }
    await persistDraft();
  }

  async function persistDraft() {
    try {
      const draft = currentDraft();
      const saved = state.records[state.date];
      const shouldDeleteDraft = (!saved && !dayHasMeaningfulInput(draft)) || (saved && sameDayData(draft, saved));
      if (shouldDeleteDraft) {
        await storage.deleteDraft(state.date);
        state.lastDraftSavedAt = "";
        state.dirty = false;
        return;
      }
      draft.updatedAt = nowIso();
      await storage.putDraft(draft);
      state.lastDraftSavedAt = draft.updatedAt;
    } finally {
      state.syncingDraft = false;
      renderHeader();
    }
  }

  function currentRecord() {
    const record = normalizeRecord({
      date: state.date,
      dayType: state.dayType,
      bodyWeight: state.bodyWeight,
      trainingPerformance: state.trainingPerformance,
      hungerLevel: state.hungerLevel,
      sleepScore: state.sleepScore,
      meals: clone(state.meals),
      savedAt: nowIso()
    });
    return record;
  }

  function currentDraft() {
    return normalizeDraft({
      date: state.date,
      dayType: state.dayType,
      bodyWeight: state.bodyWeight,
      trainingPerformance: state.trainingPerformance,
      hungerLevel: state.hungerLevel,
      sleepScore: state.sleepScore,
      meals: clone(state.meals),
      updatedAt: state.lastDraftSavedAt || nowIso()
    });
  }

  function stats() {
    const totals = dayTotals(state.meals);
    const remaining = calculateRemaining(totals);
    const filledCount = state.meals.filter(filledMeal).length;
    const remainingSlots = Math.max(0, MEAL_LABELS.length - filledCount);
    const perMeal = remainingSlots ? {
      calories: round1(Math.max(remaining.calories, 0) / remainingSlots),
      protein: round1(Math.max(remaining.protein, 0) / remainingSlots),
      carbs: round1(Math.max(remaining.carbs, 0) / remainingSlots),
      fat: round1(Math.max(remaining.fat, 0) / remainingSlots)
    } : {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    const recent = Object.values(state.records)
      .map(normalizeRecord)
      .filter((record) => record.bodyWeight !== "" && Number.isFinite(numberValue(record.bodyWeight)) && record.date <= state.date)
      .sort((left, right) => left.date.localeCompare(right.date));
    const recent7 = recent.slice(-7);
    const prev7 = recent.slice(-14, -7);
    const averageWeight = (records) => {
      if (!records.length) {
        return 0;
      }
      const total = records.reduce((sum, record) => sum + numberValue(record.bodyWeight), 0);
      return round1(total / records.length);
    };
    const recent7Avg = averageWeight(recent7);
    const prev7Avg = averageWeight(prev7);
    const recent14 = recent.slice(-14);
    const rollingWindowDates = lastNDates(state.date, 7);
    const rollingRecords = rollingWindowDates
      .map((date) => state.records[date] ? normalizeRecord(state.records[date]) : null)
      .filter(Boolean);
    const rollingTotals = rollingRecords.reduce((sum, record) => {
      sum.calories += record.totals.calories;
      sum.protein += record.totals.protein;
      sum.carbs += record.totals.carbs;
      sum.fat += record.totals.fat;
      return sum;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const rollingCoveredDays = rollingRecords.length;
    const execution7 = summarizeExecutionWindow(rollingRecords);
    const rollingAverage = rollingCoveredDays ? {
      calories: round1(rollingTotals.calories / rollingCoveredDays),
      protein: round1(rollingTotals.protein / rollingCoveredDays),
      carbs: round1(rollingTotals.carbs / rollingCoveredDays),
      fat: round1(rollingTotals.fat / rollingCoveredDays)
    } : {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };
    const rollingTarget = averageTargetForDates(rollingWindowDates);
    const currentDisplayWeight = recent7.length
      ? recent7Avg
      : (Number.isFinite(numberValue(state.bodyWeight)) ? round1(numberValue(state.bodyWeight)) : 0);
    const firstLoggedWeight = recent.length
      ? round1(numberValue(recent[0].bodyWeight))
      : currentDisplayWeight;
    const goalWeight = currentSettings().targetWeightKg;
    const distanceToGoal = currentDisplayWeight ? round1(currentDisplayWeight - goalWeight) : 0;
    let goalProgress = 0;
    if (firstLoggedWeight && currentDisplayWeight) {
      goalProgress = firstLoggedWeight > goalWeight
        ? ((firstLoggedWeight - currentDisplayWeight) / (firstLoggedWeight - goalWeight)) * 100
        : (currentDisplayWeight <= goalWeight ? 100 : 0);
    }

    const overall = (() => {
      const targetValues = target();
      const cal = totals.calories <= targetValues.calories + 100 && totals.calories >= targetValues.calories - 200
        ? "达标"
        : (totals.calories > targetValues.calories + 100 ? "偏高" : "偏低");
      const pro = totals.protein >= targetValues.protein - 10 ? "达标" : "不足";
      const carb = totals.carbs < targetValues.carbs - 35 ? "偏低" : (totals.carbs > targetValues.carbs + 35 ? "偏高" : "适中");
      const fat = totals.fat > targetValues.fat + 10 ? "偏高" : (totals.fat < targetValues.fat - 15 ? "偏低" : "适中");
      const good = [cal === "达标", pro === "达标", carb === "适中", fat === "适中"].filter(Boolean).length;
      return {
        cal,
        pro,
        carb,
        fat,
        summary: good >= 3 ? "今日结构整体合理" : (good >= 2 ? "今日仍需微调" : "今日偏离较多")
      };
    })();

    const tips = [];
    if (state.dayType === "training" && remaining.carbs > 35) {
      tips.push(`今天是训练日，当前碳水仍差 ${remaining.carbs}g，后续优先补米饭、红薯、面包或水果。`);
    }
    if (remaining.protein > 25) {
      tips.push(`蛋白质仍差 ${remaining.protein}g，下一餐优先补鸡胸、虾、希腊酸奶、豆腐或乳清。`);
    }
    if (remaining.calories < 0 && remaining.protein > 0) {
      tips.push("热量已经超出但蛋白仍未到位，后续优先高蛋白、低脂食物。");
    }
    if (remaining.fat < -10) {
      tips.push("脂肪已明显超出，后续收紧烹调油、坚果和蛋黄类来源。");
    }
    if (state.dayType === "rest" && totals.carbs > target().carbs + 35) {
      tips.push("今天是休息日，碳水偏高，后续可适度降低主食份量。");
    }
    if (!tips.length) {
      tips.push("当前结构较平衡，后续按剩余目标把最后餐次补齐即可。");
    }

    const anomalies = [];
    const macroCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
    const calorieGap = round1(totals.calories - macroCalories);
    if (Math.abs(calorieGap) > 80) {
      anomalies.push(`当日输入热量与 macro 推算热量相差 ${Math.abs(calorieGap)} kcal，建议复核。`);
    }
    state.meals.forEach((meal) => {
      meal.entries.forEach((entry) => {
        const diff = round1(numberValue(entry.calories) - entryMacroCalories(entry));
        if (numberValue(entry.calories) > 0 && Math.abs(diff) > 80) {
          anomalies.push(`${meal.label}${entry.name ? `（${entry.name}）` : ""} 的热量差异为 ${Math.abs(diff)} kcal，建议复核。`);
        }
      });
    });
    const systemInsight = buildSystemInsight({
      rollingCoveredDays,
      rollingAverage,
      rollingTarget,
      execution7,
      recent7Avg,
      prev7Avg,
      currentDisplayWeight,
      distanceToGoal
    });

    return {
      totals,
      remaining,
      remainingSlots,
      perMeal,
      recent7Avg,
      prev7Avg,
      recent7Count: recent7.length,
      recent14,
      rolling7: {
        coveredDays: rollingCoveredDays,
        latestDate: rollingWindowDates[rollingWindowDates.length - 1] || "",
        average: rollingAverage,
        target: rollingTarget
      },
      execution7,
      currentDisplayWeight,
      goalWeight,
      firstLoggedWeight,
      distanceToGoal,
      goalProgress: Math.max(0, Math.min(100, round1(goalProgress))),
      overall,
      tips: tips.slice(0, 3),
      systemInsight,
      anomalies
    };
  }

  function target() {
    return targetForDate(state.date, state.dayType);
  }

  function calculateRemaining(totals) {
    const targetValues = target();
    return {
      calories: round1(targetValues.calories - totals.calories),
      protein: round1(targetValues.protein - totals.protein),
      carbs: round1(targetValues.carbs - totals.carbs),
      fat: round1(targetValues.fat - totals.fat)
    };
  }

  function summarizeExecutionWindow(records) {
    const sleepRecords = records.filter((record) => record.sleepScore !== "");
    const trainingRecords = records.filter((record) => record.dayType === "training");
    return {
      completeDays: records.length,
      sleepDays: sleepRecords.length,
      avgSleep: sleepRecords.length
        ? round1(sleepRecords.reduce((sum, record) => sum + numberValue(record.sleepScore), 0) / sleepRecords.length)
        : 0,
      highHungerDays: records.filter((record) => record.hungerLevel === "high").length,
      lowHungerDays: records.filter((record) => record.hungerLevel === "low").length,
      trainingDays: trainingRecords.length,
      poorTrainingDays: trainingRecords.filter((record) => record.trainingPerformance === "poor").length,
      goodTrainingDays: trainingRecords.filter((record) => record.trainingPerformance === "great").length
    };
  }

  function buildSystemInsight(context) {
    if (context.rollingCoveredDays < 4) {
      return {
        title: "先积累记录",
        body: "近 7 天有效记录还不够，系统暂时不建议调整目标。继续记录饮食、训练表现、饥饿感和睡眠评分会让判断更稳。",
        badges: [{ text: `记录 ${context.rollingCoveredDays}/7`, tone: "warn" }]
      };
    }
    const calorieDiff = round1(context.rollingAverage.calories - context.rollingTarget.calories);
    const weightTrend = context.prev7Avg ? round1(context.recent7Avg - context.prev7Avg) : 0;
    const badges = [
      { text: `热量 ${calorieDiff > 0 ? "+" : ""}${calorieDiff} kcal`, tone: Math.abs(calorieDiff) <= 100 ? "ok" : (calorieDiff > 0 ? "bad" : "warn") },
      { text: `记录 ${context.rollingCoveredDays}/7`, tone: context.rollingCoveredDays >= 6 ? "ok" : "warn" }
    ];
    if (context.execution7.avgSleep) {
      badges.push({ text: `睡眠 ${context.execution7.avgSleep}`, tone: context.execution7.avgSleep >= 75 ? "ok" : (context.execution7.avgSleep < 65 ? "bad" : "warn") });
    }
    if (context.execution7.poorTrainingDays || context.execution7.highHungerDays >= 3 || (context.execution7.avgSleep && context.execution7.avgSleep < 65)) {
      return {
        title: "优先保护恢复",
        body: "最近训练表现、饥饿感或睡眠里出现了压力信号。即使体重下降不明显，也不建议继续压低热量，优先维持或增加训练日碳水。",
        badges
      };
    }
    if (context.prev7Avg && weightTrend < -0.6) {
      return {
        title: "下降偏快",
        body: "近 7 次均重下降较快。如果这同时伴随训练表现变差或睡眠偏低，下一轮目标应更偏表现保护。",
        badges
      };
    }
    if (Math.abs(calorieDiff) <= 100 && (!context.prev7Avg || weightTrend <= 0.2)) {
      return {
        title: "建议维持",
        body: "热量执行接近目标，体重趋势没有明显跑偏。当前更适合继续观察，而不是频繁调整目标。",
        badges
      };
    }
    if (calorieDiff > 150) {
      return {
        title: "先修正执行",
        body: "近 7 天平均摄入高于目标较多。优先减少记录误差或外食热量，而不是急着改目标公式。",
        badges
      };
    }
    return {
      title: "趋势可控",
      body: "当前数据没有显示需要大幅调整。继续保持记录完整度，系统会在 14 天窗口里更稳地判断。",
      badges
    };
  }

  function targetForDate(date, dayType = DEFAULT_DAY_TYPE) {
    const generated = state.dailyTargets?.[date];
    if (generated && generated.dayType === dayType) {
      return {
        label: generated.dayType === "rest" ? "休息日" : "训练日",
        calories: generated.caloriesTarget,
        protein: generated.proteinTarget,
        carbs: generated.carbsTarget,
        fat: generated.fatTarget
      };
    }
    if (date <= localDateString()) {
      return TARGETS[dayType] || TARGETS.training;
    }
    if (!state.settings?.settingsVersion) {
      return TARGETS[dayType] || TARGETS.training;
    }
    const preview = computeSettingsPreview(currentSettings(), { includeTrend: false });
    return dayType === "rest"
      ? {
        label: "休息日",
        calories: preview.restCalories,
        protein: preview.proteinTarget,
        carbs: preview.restCarbs,
        fat: preview.fatTarget
      }
      : {
        label: "训练日",
        calories: preview.trainingCalories,
        protein: preview.proteinTarget,
        carbs: preview.trainingCarbs,
        fat: preview.fatTarget
      };
  }

  function averageTargetForDates(dates) {
    const totals = dates.reduce((sum, date) => {
      const record = state.records[date] ? normalizeRecord(state.records[date]) : null;
      const dayType = record?.dayType || state.dailyTargets?.[date]?.dayType || dayTypeForDate(currentSettings(), date);
      const values = targetForDate(date, dayType);
      sum.calories += values.calories;
      sum.protein += values.protein;
      sum.carbs += values.carbs;
      sum.fat += values.fat;
      return sum;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    const totalDays = Math.max(1, dates.length);
    return {
      calories: round1(totals.calories / totalDays),
      protein: round1(totals.protein / totalDays),
      carbs: round1(totals.carbs / totalDays),
      fat: round1(totals.fat / totalDays)
    };
  }

  function dayTypeForDate(settings, date) {
    const record = state.records[date] ? normalizeRecord(state.records[date]) : null;
    if (record) {
      return record.dayType;
    }
    return "rest";
  }

  function lastNDates(endDate, count) {
    const dates = [];
    const cursor = new Date(`${endDate}T00:00:00`);
    for (let index = count - 1; index >= 0; index -= 1) {
      const day = new Date(cursor);
      day.setDate(cursor.getDate() - index);
      dates.push(localDateString(day));
    }
    return dates;
  }

  function dayTotals(meals) {
    return normalizeMeals(meals).reduce((sum, meal) => {
      const totals = mealTotals(meal);
      sum.calories += totals.calories;
      sum.protein += totals.protein;
      sum.carbs += totals.carbs;
      sum.fat += totals.fat;
      return sum;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function mealTotals(meal) {
    return (meal.entries || []).reduce((sum, entry) => {
      sum.calories += numberValue(entry.calories);
      sum.protein += numberValue(entry.protein);
      sum.carbs += numberValue(entry.carbs);
      sum.fat += numberValue(entry.fat);
      return sum;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }

  function favoriteTotals(favorite) {
    return mealTotals({ entries: favorite.entries || [] });
  }

  function entryMacroCalories(entry) {
    return numberValue(entry.protein) * 4 + numberValue(entry.carbs) * 4 + numberValue(entry.fat) * 9;
  }

  function filledMeal(meal) {
    return (meal.entries || []).some(entryStarted);
  }

  function entryStarted(entry) {
    return ENTRY_FIELDS.some((field) => String(entry[field] ?? "").trim() !== "");
  }

  function entryComplete(entry) {
    return ENTRY_FIELDS.every((field) => String(entry[field] ?? "").trim() !== "");
  }

  function validateSettings(settings) {
    const numericRules = {
      bmr: { label: "BMR", min: 900, max: 3500 },
      currentWeightKg: { label: "当前体重", min: 30, max: 250 },
      targetWeightKg: { label: "目标体重", min: 30, max: 250 },
      targetBodyFatPercent: { label: "目标体脂", min: 5, max: 45 }
    };
    for (const [key, rule] of Object.entries(numericRules)) {
      const validation = validateNumericText(settings[key], { ...rule, decimals: 1 }, rule.label);
      if (!validation.valid) {
        return { valid: false, message: validation.message, selector: `#setting-${key}` };
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(settings.targetDate || ""))) {
      return { valid: false, message: "目标日期格式不正确", selector: "#setting-targetDate" };
    }
    if (daysBetween(localDateString(), settings.targetDate) <= 0) {
      return { valid: false, message: "目标日期需要晚于今天", selector: "#setting-targetDate" };
    }
    const trainingDays = Number(settings.trainingDaysPerWeek);
    if (!Number.isFinite(trainingDays) || trainingDays < 0 || trainingDays > 7) {
      return { valid: false, message: "每周训练天数需在 0 到 7 之间", selector: "#setting-trainingDaysPerWeek" };
    }
    return { valid: true };
  }

  function generateFutureTargets(settingsInput, options = {}) {
    const settings = normalizeSettings(settingsInput);
    const today = localDateString();
    const startDate = addDays(today, 1);
    const dates = dateRange(startDate, settings.targetDate);
    const preview = computeSettingsPreview(settings, {
      includeTrend: !!options.includeTrend,
      records: state.records,
      today
    });
    const generatedAt = nowIso();
    const deleteDates = Object.values(state.dailyTargets)
      .map(normalizeDailyTarget)
      .filter((targetRow) => targetRow.date >= startDate && targetRow.date > settings.targetDate && !targetRow.isManualOverride)
      .map((targetRow) => targetRow.date);
    const targets = dates
      .filter((date) => !state.dailyTargets[date]?.isManualOverride)
      .map((date) => {
        const dayType = dayTypeForDate(settings, date);
        const values = targetValuesFromPreview(preview, dayType, settings);
        return normalizeDailyTarget({
          date,
          dayType,
          caloriesTarget: values.calories,
          proteinTarget: values.protein,
          carbsTarget: values.carbs,
          fatTarget: values.fat,
          weeklyAverageCalories: preview.weeklyAverageCalories,
          goalPhase: preview.goalPhase,
          generatedAt,
          sourceSettingsVersion: settings.settingsVersion,
          isManualOverride: false
        });
      });
    return {
      targets,
      deleteDates,
      preview,
      trend: preview.trend
    };
  }

  function targetValuesFromPreview(preview, dayType) {
    return dayType === "rest"
      ? {
        calories: preview.restCalories,
        protein: preview.proteinTarget,
        carbs: preview.restCarbs,
        fat: preview.fatTarget
      }
      : {
        calories: preview.trainingCalories,
        protein: preview.proteinTarget,
        carbs: preview.trainingCarbs,
        fat: preview.fatTarget
      };
  }

  function validateDay() {
    if (state.bodyWeight) {
      const weightValidation = validateNumericText(state.bodyWeight, NUMERIC_RULES.bodyWeight, "晨起体重");
      if (!weightValidation.valid) {
        return {
          valid: false,
          message: weightValidation.message,
          selector: "#bodyWeightInput"
        };
      }
    }

    for (let mealIndex = 0; mealIndex < state.meals.length; mealIndex += 1) {
      const meal = state.meals[mealIndex];
      for (let entryIndex = 0; entryIndex < meal.entries.length; entryIndex += 1) {
        const entry = meal.entries[entryIndex];
        if (!entryStarted(entry)) {
          continue;
        }
        if (!entryComplete(entry)) {
          return {
            valid: false,
            message: `${meal.label} · 项目 ${entryIndex + 1} 未填写完整，请补全名称、kcal、P、C、F`,
            selector: `[data-entry="${meal.id}-${entryIndex}-name"]`
          };
        }
      }
    }

    return validateEntries(
      state.meals.flatMap((meal) => meal.entries.map((entry, entryIndex) => ({
        entry,
        meal,
        entryIndex
      }))),
      { structured: true }
    );
  }

  function validateFavoriteDraft(favoriteDraft) {
    if (!favoriteDraft.name.trim()) {
      return { valid: false, message: "常用餐名称不能为空", selector: "#favAliasInput" };
    }
    const startedEntries = favoriteDraft.entries.filter(entryStarted);
    if (!startedEntries.length) {
      return { valid: false, message: "至少保留 1 个完整食物项", selector: '#favAliasInput' };
    }
    return validateEntries(
      favoriteDraft.entries.map((entry, entryIndex) => ({ entry, entryIndex })),
      { structured: true, favorite: true }
    );
  }

  function validateEntries(entries, options = {}) {
    if (options.structured) {
      for (const item of entries) {
        const entry = normalizeEntry(item.entry);
        if (!entryStarted(entry)) {
          continue;
        }
        if (!entry.name.trim()) {
          return {
            valid: false,
            message: options.favorite
              ? `常用餐 · 食物项 ${item.entryIndex + 1} 缺少名称`
              : `${item.meal.label} · 项目 ${item.entryIndex + 1} 缺少名称`,
            selector: options.favorite
              ? `[data-favorite-entry="${item.entryIndex}-name"]`
              : `[data-entry="${item.meal.id}-${item.entryIndex}-name"]`
          };
        }
        for (const field of ["calories", "protein", "carbs", "fat"]) {
          const validation = validateNumericText(entry[field], NUMERIC_RULES[field], NUMERIC_RULES[field].label);
          if (!validation.valid) {
            return {
              valid: false,
              message: options.favorite
                ? `常用餐 · 食物项 ${item.entryIndex + 1} 的${validation.message}`
                : `${item.meal.label} · 项目 ${item.entryIndex + 1} 的${validation.message}`,
              selector: options.favorite
                ? `[data-favorite-entry="${item.entryIndex}-${field}"]`
                : `[data-entry="${item.meal.id}-${item.entryIndex}-${field}"]`
            };
          }
        }
      }
      return { valid: true };
    }

    for (const entry of entries) {
      if (!entryStarted(entry)) {
        continue;
      }
      if (!entry.name.trim()) {
        return { valid: false, message: `${options.prefix || ""}名称不能为空` };
      }
      for (const field of ["calories", "protein", "carbs", "fat"]) {
        const validation = validateNumericText(entry[field], NUMERIC_RULES[field], NUMERIC_RULES[field].label);
        if (!validation.valid) {
          return { valid: false, message: `${options.prefix || ""}${validation.message}` };
        }
      }
    }
    return { valid: true };
  }

  function validateNumericText(value, rule, labelOverride) {
    const text = normalizeLooseNumericText(value);
    if (text === "") {
      return { valid: false, message: `${labelOverride || rule.label}不能为空` };
    }
    const number = Number(text);
    if (!Number.isFinite(number)) {
      return { valid: false, message: `${labelOverride || rule.label}只能输入数字` };
    }
    if (number < rule.min || number > rule.max) {
      return { valid: false, message: `${labelOverride || rule.label}需在 ${rule.min} 到 ${rule.max} 之间` };
    }
    return { valid: true, value: number };
  }

  function focusField(selector) {
    if (!selector) {
      return;
    }
    const node = document.querySelector(selector);
    if (node && typeof node.focus === "function") {
      node.focus();
    }
  }

  function setNotice(message, options = {}) {
    state.notice = message;
    state.noticeTone = options.tone || "neutral";
    renderHeader();
    if (noticeTimer) {
      clearTimeout(noticeTimer);
    }
    const duration = typeof options.duration === "number" ? options.duration : 2600;
    if (!message) {
      return;
    }
    noticeTimer = window.setTimeout(() => {
      state.notice = "";
      state.noticeTone = "neutral";
      renderHeader();
    }, duration);
  }

  function buildStatusText() {
    if (state.fatalError) {
      return "";
    }
    if (!state.ready) {
      return "正在读取本地数据…";
    }
    if (state.syncingDraft) {
      return "正在自动保存草稿…";
    }
    if (state.dirty && state.lastDraftSavedAt) {
      return `存在未保存草稿，已自动保存于 ${fmtTime(state.lastDraftSavedAt)}`;
    }
    if (state.dirty) {
      return "存在未保存修改，草稿会自动保存在当前设备。";
    }
    if (state.lastSavedAt) {
      return `最近一次正式保存：${fmtDateTime(state.lastSavedAt)}`;
    }
    return "数据仅保存在当前设备，支持离线使用。";
  }

  function remainingChipText(value, suffix = "") {
    return `${value >= 0 ? "剩" : "超"} ${Math.abs(value)}${suffix}`;
  }

  function badgeTone(value, kind) {
    if (kind === "cal") {
      return value === "达标" ? "ok" : (value === "偏高" ? "bad" : "warn");
    }
    if (kind === "pro") {
      return value === "达标" ? "ok" : "warn";
    }
    return value === "适中" ? "ok" : "warn";
  }

  function overallTone(metric, status) {
    if (metric === "protein") {
      return status === "达标" ? "ok" : "warn";
    }
    if (metric === "carbs") {
      return status === "适中" ? "ok" : "warn";
    }
    if (metric === "calories") {
      return status === "偏高" ? "bad" : (status === "偏低" ? "warn" : "ok");
    }
    return status === "偏高" ? "bad" : (status === "偏低" ? "warn" : "ok");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const current = text[index];
      const next = text[index + 1];
      if (quoted) {
        if (current === '"' && next === '"') {
          value += '"';
          index += 1;
        } else if (current === '"') {
          quoted = false;
        } else {
          value += current;
        }
      } else if (current === '"') {
        quoted = true;
      } else if (current === ",") {
        row.push(value);
        value = "";
      } else if (current === "\n") {
        row.push(value);
        rows.push(row);
        row = [];
        value = "";
      } else if (current !== "\r") {
        value += current;
      }
    }
    row.push(value);
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
    return rows;
  }

  function exportCsv(rows, filename) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, "\"\"")}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function refreshPersistedData() {
    const [records, favorites, targets, settings, legacySettings] = await Promise.all([
      storage.getAllRecords(),
      storage.getAllFavorites(),
      storage.getAllTargets(),
      storage.getSettings(),
      storage.getMeta(LEGACY_SETTINGS_META_KEY)
    ]);
    const normalizedRecords = records.map((record) => normalizeRecord(record));
    state.records = Object.fromEntries(normalizedRecords.map((record) => [record.date, record]));
    state.favorites = favorites.map(normalizeFavorite).sort(sortFavorites);
    state.dailyTargets = Object.fromEntries(targets.map((targetRow) => {
      const normalizedTarget = normalizeDailyTarget(targetRow);
      return [normalizedTarget.date, normalizedTarget];
    }));
    state.settings = normalizeSettings(settings || legacySettings, normalizedRecords);
  }

  async function maybeRunScheduledTargetAdjustment() {
    if (!state.settings?.settingsVersion) {
      return;
    }
    const preview = computeSettingsPreview(state.settings, { includeTrend: true, records: state.records });
    if (!preview.trend?.evaluated) {
      return;
    }
    const generation = preview.trend.adjustmentKcal
      ? generateFutureTargets(state.settings, { includeTrend: true })
      : { targets: [], deleteDates: [], trend: preview.trend };
    const settings = normalizeSettings({
      ...state.settings,
      lastAutoAdjustmentDate: localDateString(),
      lastTrendAdjustment: preview.trend
    });
    await Promise.all([
      storage.putSettings(settings),
      generation.targets.length ? storage.putTargets(generation.targets) : Promise.resolve(),
      generation.deleteDates.length ? storage.deleteTargets(generation.deleteDates) : Promise.resolve()
    ]);
    state.settings = settings;
    generation.deleteDates.forEach((date) => {
      delete state.dailyTargets[date];
    });
    generation.targets.forEach((targetRow) => {
      state.dailyTargets[targetRow.date] = normalizeDailyTarget(targetRow);
    });
  }

  function sortFavorites(left, right) {
    const usageGap = (right.usageCount || 0) - (left.usageCount || 0);
    if (usageGap !== 0) {
      return usageGap;
    }
    const lastUsedDiff = String(right.lastUsedAt || "").localeCompare(String(left.lastUsedAt || ""));
    if (lastUsedDiff !== 0) {
      return lastUsedDiff;
    }
    return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
  }

  function normalizeSettings(settings = {}, records = []) {
    const latestWeight = latestLoggedWeight(records);
    const merged = {
      ...DEFAULT_SETTINGS,
      currentWeightKg: latestWeight || DEFAULT_SETTINGS.currentWeightKg,
      ...settings
    };
    const trainingDays = Math.min(7, Math.max(0, Math.round(Number(merged.trainingDaysPerWeek ?? DEFAULT_SETTINGS.trainingDaysPerWeek) || 0)));
    const goalMode = GOAL_MODE_CONFIG[merged.goalMode] ? merged.goalMode : DEFAULT_SETTINGS.goalMode;
    const activityLevel = ACTIVITY_LEVEL_CONFIG[merged.activityLevel] ? merged.activityLevel : DEFAULT_SETTINGS.activityLevel;
    const activityFactor = estimateActivityFactor(activityLevel, trainingDays);
    return {
      bmr: normalizeSettingNumber(merged.bmr, DEFAULT_SETTINGS.bmr, 900, 3500),
      currentWeightKg: normalizeSettingNumber(merged.currentWeightKg, DEFAULT_SETTINGS.currentWeightKg, 30, 250),
      targetWeightKg: normalizeSettingNumber(merged.targetWeightKg, DEFAULT_SETTINGS.targetWeightKg, 30, 250),
      targetBodyFatPercent: normalizeSettingNumber(merged.targetBodyFatPercent, DEFAULT_SETTINGS.targetBodyFatPercent, 5, 45),
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(String(merged.targetDate || "")) ? String(merged.targetDate) : DEFAULT_SETTINGS.targetDate,
      goalMode,
      activityLevel,
      activityFactor,
      trainingDaysPerWeek: trainingDays,
      trackingAccuracyBuffer: TRACKING_BUFFER_CONFIG[merged.trackingAccuracyBuffer] ? merged.trackingAccuracyBuffer : DEFAULT_SETTINGS.trackingAccuracyBuffer,
      settingsVersion: Math.max(0, Math.round(Number(merged.settingsVersion) || 0)),
      lastAutoAdjustmentDate: String(merged.lastAutoAdjustmentDate || ""),
      lastTrendAdjustment: merged.lastTrendAdjustment || null,
      generatedAt: String(merged.generatedAt || "")
    };
  }

  function normalizeSettingNumber(value, fallback, min, max) {
    const number = Number(normalizeLooseNumericText(value));
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return round1(Math.min(max, Math.max(min, number)));
  }

  function estimateActivityFactor(activityLevel, trainingDaysPerWeek) {
    const config = ACTIVITY_LEVEL_CONFIG[activityLevel] || ACTIVITY_LEVEL_CONFIG.medium;
    const trainingBump = Math.min(0.14, Math.max(0, trainingDaysPerWeek) * 0.02);
    return round1(Math.min(1.8, config.baseFactor + trainingBump));
  }

  function latestLoggedWeight(records = Object.values(state.records || {})) {
    const latest = records
      .map(normalizeRecord)
      .filter((record) => record.bodyWeight !== "" && Number.isFinite(numberValue(record.bodyWeight)))
      .sort((left, right) => right.date.localeCompare(left.date))[0];
    return latest ? round1(numberValue(latest.bodyWeight)) : 0;
  }

  function effectiveTrainingDays(settings = currentSettings()) {
    const numericDays = Number(settings.trainingDaysPerWeek);
    const fallbackDays = Number.isFinite(numericDays) ? Math.round(numericDays) : DEFAULT_WEEKLY_TRAINING_DAYS;
    return Math.min(7, Math.max(0, fallbackDays));
  }

  function currentSettings() {
    return state.settings || normalizeSettings(DEFAULT_SETTINGS);
  }

  function computeSettingsPreview(settingsInput = currentSettings(), options = {}) {
    const settings = normalizeSettings(settingsInput);
    const today = options.today || localDateString();
    const tomorrow = addDays(today, 1);
    const daysRemaining = Math.max(0, daysBetween(tomorrow, settings.targetDate) + 1);
    const tdee = round1(settings.bmr * settings.activityFactor);
    const minCalories = round1(settings.bmr * 1.15);
    const weightLossKg = round1(settings.currentWeightKg - settings.targetWeightKg);
    const mode = GOAL_MODE_CONFIG[settings.goalMode] || GOAL_MODE_CONFIG.recomp;
    const buffer = TRACKING_BUFFER_CONFIG[settings.trackingAccuracyBuffer] || TRACKING_BUFFER_CONFIG.medium;
    const warnings = [];
    const totalDeficit = weightLossKg > 0 ? round1(weightLossKg * 7700) : 0;
    const dailyDeficitByDate = daysRemaining > 0 && totalDeficit > 0 ? totalDeficit / daysRemaining : 0;
    const modeDailyDeficit = Math.min(mode.maxDeficit, Math.max(mode.minDeficit, tdee * mode.deficitRatio));
    let plannedDailyDeficit = 0;
    let goalPhase = "maintenance";

    if (daysRemaining <= 0) {
      warnings.push("目标日期需要晚于今天，系统不会生成过去或今天的目标。");
    }
    if (weightLossKg > 0) {
      goalPhase = settings.goalMode === "recomp" ? "recomp" : "cut";
      plannedDailyDeficit = Math.min(dailyDeficitByDate || modeDailyDeficit, modeDailyDeficit, MAX_DAILY_DEFICIT);
      if (settings.goalMode === "cut") {
        plannedDailyDeficit = Math.max(MIN_DAILY_DEFICIT, plannedDailyDeficit);
      }
      if (dailyDeficitByDate > modeDailyDeficit) {
        warnings.push("目标时间线需要更大缺口，系统已按当前目标模式限制缺口以保护训练表现。");
      }
    } else if (weightLossKg < 0) {
      goalPhase = "maintenance";
      plannedDailyDeficit = settings.goalMode === "performance" ? 0 : Math.min(100, modeDailyDeficit);
      warnings.push("当前版本更适合减脂、recomp 和维持表现目标。");
    } else {
      plannedDailyDeficit = settings.goalMode === "performance" ? 0 : Math.min(100, modeDailyDeficit);
    }

    let finalAverageCalories = Math.max(tdee - plannedDailyDeficit, minCalories);
    finalAverageCalories = Math.max(finalAverageCalories - buffer.calories, minCalories);
    const trend = options.includeTrend ? evaluateTrendAdjustment(settings, plannedDailyDeficit, options.records || state.records) : null;
    if (trend?.adjustmentKcal) {
      finalAverageCalories = Math.max(finalAverageCalories + trend.adjustmentKcal, minCalories);
      warnings.push(trend.message);
    } else if (trend?.message) {
      warnings.push(trend.message);
    }

    const split = splitCaloriesByDayType(settings, finalAverageCalories, minCalories, warnings);
    const proteinMultiplier = automaticProteinMultiplier(settings, plannedDailyDeficit);
    const fatMultiplier = automaticFatMultiplier(settings, plannedDailyDeficit);
    const proteinTarget = calculateProteinTarget(settings, proteinMultiplier);
    const fatTarget = calculateFatTarget(settings, fatMultiplier);
    const trainingCarbs = Math.max(0, Math.round((split.trainingCalories - proteinTarget * 4 - fatTarget * 9) / 4));
    const restCarbs = Math.max(0, Math.round((split.restCalories - proteinTarget * 4 - fatTarget * 9) / 4));
    if (trainingCarbs < 180 || restCarbs < 120) {
      warnings.push("Carbs are low for the selected training frequency. Consider reducing deficit, increasing calories, or lowering fat target.");
    }
    if (buffer.calories && (trainingCarbs < 180 || restCarbs < 120)) {
      warnings.push("记录误差缓冲已生效，但当前碳水空间偏紧。");
    }

    return {
      settings,
      tdee: round1(tdee),
      minCalories,
      totalDeficit: round1(totalDeficit),
      daysRemaining,
      dailyDeficitByDate: round1(dailyDeficitByDate),
      plannedDailyDeficit: round1(plannedDailyDeficit),
      finalAverageCalories: round1(finalAverageCalories),
      trainingCalories: Math.round(split.trainingCalories),
      restCalories: Math.round(split.restCalories),
      proteinTarget,
      fatTarget,
      proteinMultiplier,
      fatMultiplier,
      activityFactor: settings.activityFactor,
      effectiveBoost: Math.round(split.effectiveBoost),
      trainingCarbs,
      restCarbs,
      targetLeanMass: round1(settings.targetWeightKg * (1 - settings.targetBodyFatPercent / 100)),
      weeklyAverageCalories: round1(finalAverageCalories),
      goalPhase,
      trend,
      warnings: Array.from(new Set(warnings))
    };
  }

  function splitCaloriesByDayType(settings, finalAverageCalories, minCalories, warnings = []) {
    const trainingDays = effectiveTrainingDays(settings);
    const restDays = Math.max(0, 7 - trainingDays);
    let boost = automaticTrainingBoost(settings);
    if (!trainingDays || !restDays) {
      return {
        trainingCalories: finalAverageCalories,
        restCalories: finalAverageCalories,
        effectiveBoost: 0
      };
    }
    let restCalories = finalAverageCalories - (trainingDays * boost) / restDays;
    if (restCalories < minCalories) {
      const maxBoost = Math.max(0, ((finalAverageCalories - minCalories) * restDays) / trainingDays);
      boost = Math.min(boost, maxBoost);
      restCalories = finalAverageCalories - (trainingDays * boost) / restDays;
      warnings.push("休息日热量触及最低保护线，已自动降低训练日热量加成。");
    }
    return {
      trainingCalories: finalAverageCalories + boost,
      restCalories: Math.max(restCalories, minCalories),
      effectiveBoost: boost
    };
  }

  function automaticTrainingBoost(settings) {
    const mode = GOAL_MODE_CONFIG[settings.goalMode] || GOAL_MODE_CONFIG.recomp;
    const trainingDays = effectiveTrainingDays(settings);
    const frequencyBump = trainingDays >= 5 ? 50 : (trainingDays <= 2 ? -25 : 0);
    return Math.max(0, Math.round(mode.boost + frequencyBump));
  }

  function automaticProteinMultiplier(settings, plannedDailyDeficit = 0) {
    const mode = GOAL_MODE_CONFIG[settings.goalMode] || GOAL_MODE_CONFIG.recomp;
    const deficitBump = plannedDailyDeficit >= 400 ? 0.15 : (plannedDailyDeficit >= 250 ? 0.08 : 0);
    return round1(Math.min(2.25, Math.max(1.6, mode.proteinBase + deficitBump)));
  }

  function automaticFatMultiplier(settings, plannedDailyDeficit = 0) {
    const mode = GOAL_MODE_CONFIG[settings.goalMode] || GOAL_MODE_CONFIG.recomp;
    const deficitTrim = plannedDailyDeficit >= 400 ? 0.05 : 0;
    return round1(Math.min(0.9, Math.max(0.6, mode.fatBase - deficitTrim)));
  }

  function calculateProteinTarget(settings, multiplier = automaticProteinMultiplier(settings)) {
    const base = settings.currentWeightKg * multiplier;
    const minProtein = settings.targetWeightKg * 1.8;
    const maxProtein = settings.currentWeightKg * 2.2;
    return Math.round(Math.min(maxProtein, Math.max(minProtein, base)));
  }

  function calculateFatTarget(settings, multiplier = automaticFatMultiplier(settings)) {
    const base = settings.targetWeightKg * multiplier;
    const minFat = settings.targetWeightKg * 0.6;
    return Math.round(Math.max(minFat, base));
  }

  function evaluateTrendAdjustment(settings, plannedDailyDeficit, recordsByDate = state.records) {
    const today = localDateString();
    if (settings.lastAutoAdjustmentDate && daysBetween(settings.lastAutoAdjustmentDate, today) < 14) {
      return null;
    }
    const windowDates = dateRange(addDays(today, -13), today);
    const completeRecords = windowDates
      .map((date) => recordsByDate[date] ? normalizeRecord(recordsByDate[date]) : null)
      .filter((record) => record && isCompleteTrendRecord(record));
    if (completeRecords.length < 10) {
      return {
        adjustmentKcal: 0,
        evaluated: false,
        message: "Not enough complete data for automatic target adjustment."
      };
    }
    const previousRecords = completeRecords.filter((record) => record.date < addDays(today, -6));
    const currentRecords = completeRecords.filter((record) => record.date >= addDays(today, -6));
    if (!previousRecords.length || !currentRecords.length) {
      return {
        adjustmentKcal: 0,
        evaluated: false,
        message: "Not enough complete data for automatic target adjustment."
      };
    }
    const current7DayAvg = averageBodyWeight(currentRecords);
    const previous7DayAvg = averageBodyWeight(previousRecords);
    const actualChange = round1(previous7DayAvg - current7DayAvg);
    const expectedChange = round1((plannedDailyDeficit * 14) / 7700);
    const quality = summarizeExecutionQuality(completeRecords);
    if (quality.avgSleep && quality.avgSleep < 65) {
      return {
        adjustmentKcal: 0,
        evaluated: true,
        current7DayAvg,
        previous7DayAvg,
        actualChange,
        expectedChange,
        quality,
        message: "睡眠评分偏低，暂不因为体重趋势继续压低热量。"
      };
    }
    if (quality.highHungerDays >= 4) {
      return {
        adjustmentKcal: 0,
        evaluated: true,
        current7DayAvg,
        previous7DayAvg,
        actualChange,
        expectedChange,
        quality,
        message: "近 14 天饥饿感偏高，暂不继续降低热量。"
      };
    }
    if (quality.poorPerformanceDays >= 2 || (expectedChange > 0 && actualChange > expectedChange * 1.25)) {
      return {
        adjustmentKcal: 125,
        evaluated: true,
        current7DayAvg,
        previous7DayAvg,
        actualChange,
        expectedChange,
        quality,
        message: "14 天趋势下降偏快，未来目标已小幅增加热量以保护训练表现。"
      };
    }
    if (expectedChange > 0 && actualChange < expectedChange * 0.5) {
      return {
        adjustmentKcal: -125,
        evaluated: true,
        current7DayAvg,
        previous7DayAvg,
        actualChange,
        expectedChange,
        quality,
        message: "14 天趋势下降偏慢，未来目标已小幅降低热量。"
      };
    }
    return {
      adjustmentKcal: 0,
      evaluated: true,
      current7DayAvg,
      previous7DayAvg,
      actualChange,
      expectedChange,
      quality,
      message: ""
    };
  }

  function isCompleteTrendRecord(record) {
    return record.bodyWeight !== ""
      && Number.isFinite(numberValue(record.bodyWeight))
      && (record.totals?.calories || 0) > 0;
  }

  function averageBodyWeight(records) {
    if (!records.length) {
      return 0;
    }
    return round1(records.reduce((sum, record) => sum + numberValue(record.bodyWeight), 0) / records.length);
  }

  function summarizeExecutionQuality(records) {
    const sleepRecords = records.filter((record) => record.sleepScore !== "");
    const trainingRecords = records.filter((record) => record.dayType === "training");
    return {
      completeDays: records.length,
      avgSleep: sleepRecords.length
        ? round1(sleepRecords.reduce((sum, record) => sum + numberValue(record.sleepScore), 0) / sleepRecords.length)
        : 0,
      lowSleepDays: sleepRecords.filter((record) => numberValue(record.sleepScore) < 65).length,
      highHungerDays: records.filter((record) => record.hungerLevel === "high").length,
      poorPerformanceDays: trainingRecords.filter((record) => record.trainingPerformance === "poor").length,
      greatPerformanceDays: trainingRecords.filter((record) => record.trainingPerformance === "great").length,
      trainingDays: trainingRecords.length
    };
  }

  async function migrateLegacyLocalStorage() {
    const migrationFlag = await storage.getMeta("legacy_v8_migrated");
    if (migrationFlag) {
      return;
    }

    const [recordCount, favoriteCount] = await Promise.all([storage.countRecords(), storage.countFavorites()]);
    if (recordCount || favoriteCount) {
      await storage.setMeta("legacy_v8_migrated", { importedAt: nowIso(), skipped: true });
      return;
    }

    const legacyRecords = safeJsonParse(window.localStorage.getItem(LEGACY_RECORD_KEY), {});
    const legacyFavorites = safeJsonParse(window.localStorage.getItem(LEGACY_FAVORITE_KEY), []);
    const importedRecords = Object.values(legacyRecords || {}).map(normalizeRecord);
    const importedFavorites = Array.isArray(legacyFavorites) ? legacyFavorites.map(normalizeFavorite) : [];

    if (importedRecords.length) {
      await storage.putRecords(importedRecords);
    }
    if (importedFavorites.length) {
      await storage.putFavorites(importedFavorites);
    }
    await storage.setMeta("legacy_v8_migrated", {
      importedAt: nowIso(),
      recordCount: importedRecords.length,
      favoriteCount: importedFavorites.length
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").then((registration) => {
        if (registration.waiting) {
          setNotice("已检测到更新，重新打开应用后将自动生效", { tone: "ok", duration: 4000 });
        }
      }).catch(() => {});
    });
  }

  function createStorage() {
    function openDb() {
      return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error("浏览器不支持 IndexedDB"));
          return;
        }
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("records")) {
            db.createObjectStore("records", { keyPath: "date" });
          }
          if (!db.objectStoreNames.contains("favorites")) {
            db.createObjectStore("favorites", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("drafts")) {
            db.createObjectStore("drafts", { keyPath: "date" });
          }
          if (!db.objectStoreNames.contains("meta")) {
            db.createObjectStore("meta", { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains("dailyTargets")) {
            db.createObjectStore("dailyTargets", { keyPath: "date" });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB 打开失败"));
      });
    }

    const dbPromise = openDb();

    async function get(storeName, key) {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readonly").objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error(`读取 ${storeName} 失败`));
      });
    }

    async function getAll(storeName) {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error || new Error(`读取 ${storeName} 列表失败`));
      });
    }

    async function put(storeName, value) {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error(`写入 ${storeName} 失败`));
        tx.objectStore(storeName).put(value);
      });
    }

    async function putMany(storeName, values) {
      if (!values.length) {
        return;
      }
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error(`批量写入 ${storeName} 失败`));
        const store = tx.objectStore(storeName);
        values.forEach((value) => store.put(value));
      });
    }

    async function remove(storeName, key) {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error(`删除 ${storeName} 失败`));
        tx.objectStore(storeName).delete(key);
      });
    }

    async function removeMany(storeName, keys) {
      if (!keys.length) {
        return;
      }
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error(`批量删除 ${storeName} 失败`));
        const store = tx.objectStore(storeName);
        keys.forEach((key) => store.delete(key));
      });
    }

    async function count(storeName) {
      const db = await dbPromise;
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readonly").objectStore(storeName).count();
        request.onsuccess = () => resolve(request.result || 0);
        request.onerror = () => reject(request.error || new Error(`统计 ${storeName} 失败`));
      });
    }

    return {
      async getAllRecords() {
        return (await getAll("records")).sort((left, right) => left.date.localeCompare(right.date));
      },
      async getAllFavorites() {
        return await getAll("favorites");
      },
      async getAllTargets() {
        return (await getAll("dailyTargets")).sort((left, right) => left.date.localeCompare(right.date));
      },
      async getDraft(date) {
        return await get("drafts", date);
      },
      async putDraft(draft) {
        await put("drafts", draft);
      },
      async deleteDraft(date) {
        await remove("drafts", date);
      },
      async deleteDrafts(dates) {
        await removeMany("drafts", dates);
      },
      async putRecord(record) {
        await put("records", record);
      },
      async putRecords(records) {
        await putMany("records", records);
      },
      async deleteRecord(date) {
        await remove("records", date);
      },
      async putFavorite(favorite) {
        await put("favorites", favorite);
      },
      async putFavorites(favorites) {
        await putMany("favorites", favorites);
      },
      async putTargets(targets) {
        await putMany("dailyTargets", targets);
      },
      async deleteTargets(dates) {
        await removeMany("dailyTargets", dates);
      },
      async deleteFavorite(id) {
        await remove("favorites", id);
      },
      async getSettings() {
        return await this.getMeta(SETTINGS_META_KEY);
      },
      async putSettings(settings) {
        await this.setMeta(SETTINGS_META_KEY, settings);
      },
      async getMeta(key) {
        const row = await get("meta", key);
        return row ? row.value : undefined;
      },
      async setMeta(key, value) {
        await put("meta", { key, value });
      },
      async countRecords() {
        return await count("records");
      },
      async countFavorites() {
        return await count("favorites");
      }
    };
  }

  function normalizeRecord(record = {}) {
    const meals = normalizeMeals(record.meals);
    return {
      date: record.date || localDateString(),
      dayType: record.dayType === "rest" ? "rest" : "training",
      bodyWeight: normalizeLooseNumericText(record.bodyWeight),
      trainingPerformance: normalizeTrainingPerformance(record.trainingPerformance),
      hungerLevel: normalizeHungerLevel(record.hungerLevel),
      sleepScore: normalizeSleepScore(record.sleepScore),
      meals,
      totals: dayTotals(meals),
      savedAt: record.savedAt || nowIso()
    };
  }

  function normalizeDailyTarget(targetRow = {}) {
    const fallbackDayType = targetRow.dayType === "rest" ? "rest" : "training";
    const fallbackTarget = TARGETS[fallbackDayType] || TARGETS.training;
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(targetRow.date || "")) ? String(targetRow.date) : localDateString(),
      dayType: fallbackDayType,
      caloriesTarget: Math.round(Number(targetRow.caloriesTarget) || fallbackTarget.calories),
      proteinTarget: Math.round(Number(targetRow.proteinTarget) || fallbackTarget.protein),
      carbsTarget: Math.round(Number(targetRow.carbsTarget) || fallbackTarget.carbs),
      fatTarget: Math.round(Number(targetRow.fatTarget) || fallbackTarget.fat),
      weeklyAverageCalories: round1(Number(targetRow.weeklyAverageCalories) || 0),
      goalPhase: targetRow.goalPhase === "maintenance" ? "maintenance" : "cut",
      generatedAt: targetRow.generatedAt || nowIso(),
      sourceSettingsVersion: Math.max(0, Math.round(Number(targetRow.sourceSettingsVersion) || 0)),
      isManualOverride: !!targetRow.isManualOverride
    };
  }

  function normalizeDraft(draft) {
    if (!draft) {
      return null;
    }
    return {
      date: draft.date || localDateString(),
      dayType: draft.dayType === "rest" ? "rest" : "training",
      bodyWeight: normalizeLooseNumericText(draft.bodyWeight),
      trainingPerformance: normalizeTrainingPerformance(draft.trainingPerformance),
      hungerLevel: normalizeHungerLevel(draft.hungerLevel),
      sleepScore: normalizeSleepScore(draft.sleepScore),
      meals: normalizeMeals(draft.meals),
      updatedAt: draft.updatedAt || nowIso()
    };
  }

  function normalizeFavorite(favorite = {}) {
    const generatedId = favorite.id || `f_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
    const entries = Array.isArray(favorite.entries) && favorite.entries.length
      ? favorite.entries.map((entry) => normalizeEntry(entry))
      : [normalizeEntry({
        name: favorite.name,
        calories: favorite.calories,
        protein: favorite.protein,
        carbs: favorite.carbs,
        fat: favorite.fat
      })];
    const meaningfulEntries = entries.some(entryStarted) ? entries : [makeEntry()];
    return {
      id: generatedId,
      name: String(favorite.name || meaningfulEntries.filter(entryStarted).map((entry) => entry.name).join(" + ") || "未命名常用餐").trim(),
      entries: meaningfulEntries,
      createdAt: favorite.createdAt || nowIso(),
      updatedAt: favorite.updatedAt || favorite.savedAt || nowIso(),
      usageCount: Number.isFinite(Number(favorite.usageCount)) ? Number(favorite.usageCount) : 0,
      lastUsedAt: favorite.lastUsedAt || ""
    };
  }

  function hasUnsavedFormalChanges() {
    return !!state.dirty;
  }

  function getFilteredHistoryDates() {
    const search = state.historySearchText.trim().toLowerCase();
    return Object.keys(state.records)
      .sort((left, right) => right.localeCompare(left))
      .filter((date) => {
        const record = state.records[date];
        if (state.historyDateFilter && date !== state.historyDateFilter) {
          return false;
        }
        if (state.historyDayTypeFilter !== "all" && record.dayType !== state.historyDayTypeFilter) {
          return false;
        }
        if (!search) {
          return true;
        }
        const haystack = [
          date,
          fmtDate(date),
          record.dayType === "training" ? "训练日" : "休息日",
          record.bodyWeight || "",
          String(round1(record.totals?.calories || 0)),
          record.savedAt ? fmtDateTime(record.savedAt) : ""
        ].join(" ").toLowerCase();
        return haystack.includes(search);
      });
  }

  function getFilteredFavorites() {
    const search = state.favoriteSearchText.trim().toLowerCase();
    return state.favorites.filter((favorite) => {
      if (!search) {
        return true;
      }
      return favorite.name.toLowerCase().includes(search)
        || favorite.entries.some((entry) => String(entry.name || "").toLowerCase().includes(search));
    });
  }

  function renderWeightTrendChart(summary) {
    const points = summary.recent14;
    if (!points.length) {
      return '<div class="hint-box chart-empty" style="margin-top:12px">连续记录几天体重后，这里会显示最近 14 次趋势与目标线。</div>';
    }
    const values = points.map((record) => numberValue(record.bodyWeight));
    const goalWeight = summary.goalWeight || currentSettings().targetWeightKg;
    values.push(goalWeight);
    const minValue = Math.min(...values) - 0.6;
    const maxValue = Math.max(...values) + 0.6;
    const chartWidth = 320;
    const chartHeight = 160;
    const padX = 18;
    const padY = 16;
    const usableWidth = chartWidth - padX * 2;
    const usableHeight = chartHeight - padY * 2;
    const yFor = (value) => padY + (maxValue - value) / Math.max(maxValue - minValue, 0.1) * usableHeight;
    const xFor = (index) => points.length === 1
      ? chartWidth / 2
      : padX + (index / (points.length - 1)) * usableWidth;
    const polyline = points.map((record, index) => `${xFor(index)},${yFor(numberValue(record.bodyWeight))}`).join(" ");
    const goalY = yFor(goalWeight);
    const lastPoint = points[points.length - 1];
    return `
      <div class="weight-chart" style="margin-top:12px">
        <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="最近 14 次体重趋势图，包含目标体重线">
          <line x1="${padX}" y1="${goalY}" x2="${chartWidth - padX}" y2="${goalY}" class="goal-line"></line>
          <polyline points="${polyline}" class="weight-line"></polyline>
          ${points.map((record, index) => {
            const cx = xFor(index);
            const cy = yFor(numberValue(record.bodyWeight));
            const isLast = index === points.length - 1;
            return `<circle cx="${cx}" cy="${cy}" r="${isLast ? 4.5 : 3.2}" class="${isLast ? "weight-point current" : "weight-point"}"></circle>`;
          }).join("")}
          <text x="${chartWidth - padX}" y="${goalY - 6}" text-anchor="end" class="goal-label">目标 ${goalWeight} kg</text>
          <text x="${padX}" y="${chartHeight - 4}" text-anchor="start" class="axis-label">${fmtDate(points[0].date)}</text>
          <text x="${chartWidth - padX}" y="${chartHeight - 4}" text-anchor="end" class="axis-label">${fmtDate(lastPoint.date)}</text>
        </svg>
      </div>
    `;
  }

  function renderRollingAverageStat(label, actual, expected, unit) {
    const diff = round1(actual - expected);
    const tone = diff > rollingAverageTolerance(unit) ? "bad" : (diff < -rollingAverageTolerance(unit) ? "warn" : "ok");
    const deltaText = `${diff > 0 ? "+" : ""}${diff} ${unit}`;
    const kind = unit === "kcal" ? "calories" : labelType(label);
    return `
      <div class="stat">
        <div class="k">${label}</div>
        <div class="v">${round1(actual)}</div>
        <div class="h">目标日均 ${round1(expected)} ${unit}</div>
        ${progressMarkup(actual, expected, kind)}
        <div class="small" style="margin-top:6px">
          <span class="badge ${tone}">相差 ${deltaText}</span>
        </div>
      </div>
    `;
  }

  function progressMarkup(actual, expected, kind) {
    const safeExpected = Math.max(0, numberValue(expected));
    const safeActual = Math.max(0, numberValue(actual));
    const percent = safeExpected ? Math.round((safeActual / safeExpected) * 100) : 0;
    const width = Math.min(100, Math.max(0, percent));
    return `
      <div class="progress ${kind}" aria-hidden="true">
        <div style="width:${width}%"></div>
      </div>
    `;
  }

  function labelType(label) {
    if (label === "蛋白") return "protein";
    if (label === "碳水") return "carbs";
    if (label === "脂肪") return "fat";
    return "calories";
  }

  function rollingAverageTolerance(unit) {
    if (unit === "kcal") {
      return 100;
    }
    return 12;
  }

  function normalizeMeals(meals) {
    const source = Array.isArray(meals) ? meals : [];
    return MEAL_LABELS.map((label, index) => {
      const meal = source[index] || {};
      const entries = Array.isArray(meal.entries) && meal.entries.length
        ? meal.entries.map((entry) => normalizeEntry(entry))
        : [makeEntry()];
      return {
        id: index + 1,
        label,
        entries
      };
    });
  }

  function normalizeEntry(entry = {}) {
    return {
      name: String(entry.name ?? ""),
      calories: normalizeLooseNumericText(entry.calories),
      protein: normalizeLooseNumericText(entry.protein),
      carbs: normalizeLooseNumericText(entry.carbs),
      fat: normalizeLooseNumericText(entry.fat)
    };
  }

  function normalizeTrainingPerformance(value) {
    return PERFORMANCE_LEVELS[value] ? value : "normal";
  }

  function normalizeHungerLevel(value) {
    return HUNGER_LEVELS[value] ? value : "medium";
  }

  function normalizeSleepScore(value) {
    const text = normalizeLooseNumericText(value);
    if (text === "") {
      return "";
    }
    const number = Number(text);
    if (!Number.isFinite(number)) {
      return "";
    }
    return String(Math.round(Math.max(0, Math.min(100, number))));
  }

  function dayHasMeaningfulInput(data) {
    return data.dayType !== DEFAULT_DAY_TYPE
      || String(data.bodyWeight || "").trim() !== ""
      || normalizeTrainingPerformance(data.trainingPerformance) !== "normal"
      || normalizeHungerLevel(data.hungerLevel) !== "medium"
      || normalizeSleepScore(data.sleepScore) !== ""
      || normalizeMeals(data.meals).some(filledMeal);
  }

  function shouldRestoreDraft(draft, saved) {
    if (!saved) {
      return dayHasMeaningfulInput(draft);
    }
    return !sameDayData(draft, saved);
  }

  function sameDayData(left, right) {
    return JSON.stringify(comparableDayData(left)) === JSON.stringify(comparableDayData(right));
  }

  function sameFavoriteData(left, right) {
    return JSON.stringify(comparableFavoriteData(left)) === JSON.stringify(comparableFavoriteData(right));
  }

  function comparableDayData(data) {
    return {
      dayType: data.dayType === "rest" ? "rest" : "training",
      bodyWeight: normalizeLooseNumericText(data.bodyWeight),
      trainingPerformance: normalizeTrainingPerformance(data.trainingPerformance),
      hungerLevel: normalizeHungerLevel(data.hungerLevel),
      sleepScore: normalizeSleepScore(data.sleepScore),
      meals: normalizeMeals(data.meals).map((meal) => ({
        label: meal.label,
        entries: meal.entries.map((entry) => ({
          name: String(entry.name ?? "").trim(),
          calories: normalizeLooseNumericText(entry.calories),
          protein: normalizeLooseNumericText(entry.protein),
          carbs: normalizeLooseNumericText(entry.carbs),
          fat: normalizeLooseNumericText(entry.fat)
        }))
      }))
    };
  }

  function comparableFavoriteData(data) {
    const favorite = normalizeFavorite(data);
    return {
      id: favorite.id,
      name: String(favorite.name || "").trim(),
      entries: favorite.entries
        .map((entry) => normalizeEntry(entry))
        .filter(entryStarted)
        .map((entry) => ({
          name: String(entry.name ?? "").trim(),
          calories: normalizeLooseNumericText(entry.calories),
          protein: normalizeLooseNumericText(entry.protein),
          carbs: normalizeLooseNumericText(entry.carbs),
          fat: normalizeLooseNumericText(entry.fat)
        })),
      usageCount: Number.isFinite(Number(favorite.usageCount)) ? Number(favorite.usageCount) : 0,
      lastUsedAt: String(favorite.lastUsedAt || ""),
      updatedAt: String(favorite.updatedAt || ""),
      createdAt: String(favorite.createdAt || "")
    };
  }

  function makeEntry() {
    return { name: "", calories: "", protein: "", carbs: "", fat: "" };
  }

  function mealTemplate() {
    return MEAL_LABELS.map((label, index) => ({
      id: index + 1,
      label,
      entries: [makeEntry()]
    }));
  }

  function clone(value) {
    return typeof structuredClone === "function"
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(dateText, offset) {
    const date = new Date(`${dateText}T00:00:00`);
    date.setDate(date.getDate() + offset);
    return localDateString(date);
  }

  function daysBetween(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    const end = new Date(`${endDate}T00:00:00`).getTime();
    return Math.round((end - start) / 86400000);
  }

  function dateRange(startDate, endDate) {
    const dates = [];
    if (!startDate || !endDate || daysBetween(startDate, endDate) < 0) {
      return dates;
    }
    let cursor = startDate;
    while (cursor <= endDate) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }
    return dates;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function fmtDate(dateText) {
    try {
      return new Date(`${dateText}T00:00:00`).toLocaleDateString("zh-CN", {
        month: "numeric",
        day: "numeric",
        weekday: "short"
      });
    } catch {
      return dateText;
    }
  }

  function fmtDateTime(isoText) {
    try {
      return new Date(isoText).toLocaleString("zh-CN", {
        hour12: false,
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoText;
    }
  }

  function fmtTime(isoText) {
    try {
      return new Date(isoText).toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "";
    }
  }

  function exportTimestamp(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    return `${year}${month}${day}-${hour}${minute}`;
  }

  function daysLeft() {
    const targetMs = new Date(`${currentSettings().targetDate}T00:00:00`).getTime();
    const todayMs = new Date(`${localDateString()}T00:00:00`).getTime();
    return Math.max(0, Math.ceil((targetMs - todayMs) / 86400000));
  }

  function safeJsonParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeLooseNumericText(value) {
    const text = String(value ?? "").trim().replace(/，/g, ".").replace(/,/g, ".");
    if (!text) {
      return "";
    }
    const number = Number(text);
    if (!Number.isFinite(number)) {
      return text;
    }
    return trimTrailingZeros(number.toFixed(1));
  }

  function trimTrailingZeros(text) {
    return String(text).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  }

  function numberValue(value) {
    const number = Number(String(value ?? "").trim().replace(/，/g, ".").replace(/,/g, "."));
    return Number.isFinite(number) ? number : 0;
  }

  function round1(value) {
    return Math.round(value * 10) / 10;
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function $(id) {
    return document.getElementById(id);
  }

  function handleAsyncError(error) {
    console.error(error);
    setNotice("操作失败，请稍后重试", { tone: "bad", duration: 4000 });
  }
})();
