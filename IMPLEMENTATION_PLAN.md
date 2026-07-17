# Macro Tracker Redesign Implementation Plan

Status: proposed for review  
Starting application version: 2.3.3  
Implementation rule: one foundation/screen phase per focused commit and review checkpoint

## Scope And Constraints

The redesign will preserve:

- nutrition formulas and target behavior;
- saved records, drafts, favorites, settings, manual target overrides, and target snapshots;
- IndexedDB schema and legacy migration;
- CSV structure and import/export behavior;
- Today, History, Overview, Settings, Help, and Import flows;
- Chinese and Spanish support;
- cream and muted-green brand direction;
- offline PWA behavior.

The redesign will not:

- add a framework;
- add a visual or animation dependency;
- introduce URL routing;
- alter nutrition calculations during UI phases;
- redesign multiple main screens in one review unit;
- use broad glassmorphism, decorative gradients, or indiscriminate pill styling.

## Phase 0: Audit And Planning

Deliverables:

- `CURRENT_UI_AUDIT.md`
- `REDESIGN_SYSTEM.md`
- `IMPLEMENTATION_PLAN.md`

Verification:

- syntax check;
- nutrition-engine tests;
- static app-shell HTTP smoke;
- source version consistency scan;
- repository status review.

Commit:

```text
docs: audit current UI and plan product redesign
```

Review gate:

- confirm design principles, screen order, responsive targets, and protected business boundaries;
- resolve whether desktop should remain a focused column or gain split layouts;
- establish screenshot automation before Phase 1.

## Phase 1: Shared Design Foundation

Goal: establish a coherent system without redesigning screen content.

Expected changes:

- reorganize CSS variables into color, type, spacing, radius, shadow, material, and motion tokens;
- normalize button, field, status, disclosure, card, and icon-button primitives;
- add reduced-transparency and increased-contrast support;
- remove zoom restrictions and set keyboard-safe editable text sizes;
- improve modal focus containment, inert background behavior, and focus restoration;
- centralize press feedback and reduced-motion behavior;
- reserve stable geometry for loading/status regions;
- add small shared rendering helpers only when they replace repeated markup.

Likely files:

- `styles.css`
- `index.html`
- `app.js`
- version/cache files if runtime assets change

Protected files/areas:

- nutrition-engine functions;
- normalization and persistence schemas;
- CSV parsing/export.

Tests:

- existing nutrition tests;
- modal keyboard/focus smoke;
- language switch smoke;
- PWA app-shell smoke;
- horizontal overflow checks.

Screenshots:

- before/after shared shell at 390x844, 430x932, and 1024x768;
- Settings and Help in Chinese and Spanish;
- keyboard-open Today state.

Commit:

```text
feat(ui): establish shared redesign foundation
```

Stop for review before changing Today structure.

## Phase 2: Today

Goal: make logging a meal the fastest and clearest path.

Expected changes:

- unify macro header hierarchy;
- refine daily-data collapsed and expanded states;
- simplify meal rows and preserve in-place open/close behavior;
- redesign food-entry hierarchy around name, calories, and macros;
- replace nested favorite selection with an anchored, target-specific surface;
- preserve per-food Save Favorite and Apply Favorite behavior;
- improve add-food scrolling and focus with the iPhone keyboard;
- make draft/saved/error feedback consistent and non-repetitive;
- maintain incomplete-record reminder above meals.

Tests:

- add/edit/delete food;
- add second food and focus it;
- apply favorite only to the target food;
- save favorite from each food;
- switch/open/close meals;
- next-meal behavior;
- draft auto-save and restore;
- formal save;
- training/rest target updates;
- incomplete reminder date navigation;
- Chinese/Spanish at narrow widths.

Screenshots:

- Today empty, partially entered, complete, warning, and saved;
- one and multiple foods;
- favorite picker;
- 390 and 430 px with keyboard closed/open;
- desktop.

Commit:

```text
feat(today): redesign the daily logging workflow
```

Stop for review before changing History.

## Phase 3: History

Goal: make incomplete work and past records easier to scan and act on.

Expected changes:

- lead with incomplete records when present;
- simplify saved-record rows;
- place filters adjacent to the record list;
- move backup/import into a secondary tools layer;
- clarify Records versus Favorites without changing behavior;
- preserve native date-chip navigation;
- keep deletion visually secondary and explicit;
- improve empty and filtered-empty states.

Tests:

- incomplete statuses and Open actions;
- date/type/text filtering;
- favorite search debounce;
- favorite edit/delete/apply;
- CSV export;
- legacy CSV import preview and confirmation;
- collision/invalid-row states;
- draft-only date restoration.

Screenshots:

- History with and without incomplete records;
- filtered and empty states;
- Favorites;
- import preview;
- Chinese/Spanish mobile and desktop.

Commit:

```text
feat(history): redesign records and recovery workflows
```

Stop for review before changing Overview.

## Phase 4: Overview

Goal: answer "Am I on plan, and can I trust the conclusion?" with less repetition.

Expected changes:

- create one weekly conclusion with coverage/confidence;
- move urgent anomalies and incomplete-data warnings upward;
- consolidate macro variance into one comparison module;
- make weight trend the primary visualization;
- combine recovery and calendar into secondary detail;
- preserve every current metric and insight through disclosure;
- adapt the analytical layout for wider screens.

Tests:

- 0, partial, and 7+ days of records;
- incomplete dates present/absent;
- missing weight and sparse sleep data;
- weight trend directions;
- anomalies;
- training/rest calendar markers;
- live target averages;
- Chinese/Spanish long guidance.

Screenshots:

- empty/insufficient Overview;
- complete 7-day Overview;
- anomaly state;
- weight trend;
- expanded details;
- mobile and desktop.

Commit:

```text
feat(overview): simplify weekly progress and trends
```

Stop for review before final QA.

## Phase 5: Responsive, Accessibility, And Motion QA

Goal: finish the redesign as a product, not a set of static screens.

Work:

- test 320, 360, 390, 430, 768, 1024, and 1440 px widths;
- test iPhone Safari and standalone PWA behavior;
- test keyboard opening, closing, orientation, and active-field visibility;
- test Chinese and Spanish across all states;
- test 200% zoom and large text;
- test keyboard-only navigation;
- test screen-reader names/roles/live regions;
- test reduced motion, reduced transparency, and increased contrast;
- inspect press, disclosure, sheet, insert, save, and error motion frame-by-frame;
- remove incidental layout shifts and overflow;
- update final visual regression screenshots.

Tests:

- full existing test suite;
- static production smoke;
- manual regression checklist for all persisted workflows;
- service-worker update verification;
- version consistency scan.

Commit:

```text
fix(ui): complete responsive accessibility and motion QA
```

## Test Matrix For Every Implementation Phase

### Automated

```sh
node --check app.js
node nutrition-engine.test.js
```

Add focused UI tests only if they can run without introducing a production dependency. Nutrition tests remain authoritative for business-logic preservation.

### Production Smoke

This repository is an unbundled static PWA, so "production build" means validating the exact app shell served over HTTP:

```sh
python3 -m http.server 8765
curl -I http://127.0.0.1:8765/index.html
curl -I http://127.0.0.1:8765/app.js
curl -I http://127.0.0.1:8765/styles.css
curl -I http://127.0.0.1:8765/manifest.json
```

There is currently no package manifest or build command. A bundler will not be introduced solely to satisfy a nominal build step.

### Data Regression

For every phase:

- open an existing saved day;
- restore a differing draft;
- add and apply a favorite;
- save a day;
- export CSV;
- preview/import a legacy CSV;
- reload and confirm persistence;
- verify manual target overrides and live targets remain unchanged.

### Visual Regression

Capture before and after:

- same viewport;
- same language;
- same seeded data/state;
- same scroll position;
- keyboard state recorded;
- filenames include phase, screen, width, language, and before/after.

Proposed location:

```text
artifacts/screenshots/
  phase-01-foundation/
  phase-02-today/
  phase-03-history/
  phase-04-overview/
  phase-05-qa/
```

Screenshots are review artifacts and should not enter the production app shell or service-worker cache.

## Commit And Review Discipline

Before each phase:

1. Confirm the working tree is clean or identify user-owned changes.
2. Capture the before state.
3. Limit edits to the phase.

Before each commit:

1. Review the diff for nutrition/persistence changes.
2. Run automated tests.
3. Run static production smoke.
4. Inspect mobile and desktop layouts.
5. Capture after screenshots.
6. Document changed files, regressions, and unresolved issues.

At each stop, provide:

- commit hash;
- changed files;
- test results;
- screenshot paths;
- known regressions;
- decisions required for the next phase.

## Known Setup Gaps

- The current directory was not a Git repository at audit start. A repository baseline is required before focused phase commits can exist.
- The Codex browser-control runtime was unavailable during the audit, so the first fresh screenshot baseline is still required.
- There is no production build tool; the shipped source is the production artifact.

These gaps do not justify changing application architecture. They should be resolved as project tooling around the existing static app.
