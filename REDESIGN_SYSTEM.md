# Macro Tracker Redesign System

Status: proposed for review  
Applies to: shared shell, Today, History, Overview, Settings, Help, and Import  
Product feeling: calm, immediate, trustworthy

## Product Intent

Macro Tracker should feel like a dependable daily instrument, not a dashboard that asks to be interpreted. The interface should make the next useful action obvious while keeping the nutritional context that supports good decisions.

The redesign translates the apple-design principles into this product:

- **Immediate response:** every tap and input shows feedback at once; calculations update without blocking entry.
- **Direct manipulation:** controls sit next to the data they affect; meals open where they are selected.
- **Spatial consistency:** sheets return to their triggers, meal editors remain attached to meal rows, and disclosures close along the same path they open.
- **Restrained motion:** motion explains state changes and never decorates static content.
- **Functional material:** translucency is reserved for floating navigation and modal chrome.
- **Clear hierarchy:** today's remaining macros and the active food entry dominate.
- **Platform familiarity:** native inputs, familiar icons, predictable sheets, and keyboard-safe focus.
- **User agency:** drafts remain recoverable, destructive actions are explicit, and advanced detail stays available.
- **Accessibility:** zoom, text scaling, reduced motion/transparency, contrast, focus, and screen readers are first-class.
- **Typographic craft:** numbers, labels, and guidance use distinct roles with stable tabular alignment.
- **Simplicity:** common actions lead; details are disclosed without being removed.

## Information Hierarchy

Each screen uses four levels:

1. **Primary outcome:** remaining macros, incomplete task, weekly conclusion, or settings commit.
2. **Primary action:** add food, open date, inspect trend, or save settings.
3. **Supporting context:** day type, meal totals, record coverage, data source.
4. **Advanced detail:** formula explanation, CSV tools, calendar, validation detail.

Only one primary outcome should dominate a viewport. Secondary context may be visible, but it should not use the same size, border, and contrast as the primary outcome.

## Color

The existing cream and muted-green direction remains the brand foundation.

### Semantic Roles

| Role | Direction | Use |
| --- | --- | --- |
| Canvas | warm cream | page background |
| Primary surface | near-white cream | forms and content |
| Raised material | translucent warm white | bottom navigation, sheet header/footer |
| Primary action | muted deep green | commit and active navigation |
| Protein | muted green | protein values/progress only |
| Carbs | muted ochre | carbohydrate values/progress only |
| Fat | muted rose | fat values/progress only |
| Information | cool gray-blue | neutral system context |
| Warning | muted amber | incomplete or needs attention |
| Error/destructive | muted rose-red | invalid/destructive only |

Rules:

- Color reinforces a label; it never carries meaning alone.
- Macro colors do not become general navigation colors.
- Warning and error are visually distinct.
- Text must meet WCAG AA contrast at minimum.
- Translucent layers receive a solid fallback.

## Typography

Use the platform system stack already present. Preserve tabular numerals for macro values, weight, dates, and calculations.

Proposed roles:

| Token | Purpose | Character |
| --- | --- | --- |
| Display | app/screen identity when needed | 24–28 px, bold, tight leading |
| Title | section outcome | 20–22 px, semibold/bold |
| Headline | meal/date/metric | 17–18 px, semibold |
| Body | instructions and form values | 16 px minimum for editable text |
| Supporting | metadata and hints | 13–14 px |
| Caption | units and tertiary status | 12 px minimum |
| Numeric hero | remaining/weekly number | 28–34 px, tabular, tight leading |

Rules:

- Editable controls use at least 16 px to avoid iOS focus zoom.
- Chinese and Spanish line-height are tuned independently where needed.
- Large headings may use slightly tighter tracking; body text remains at `0`.
- Layouts expand with text; fixed-height text containers are avoided.

## Spacing And Geometry

Use a 4 px base rhythm with primary steps of 8, 12, 16, 24, and 32 px.

Radius hierarchy:

- 8–10 px: small controls and status markers.
- 12–14 px: fields, buttons, repeated rows.
- 16–18 px: cards and grouped editors.
- 22–28 px: sheets and floating navigation only.

Avoid nested cards. Within a section, use spacing, alignment, subtle dividers, and background changes before adding another border.

Touch targets:

- minimum 44 x 44 CSS px;
- destructive icon actions retain a forgiving hit area;
- adjacent targets keep at least 8 px separation.

## Surface And Material

Translucency is functional, not decorative.

Use it for:

- the floating bottom navigation;
- sticky sheet headers and commit footers;
- a compacting top status layer if content scrolls beneath it.

Do not use it for:

- ordinary content cards;
- nested meal entry forms;
- statistic tiles;
- warning boxes.

Support:

- `prefers-reduced-transparency: reduce` with opaque surfaces;
- `prefers-contrast: more` with stronger borders and solid backgrounds;
- environments without `backdrop-filter`.

## Control Grammar

### Buttons

- **Primary:** one commit action per context, filled muted green.
- **Secondary:** bordered or lightly filled, for reversible actions.
- **Quiet:** icon or text with no enclosing pill unless a hit area needs one.
- **Destructive:** muted red treatment, separated from primary actions.

All buttons respond immediately on press. Press feedback uses a subtle scale or background change and is removed under reduced motion where necessary.

### Disclosure Rows

A disclosure is a full-width row with:

- title;
- optional one-line summary;
- trailing chevron;
- `aria-expanded`;
- stable origin and symmetric open/close motion.

It must not look identical to a commit button.

### Segmented Controls

Use for short, mutually exclusive choices only:

- training/rest;
- Chinese/Spanish;
- compact filters where two or three values are visible.

Use radio semantics without redundant pressed semantics. Long descriptive options remain selects or lists.

### Fields

- Labels remain visible; placeholders do not substitute for labels.
- Units sit inside the field as suffixes when they are not user input.
- Numeric keyboards use appropriate `inputmode`.
- Validation appears inline near the field.
- Date controls keep native date selection under a consistent visible chip.

### Status

Four levels:

1. Status: quiet, persistent, no interruption.
2. Completion: brief confirmation only after a real change.
3. Warning: actionable and non-destructive.
4. Error: specific, local, and recovery-oriented.

Draft auto-save is status. A completed save is completion. Incomplete records are warning. Invalid import rows are error.

## Navigation

Keep the four existing bottom actions: Today, History, Overview, Save.

Proposed behavior:

- Today, History, and Overview remain destinations.
- Save remains visually distinct as a contextual commit, but not so dominant that it reads as a fourth destination.
- Active destination uses icon, label, and surface—not color alone.
- The dock stays above the safe area.
- When a text keyboard is open, the navigation should not cover the active field. The preferred solution is to reduce/hide nonessential dock chrome while preserving an accessible save path, subject to prototype testing.
- Desktop may use the same navigation in a compact rail or top-level segmented destination bar without changing route semantics.

## Today Pattern

### Header

- One cohesive macro status region.
- Four macro measures remain visible.
- Current/target value is primary; unit and delta are secondary.
- Day-type target changes update in place.
- Status and notices reserve stable space without creating empty visual noise.

### Daily Data

- Collapsed summary remains compact: date, day type, completeness.
- Expanded form keeps date, weight, day type, performance, hunger, and sleep.
- Rest day visibly disables training performance.
- Completeness updates immediately.

### Meals

- Four meal rows form a vertical list.
- Tapping a row opens its editor directly beneath it; tapping again closes it.
- The row shows meal name, a concise food summary, total calories, and one compact completeness signal.
- Secondary macro detail can appear when expanded.

### Food Entry

- Name and calories lead.
- Protein, carbs, and fat remain one-row fast inputs where width permits.
- Save Favorite and Apply Favorite are visually distinct but secondary.
- Apply Favorite opens an anchored picker/sheet and replaces only the target food.
- Adding a food inserts it in place, scrolls it into a safe visible region, and focuses its name without fighting the keyboard.
- Deletion is reversible where practical; otherwise it has clear consequences.

## History Pattern

- Lead with incomplete dates when they exist.
- Show saved records as compact rows optimized for scanning.
- Put filters near the list they affect.
- Move backup/import into a secondary tools surface.
- Keep favorites accessible as a separate mode or section without making them compete with the record timeline.
- Record rows expose Open directly; Delete stays in a secondary action.
- Date chips use the existing native-date overlay pattern.

## Overview Pattern

Default order:

1. Weekly conclusion and data confidence.
2. Urgent anomaly/incomplete-data warning.
3. Macro variance summary.
4. Weight trend chart and guidance.
5. Recovery and execution quality.
6. Calendar and detailed diagnostics.

The default view should answer:

- Am I roughly on plan?
- Is the conclusion trustworthy?
- What changed?
- What should I do next?

Detailed formulas and calendar counts remain available through disclosures.

## Sheets And Modals

- Mobile uses bottom/full-height sheets depending on task depth.
- Desktop uses centered dialogs with bounded height.
- Header and footer remain stable while content scrolls.
- Focus enters at the title/first meaningful control, remains trapped, and returns to the trigger.
- Background becomes inert.
- Escape closes non-destructive sheets.
- Close and open share the same spatial path.
- Import confirmation remains blocking; Help is non-destructive; Settings protects unsaved draft changes.

## Motion

No animation library is required for the current interaction set.

Motion tokens:

- press feedback: 80–120 ms;
- small disclosure: 160–220 ms;
- sheet materialization: 220–320 ms;
- save confirmation: 160–220 ms;
- no decorative loops or bounce.

Use opacity and transform only. Disclosures should animate from their trigger region, not from page center. Scroll-to-entry respects reduced motion. Gesture-driven springs are deferred until a real gesture interaction exists.

Reduced motion:

- replace slide/scale with short opacity changes;
- use instant scroll positioning;
- retain color/status feedback;
- never remove important completion feedback.

## Accessibility

Foundation requirements:

- remove viewport zoom restrictions;
- minimum 16 px editable text;
- AA text contrast;
- visible focus for every interactive element;
- focus trap and inert background for dialogs;
- descriptive labels and error associations;
- no status conveyed by color alone;
- screen-reader-readable macro progress and save state;
- predictable heading hierarchy;
- 44 px touch targets;
- support reduced motion, reduced transparency, and increased contrast;
- verify at 200% browser zoom and large iOS text;
- preserve Chinese and Spanish parity.

## Responsive Strategy

### 320–389 px

- single-column forms;
- compact macro labels;
- controls wrap without ellipsis on essential actions;
- food macro fields may use a 3-column row only if values remain legible.

### 390–430 px

- primary mobile target;
- full meal-entry workflow;
- compact floating navigation;
- keyboard-safe entry focus.

### 431–767 px

- wider single column with less forced wrapping;
- modals remain sheet-like where touch is likely.

### 768 px and above

- Today may retain a focused entry column with a supporting status rail.
- History may use a two-pane list/detail pattern only if it preserves the existing open-date flow.
- Overview may use a two-column analytical layout.
- Content width is based on task, not an enlarged phone frame.

## Quality Bar

A phase is ready for review only when:

- nutrition tests pass unchanged;
- app-shell files load over a local production server;
- Chinese and Spanish both fit at 390 and 430 px;
- keyboard open/close does not obscure active entry;
- no horizontal overflow exists;
- focus order and modal containment are verified;
- reduced-motion and reduced-transparency modes remain usable;
- before/after screenshots cover the phase;
- changed files and known issues are documented.
