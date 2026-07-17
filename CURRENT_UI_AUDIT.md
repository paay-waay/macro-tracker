# Macro Tracker Current UI Audit

Audit date: 2026-07-17  
Application version: 2.3.3  
Audit scope: repository architecture, product structure, interaction model, persistence, nutrition calculations, responsive behavior, iPhone keyboard behavior, accessibility, and current visual system.

## Executive Summary

Macro Tracker is a capable offline-first nutrition tool whose functional depth has outgrown its visual structure. The product already protects user data well, supports Chinese and Spanish, recalculates targets live, restores drafts, surfaces incomplete records, and handles iPhone keyboard movement. The redesign should preserve those strengths while making the common loop feel faster:

1. See today's remaining macros.
2. Open the relevant meal.
3. Add or apply a food.
4. Confirm that the draft is safe.
5. Save the day when it is complete.

The primary UI issue is not lack of functionality. It is that many surfaces receive similar visual weight: most information is inside rounded bordered containers, secondary guidance competes with primary values, and controls do not consistently communicate whether they navigate, disclose, edit, or commit. Today is workable but visually dense; History combines maintenance tools and records; Overview repeats status across multiple cards and badges.

The redesign should be an interface refactor around existing business functions, not a rewrite. The most important technical constraint is that `app.js` contains state, persistence, nutrition logic, i18n, event delegation, and markup generation in one file. Changes must therefore be staged by shared primitives and one screen at a time.

## Repository And Architecture

The repository is a small static PWA with no external runtime dependencies and no package/build system.

| File | Role | Current size |
| --- | --- | ---: |
| `app.js` | State, i18n, rendering, interactions, persistence, CSV, nutrition engine | ~6,976 lines / 288 KB |
| `styles.css` | Complete visual and responsive system | ~2,652 lines / 48 KB |
| `index.html` | Static app shell, bottom navigation, modals | 127 lines |
| `sw.js` | Offline app-shell cache and service worker lifecycle | 99 lines |
| `manifest.json` | PWA metadata | 17 lines |
| `nutrition-engine.test.js` | VM-based engine and incomplete-record tests | 396 lines |
| PNG icons | PWA and Apple touch icons | 192, 512, and 180 px variants |

There is no React/Vue component tree. "Components" are template-returning functions in `app.js`, with global delegated `click`, `input`, and `change` handlers.

### Rendering Structure

- `render()` selects one of `renderToday()`, `renderHistory()`, or `renderOverview()`.
- `renderHeader()` independently rebuilds the macro header, notices, modal visibility, navigation state, and open modal content.
- Most view changes replace `#view.innerHTML`.
- High-frequency food and sleep input paths partly avoid full view replacement through `refreshTodayLiveBits()`, `refreshDailyContextLiveBits()`, and `refreshFavoriteDraftLiveBits()`.
- UI expansion state lives in `state.ui` and is persisted separately.

This structure is viable for a staged redesign, provided shared markup conventions are introduced deliberately and rendering remains function-based.

### Navigation And Routes

There are no URL routes or history entries. The product has three in-memory destinations:

- `today`
- `history`
- `overview`

`state.view` selects the destination. Settings, Help, and Import Preview are modal layers. Date changes reuse the existing `switchDate()` and `hydrateCurrentDate()` flow. Future work must preserve these destinations and flows even though there are no browser routes to preserve.

### State Management

One mutable `state` object holds:

- current date and daily context;
- four meals and their food entries;
- saved records and draft index;
- favorites;
- daily target overrides;
- settings and settings draft;
- current view and active meal;
- modal, notice, dirty, import, history, and search state;
- persisted UI disclosure state.

Global event delegation keeps listeners simple, but broad rerenders can replace focused controls. The redesign must protect focus, selection, and scroll position during entry.

## Persistence And Data Safety

IndexedDB database `macro-tracker-v13`, version 2, is the primary store. It contains records, drafts, favorites, daily targets, and metadata. The app also migrates legacy localStorage records and favorites.

localStorage is limited to:

- `macro_tracker_language_v1`
- `macro_tracker_ui_v17`

Important existing behavior to preserve:

- Drafts auto-save after input settles and flush on document hide.
- A saved record and a differing draft can coexist.
- Switching date uses the existing dirty/draft flow.
- CSV export retains stable structural field names.
- CSV import previews collisions and invalid rows before writing.
- Daily target rows only affect calculations when explicitly marked as manual overrides.
- Clearing tracking data preserves settings and favorites.

No visual refactor should change IndexedDB names, object-store shapes, normalization rules, CSV headers, migration order, or draft comparison semantics.

## Nutrition Calculation Boundary

The active calculation path is centralized around:

- `computeLiveTargets()`
- `computeSettingsPreview()`
- `estimateObservedTdee()`
- `splitCaloriesByDayType()`
- `macroTargetForCalories()`
- `targetForDate()`
- `stats()`

The engine combines current settings, effective weight, recent records, observed TDEE confidence, recovery indicators, goal mode, manual calorie subtraction, training frequency, and safe floors. Saved records may include a target snapshot. Tests cover formula fallback, manual calorie subtraction, training/rest splits, safe deficits, target-date behavior, immutability, indexed record access, and incomplete-record logic.

Redesign rule: UI functions may change how results are grouped, labeled, disclosed, and visualized. They must not change formula inputs, formula branches, target rounding, record inclusion, or warnings.

## Current Visual System

### Strengths

- The cream background and muted green accent feel calm and appropriate for a daily health tool.
- Macro categories have distinguishable low-saturation colors.
- System fonts, tabular numerals, and restrained shadows support legibility.
- Tap targets are generally near or above 44 px.
- The header keeps today's macro status visible.
- Active, warning, error, loading, empty, and saved states already exist.
- Chinese and Spanish use the same rendering paths.

### Structural Weaknesses

1. **Container inflation.** Cards, inner cards, hints, stats, badges, pills, segmented controls, and inputs often stack borders and rounded corners. Grouping is communicated more by outlines than by hierarchy and spacing.
2. **Competing emphasis.** Macro values, status badges, insight cards, warning chips, and section titles frequently appear at similar weight.
3. **Ambiguous control grammar.** A rounded bordered element may be a disclosure, filter, button, status, field, or navigation action. Similar-looking controls can behave differently.
4. **Persistent chrome cost.** The sticky macro header plus floating bottom dock consume substantial vertical space, especially with the keyboard.
5. **Dense secondary copy.** Guidance and calculation explanations are valuable, but frequently remain visible before the primary action is complete.
6. **Roundedness without hierarchy.** Radius values commonly range from 14 to 30 px, including ordinary fields and nested surfaces. This weakens the significance of sheets and primary actions.
7. **Desktop underuse.** `.app` is capped at 430 px, so desktop is a centered phone column. This is safe but does not adapt History or Overview for pointer-driven, wider review workflows.

## Screen Audit

### Shared Header

The macro dashboard is immediately useful and should remain visible. Its four equal cells work on current widths, but labels, current/target values, progress, and delta all compete inside small cards. The title, Settings, Help, macro cells, status line, and notice area form a tall sticky block.

Recommended direction:

- Keep all four macro values visible.
- Strengthen current/target numbers and reduce label/delta competition.
- Treat the header as one coherent status region rather than four miniature cards.
- Preserve immediate target changes when day type or settings change.
- Allow the sticky region to compact after scroll without hiding essential totals.

### Today

Strengths:

- Daily data can be collapsed.
- Incomplete past records are actionable.
- A meal opens in place and can close on a second tap.
- Each food can save or apply a favorite independently.
- Food inputs update totals and warnings without replacing the entry form.

Issues:

- The page opens with multiple stacked sections before food entry begins.
- Meal rows show title, names, macros, and multiple status badges in a narrow line.
- Entry cards contain several nested visual regions and two text actions plus delete at the top.
- Macro suggestions can look like values because they occupy input placeholders.
- "Next meal" is globally phrased even though the editor is spatially nested under a meal.
- Applying a favorite opens a scrollable panel inside an entry card, adding another nested container.
- Full-view rerenders after structural actions can cause perceptual jumps even when scroll correction follows.

Recommended direction:

- Treat meal rows as the dominant navigation within Today.
- Keep one expanded meal spatially attached to its row.
- Make the food name and calories the first visual pass; keep P/C/F fast but secondary.
- Use an anchored picker or sheet for favorites rather than an always-inline nested list.
- Give save state a quiet persistent indicator and reserve notices for actual state changes.

### History

Strengths:

- Backup/import tools are available.
- Incomplete records are surfaced separately.
- Date, type, and text filters exist.
- Records and favorites are independently collapsible.

Issues:

- Backup, import, filtering, incomplete records, saved records, and favorites all compete at the same page level.
- The default disclosure configuration can make the page feel like a control panel before it feels like history.
- Record cards use repeated metadata lines and action rows, reducing scan speed.
- Favorites belong to the entry workflow as much as to maintenance, but are visually buried in History.
- Search inputs rerender the view; favorite search is debounced, history search is immediate.

Recommended direction:

- Lead with the history timeline and incomplete work.
- Move backup/import into a secondary toolbar or sheet.
- Use a compact record row with date, day type, calories, weight, and completeness.
- Keep destructive actions behind an explicit row action.
- Preserve current filtering and CSV behavior.

### Overview

Strengths:

- It distinguishes weekly execution, macro deviation, weight trend, recovery, calendar, anomalies, and record quality.
- Missing records are not silently treated as zero intake.
- The weight chart includes actual, trend, and goal lines.

Issues:

- The same conclusion appears through insight text, badges, delta pills, progress, recovery badges, trend status, and warnings.
- The page is long because each concept has a full card and several inner surfaces.
- Recorded-day badges repeat across modules.
- Macro deviations lack a clear order of importance.
- Calendar details are disconnected from the weekly conclusion.
- Anomaly cards can appear after a long scroll, despite being the most urgent content.

Recommended direction:

- Use one top-level weekly summary with confidence/coverage.
- Put urgent anomalies and incomplete data near the summary.
- Present macro variance as one compact comparison, not four independent conclusions.
- Make weight the primary trend visualization.
- Put recovery and calendar into a single secondary disclosure.
- Keep all existing numbers and explanations accessible.

### Settings

Strengths:

- Formula inputs and target preview are explicit.
- Settings use a draft and only commit on Save.
- Date controls already use a native input over a custom visible chip.
- Language switching is immediate.
- Destructive clearing is separated.

Issues:

- Mobile settings are a full-height sheet but lack a focus trap.
- Background content is hidden by scroll locking, but inert/aria-hidden behavior is not applied.
- Several long groups use similar bordered containers and disclosure rows.
- The sticky save action competes with keyboard and sheet scrolling.
- Calculation details are a dense stat grid.

Recommended direction:

- Keep the full-height mobile sheet and native controls.
- Introduce a clear sheet header, scroll region, and anchored commit region.
- Use form sections separated by typography and spacing; reserve cards for previews and danger.
- Add focus containment and predictable focus restoration.

## Responsive And iPhone Keyboard Audit

Current responsive behavior is designed primarily around 360–430 px:

- app width is capped at 430 px;
- the bottom dock is fixed and safe-area aware;
- `visualViewport` computes `--dock-keyboard-offset`;
- settings become a bottom-aligned full-height sheet under 520 px;
- grids collapse selectively under 360 px;
- date chips constrain native date inputs to 190 px;
- `scrollIntoView()` and delayed focus are used after adding entries.

Risks:

- Moving the entire bottom dock above the keyboard can cover the active food entry and reduces usable height.
- `body.modal-open` fixes body width but does not preserve the prior scroll position explicitly.
- `100dvh` improves sheet sizing but must be checked on iOS Safari/PWA with keyboard, rotation, and larger text.
- `maximum-scale=1` and `user-scalable=no` prevent pinch zoom and conflict with accessibility expectations.
- Inputs use 15 px base text in some cases, which can trigger iOS zoom unless computed size reaches 16 px.
- Focus can be lost when a full `innerHTML` render replaces the active control.

QA must cover iPhone 15 Pro Max dimensions, 390 px and 430 px widths, standalone PWA mode, Safari mode, keyboard open/close, orientation change, and large text.

## Interaction And Motion Audit

Current motion is restrained:

- press states scale/translate controls;
- settings group bodies use a short `soft-reveal`;
- the bottom dock animates keyboard offset and visual state;
- reduced-motion disables bottom navigation transitions.

Gaps relative to the apple-design principles:

- Press feedback is CSS `:active`, which is appropriate, but not all actionable rows share it.
- Disclosure changes are discrete rerenders, so continuity and origin are weak.
- Smooth scrolling is used even under reduced-motion.
- Reduced-transparency and increased-contrast preferences are not handled.
- Motion tokens are not centralized.
- No gesture-driven interactions exist, so springs and momentum are not currently necessary.

The redesign should use motion only for state continuity: press, disclosure, sheet arrival, keyboard-safe focus, save confirmation, and row insertion/removal.

## Accessibility Audit

Existing positives:

- Many buttons have localized aria labels.
- Dialogs use `role="dialog"`, `aria-modal`, and labeled titles.
- disclosures expose `aria-expanded`;
- segmented controls expose radio semantics;
- focus-visible styling exists;
- live regions announce notices and status;
- controls generally meet touch-target expectations;
- reduced motion has partial support.

Priority issues:

1. The viewport disables user zoom.
2. Dialogs do not trap focus and background content is not made inert.
3. Calendar days are non-interactive `div` elements even though date navigation is a natural expectation.
4. Progress bars are visually useful but hidden from assistive technology without an equivalent grouped summary.
5. Some status meaning depends on color and very small dots.
6. Some buttons use both radio semantics and `aria-pressed`, which is redundant.
7. Input labels often omit explicit `for` links in generated food-entry forms.
8. No `prefers-reduced-transparency` or `prefers-contrast` treatment exists.
9. Dynamic Type/large browser text has not been verified.
10. Full rerenders may disrupt screen-reader virtual cursor and keyboard focus.

## Loading, Saved, Error, And Empty States

All major state classes exist but are not expressed through one shared system:

- Loading: card plus explanatory hint.
- Saved/draft: status line and transient notice.
- Error: warning box or fatal card.
- Empty: hint box, sometimes with an icon.
- Warning: badge, notice, hint, card, or inline message.

The redesign should define four feedback levels—status, completion, warning, error—and use each consistently. A save notice should appear only when state actually changes, matching the current product requirement. Draft safety should be persistent and quiet, not a repeated toast.

## Performance And Perceived Quality

The app already maintains sorted record indexes and uses range helpers for target calculations. The main perceived-performance risks are visual:

- whole-view replacement during navigation and several filter actions;
- repeated modal body replacement from `renderHeader()`;
- layout movement after structural meal actions;
- no skeleton or reserved geometry during initial load;
- fixed chrome moving with keyboard.

No framework is needed. Better local DOM updates, stable geometry, focus preservation, and fewer nested surfaces will improve perceived speed.

## Baseline Verification

The repository has no package manifest, production bundler, lint task, or automated browser test. The production artifact is the source app shell itself.

Required baseline commands:

```sh
node --check app.js
node nutrition-engine.test.js
```

Static production smoke:

```sh
python3 -m http.server 8765
curl -I http://127.0.0.1:8765/index.html
curl -I http://127.0.0.1:8765/app.js?v=2.3.3
curl -I http://127.0.0.1:8765/styles.css?v=2.3.3
```

### Screenshot Baseline

The current Codex browser-control runtime was not exposed during this audit, so fresh automated mobile and desktop screenshots could not be captured reliably. No substitute screenshots were fabricated. Before the shared-foundation implementation begins, establish:

- `390x844`: Today, one meal expanded, keyboard closed/open;
- `430x932`: Today, Settings, History, Overview;
- `1024x768`: Today, History, Overview;
- Chinese and Spanish variants for the narrowest width.

Because this phase changes documentation only, there is no visual "after" state yet.

## Redesign Guardrails

- Preserve all nutrition and trend formulas.
- Preserve IndexedDB stores, migration, localStorage keys, CSV structure, and data normalization.
- Preserve Today, History, Overview, Settings, Help, and Import flows.
- Preserve Chinese and Spanish parity.
- Preserve the cream and muted-green identity.
- Keep native date, numeric, range, select, and file controls where they improve platform familiarity.
- Do not add a UI framework or animation dependency.
- Do not use blur or translucency inside ordinary content cards.
- Do not make every control a pill.
- Do not hide necessary context to achieve minimalism.
- Ship shared foundation first, then one screen per review checkpoint.
