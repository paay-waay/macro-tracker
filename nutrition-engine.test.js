const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeElement() {
  return {
    textContent: "",
    innerHTML: "",
    className: "",
    value: "",
    checked: false,
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    removeEventListener() {},
    appendChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    setAttribute() {},
    removeAttribute() {}
  };
}

function loadHooks() {
  const appPath = path.join(__dirname, "app.js");
  const code = fs.readFileSync(appPath, "utf8");
  const storage = new Map();
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    Math,
    Date,
    Blob: function Blob() {},
    URL: { createObjectURL() { return ""; }, revokeObjectURL() {} },
    __MACRO_TRACKER_TEST__: true
  };
  sandbox.globalThis = sandbox;
  sandbox.window = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    indexedDB: {
      open() {
        const request = {};
        setTimeout(() => {
          request.result = {
            objectStoreNames: { contains: () => true },
            createObjectStore() {},
            transaction() {
              return {
                objectStore() {
                  return {
                    get() { return {}; },
                    getAll() { return {}; },
                    put() { return {}; },
                    delete() { return {}; },
                    count() { return {}; }
                  };
                }
              };
            }
          };
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      }
    },
    addEventListener() {},
    setTimeout,
    clearTimeout
  };
  sandbox.document = {
    title: "",
    documentElement: { lang: "zh-CN" },
    getElementById: () => makeElement(),
    querySelector: () => makeElement(),
    querySelectorAll: () => [],
    addEventListener() {}
  };
  sandbox.navigator = { serviceWorker: null };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: appPath });
  return sandbox.__MACRO_TRACKER_TEST_HOOKS__;
}

const hooks = loadHooks();
const today = "2026-06-12";

{
  assert.strictEqual(
    hooks.shouldHideFloatingDock(844, 510, true),
    true,
    "the floating dock should hide when a focused text field opens the software keyboard"
  );
  assert.strictEqual(
    hooks.shouldHideFloatingDock(844, 760, true),
    false,
    "small visual viewport changes should not be mistaken for the software keyboard"
  );
  assert.strictEqual(
    hooks.shouldHideFloatingDock(844, 510, false),
    false,
    "the floating dock should remain available when no text-entry control is focused"
  );
}

{
  assert.strictEqual(
    hooks.shouldPreventOverscroll(0, 1800, 844, 12),
    true,
    "pulling down at the top should not move the page past its boundary"
  );
  assert.strictEqual(
    hooks.shouldPreventOverscroll(420, 1800, 844, 12),
    false,
    "normal scrolling inside the page should remain available"
  );
  assert.strictEqual(
    hooks.shouldPreventOverscroll(956, 1800, 844, -12),
    true,
    "pushing past the bottom should not move the page past its boundary"
  );
}

function makeRecords(days, startWeight, dailyWeightDelta, calories) {
  const dates = hooks.dateRange(today, hooks.addDays(today, days - 1));
  return dates.map((date, index) => ({
    date,
    dayType: index % 2 ? "rest" : "training",
    bodyWeight: String(startWeight + dailyWeightDelta * index),
    trainingPerformance: "normal",
    hungerLevel: "medium",
    sleepScore: 78,
    totals: { calories, protein: 140, carbs: 220, fat: 60 }
  }));
}

function recordsByDate(records) {
  return Object.fromEntries(records.map((record) => [record.date, record]));
}

function settings(overrides = {}) {
  return hooks.normalizeSettings({
    bmr: 1700,
    currentWeightKg: 78,
    targetWeightKg: 75,
    targetDate: hooks.addDays(today, 60),
    activityLevel: "medium",
    trainingDaysPerWeek: 4,
    trackingAccuracyBuffer: "medium",
    calibratedTdee: 2500,
    ...overrides
  });
}

{
  const result = hooks.estimateObservedTdee(makeRecords(21, 80, -0.04, 2100), settings({ goalMode: "maintain" }));
  assert(result.observedTdee > 2100, "weight loss should make observed TDEE higher than intake");
}

{
  const result = hooks.estimateObservedTdee(makeRecords(21, 78, 0.04, 2500), settings({ goalMode: "leanGain" }));
  assert(result.observedTdee < 2500, "weight gain should make observed TDEE lower than intake");
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ calibratedTdee: "" }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.strictEqual(live.finalTdee, 2550, "insufficient data should fall back to formula TDEE");
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetWeightKg: 77.3, targetDate: hooks.addDays(today, 30) }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(live.plannedDailyDeficit > 150 && live.plannedDailyDeficit < 220, "small target-date deficit must not be forced to 400");
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetWeightKg: 70, targetDate: hooks.addDays(today, 30) }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(live.plannedDailyDeficit <= 600, "unsafe target-date deficit should be capped");
  assert(live.explanation.modeDetails.infeasible, "infeasible target date should be marked");
  assert(live.explanation.modeDetails.achievableDate, "infeasible target should include achievable date");
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetWeightKg: 78 }),
    records: {},
    bodyWeight: 77.8,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(live.plannedDailyDeficit <= 0, "current weight below target should not continue fat-loss deficit");
}

{
  const live = hooks.computeLiveTargets(today, "rest", {
    settings: settings({ goalMode: "summerCut", calibratedTdee: 1800, targetWeightKg: 70, targetDate: hooks.addDays(today, 20) }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(live.plannedAverageCalories >= 1955, "calorie floor should be BMR * 1.15 for BMR 1700");
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "maintain", trackingAccuracyBuffer: "high" }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.strictEqual(live.plannedAverageCalories, 2500, "tracking buffer should not silently subtract calories");
  assert.strictEqual(live.trackingBufferCalories, 0);
}

{
  const live = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "maintain", trackingAccuracyBuffer: 300 }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.strictEqual(live.plannedAverageCalories, 2200, "manual calorie buffer should subtract from daily targets");
  assert.strictEqual(live.trackingBufferCalories, 300);
}

{
  const split = hooks.splitCaloriesByDayType(settings({ trainingDaysPerWeek: 4 }), 2200, 1600, [], 100);
  const weekly = split.trainingCalories * 4 + split.restCalories * 3;
  assert(Math.abs(weekly - 2200 * 7) <= 20, "training/rest split should preserve weekly calories after rounding");
}

{
  const target = hooks.macroTargetForCalories(2000, settings({ goalMode: "maintain" }), hooks.GOAL_MODE_CONFIG.maintain, 78, []);
  assert.strictEqual(target.protein, 140, "maintain protein should be body weight * 1.8");
  assert(target.fat >= 55, "fat floor should include body weight * 0.7");
  const macroCalories = target.protein * 4 + target.carbs * 4 + target.fat * 9;
  assert(Math.abs(macroCalories - target.calories) <= 8, "macro calories should match prescribed calories after rounding");
}

{
  const lean = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "leanGain" }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.strictEqual(lean.plannedAverageCalories, 2700, "lean gain should default to calibrated TDEE +200");

  const cut = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetWeightKg: 75, targetDate: hooks.addDays(today, 46) }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(cut.plannedDailyDeficit <= 600, "summer cut deficit should remain within safe cap");
}

{
  const existingRecords = recordsByDate(makeRecords(3, 78, 0, 2200));
  const before = JSON.stringify(existingRecords);
  hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetWeightKg: 74 }),
    records: existingRecords,
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.strictEqual(JSON.stringify(existingRecords), before, "target recalculation must not mutate historical records");
}

{
  const startDate = hooks.addDays(today, -119);
  const historicalRecords = hooks.dateRange(startDate, today).map((date, index) => ({
    date,
    dayType: index % 3 === 0 ? "rest" : "training",
    bodyWeight: String(82 - index * 0.025),
    trainingPerformance: index % 3 === 0 ? "" : "normal",
    hungerLevel: "medium",
    sleepScore: 76,
    totals: { calories: 2250 + (index % 5) * 20, protein: 150, carbs: 250, fat: 65 }
  }));
  const historicalByDate = recordsByDate(historicalRecords);
  hooks.state.records = historicalByDate;
  hooks.rebuildRecordIndexes();
  const indexed = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "maintain", calibratedTdee: "" }),
    bodyWeight: 79,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  const direct = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "maintain", calibratedTdee: "" }),
    records: historicalByDate,
    bodyWeight: 79,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert.deepStrictEqual(indexed.selectedTarget, direct.selectedTarget, "indexed record access must preserve target results");
  assert.strictEqual(hooks.recordsInDateRange(hooks.addDays(today, -6), today).length, 7, "date range index should return only requested records");
  hooks.state.records = {};
  hooks.rebuildRecordIndexes();
}

{
  const past = hooks.computeLiveTargets(today, "training", {
    settings: settings({ goalMode: "summerCut", targetDate: hooks.addDays(today, -1), targetWeightKg: 74 }),
    records: {},
    bodyWeight: 78,
    allowInitialFallback: false,
    ignoreManualOverride: true
  });
  assert(Number.isFinite(past.plannedAverageCalories), "past target dates should not produce invalid targets");
}

function completeRecord(date, overrides = {}) {
  return hooks.normalizeRecord({
    date,
    dayType: "training",
    bodyWeight: "78.20",
    trainingPerformance: "normal",
    hungerLevel: "medium",
    sleepScore: "80",
    meals: [
      {
        id: 1,
        entries: [{ name: "Rice bowl", calories: "650", protein: "42", carbs: "78", fat: "18" }]
      },
      {
        id: 2,
        entries: [{ name: "Shake", calories: "240", protein: "32", carbs: "18", fat: "4" }]
      }
    ],
    ...overrides
  });
}

{
  const yesterday = hooks.addDays(today, -1);
  const issues = hooks.getIncompleteRecordDates({
    today,
    records: {},
    drafts: {
      [yesterday]: hooks.normalizeDraft({
        date: yesterday,
        dayType: "rest",
        bodyWeight: "78.00",
        hungerLevel: "medium",
        sleepScore: "82",
        meals: [{ id: 1, entries: [{ name: "Yogurt", calories: "220", protein: "20", carbs: "20", fat: "5" }] }]
      })
    }
  });
  assert.strictEqual(issues[0].status, "draftOnly", "draft-only past dates should be surfaced");
}

{
  const date = hooks.addDays(today, -2);
  const record = completeRecord(date, { trainingPerformance: "" });
  const issue = hooks.getIncompleteRecordIssues(date, { records: { [date]: record }, drafts: {} });
  assert.strictEqual(issue.status, "savedIssues", "saved records with missing required fields should be incomplete");
  assert(issue.issues.some((item) => item.key === "missingTrainingPerformance"), "training day should require performance");
}

{
  const date = hooks.addDays(today, -3);
  const record = completeRecord(date, { bodyWeight: "" });
  const issue = hooks.getIncompleteRecordIssues(date, { records: { [date]: record }, drafts: {} });
  assert(issue.issues.some((item) => item.key === "missingBodyWeight"), "missing body weight should be flagged");
  assert(hooks.recordHasMeaningfulFood(record), "records with food should not be treated as zero intake");
}

{
  const date = hooks.addDays(today, -3);
  const record = completeRecord(date, {
    meals: [{ id: 1, entries: [{ name: "Toast", calories: "300", protein: "12", carbs: "45", fat: "8" }] }]
  });
  const issue = hooks.getIncompleteRecordIssues(date, { records: { [date]: record }, drafts: {} });
  assert(issue.issues.some((item) => item.key === "missingFood"), "single-meal past records should be flagged as incomplete");
  assert(hooks.recordHasMeaningfulFood(record), "single-meal records should still keep their actual intake");
}

{
  const firstDate = hooks.addDays(today, -4);
  const beforeTracking = hooks.addDays(today, -5);
  const items = hooks.getIncompleteRecordDates({
    today,
    records: { [firstDate]: completeRecord(firstDate) },
    drafts: {}
  });
  assert(items.some((item) => item.date === hooks.addDays(today, -1) && item.status === "noRecord"), "missing dates after tracking starts should be flagged");
  assert(!items.some((item) => item.date === beforeTracking), "dates before first saved record should not be flagged");
}

{
  const date = hooks.addDays(today, -1);
  const record = completeRecord(date);
  const draft = hooks.normalizeDraft({ ...record, hungerLevel: "high" });
  const issue = hooks.getIncompleteRecordIssues(date, { records: { [date]: record }, drafts: { [date]: draft } });
  assert.strictEqual(issue.status, "draftDiffers", "drafts that differ from saved records should be surfaced");
}

{
  const dates = [hooks.addDays(today, -2), hooks.addDays(today, -1), today];
  hooks.state.date = today;
  hooks.state.records = Object.fromEntries(dates.map((date, index) => [date, completeRecord(date, {
    bodyWeight: String(78.4 - index * 0.1),
    targetSnapshot: {
      date,
      dayType: "training",
      calories: 2000,
      protein: 150,
      carbs: 220,
      fat: 60,
      sourceVersion: "2.3.5"
    }
  })]));
  hooks.state.drafts = { [dates[0]]: hooks.normalizeDraft({ date: dates[0], dayType: "training" }) };
  hooks.state.favorites = [{ id: "fav-legacy", name: "常用早餐", entries: [] }];
  hooks.rebuildRecordIndexes();

  const overview = hooks.buildOverviewSnapshot();
  assert.strictEqual(overview.rolling7.coveredDays, 3, "overview coverage should count actual saved days");
  assert.strictEqual(overview.rolling7.average.calories, 890, "overview averages must not dilute logged intake across missing days");
  assert.strictEqual(overview.rolling7.target.calories, 2000, "overview must honor targets saved by older versions");

  assert(hooks.renderHistoryItem(dates[0]).includes(`data-delete-record="${dates[0]}"`), "every saved history row should expose deletion");
  assert(hooks.renderHistoryItem(dates[0]).includes(`data-select-history-date="${dates[0]}"`), "every saved history row should expose batch selection");
  assert(hooks.renderIncompleteRecordRow({ date: dates[0], status: "savedIssues", issues: [] }).includes(`data-delete-record="${dates[0]}"`), "saved records in the incomplete list should expose deletion");
  assert(!hooks.renderIncompleteRecordRow({ date: hooks.addDays(today, -4), status: "draftOnly", issues: [] }).includes("data-delete-record"), "draft-only reminders should not claim to delete a saved history record");

  hooks.state.ui.historyRecordsOpen = true;
  const historyMarkup = hooks.renderHistory();
  assert(historyMarkup.includes("deleteSelectedRecordsBtn"), "history should expose a batch-delete action");
  assert(historyMarkup.includes("deleteAllHistoryBtn"), "history should expose a one-click delete-all action");

  hooks.state.selectedHistoryDates = [dates[0], dates[1]];
  hooks.removeRecordsDataFromState([dates[0], dates[1]]);
  assert.strictEqual(hooks.state.records[dates[0]], undefined, "record deletion should remove the selected history record");
  assert.strictEqual(hooks.state.records[dates[1]], undefined, "batch deletion should remove every selected history record");
  assert(hooks.state.records[dates[2]], "batch deletion should preserve unselected history records");
  assert.strictEqual(hooks.state.drafts[dates[0]], undefined, "record deletion should remove the matching draft");
  assert.strictEqual(hooks.state.favorites[0].id, "fav-legacy", "record deletion must preserve frequent meals");
  assert.strictEqual(hooks.state.selectedHistoryDates.length, 0, "deleted records should leave the batch selection");
}

console.log("nutrition-engine tests passed");
