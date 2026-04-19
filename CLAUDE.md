# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A personal calendar & goal tracker — vanilla HTML/CSS/JS, no framework, no build step. Data lives in `localStorage`. Uses Inter font from Google Fonts.

## Running

Requires a static file server for ES module imports (browsers block `file://` modules). Use `npx serve .` or `python -m http.server` and open in browser.

## Architecture

Single-page app. Calendar on the left, goals dashboard sidebar (340px) on the right — stacks vertically on mobile (<720px). No routing.

**Theme colors** (must preserve): `#546B41` (primary green), `#99AD7A` (light green), `#DCCCAC` (tan/border), `#FFF8EC` (cream bg). CSS custom properties in `:root` — all colors derived from these four.

**Two calendar view modes** toggled via toolbar buttons:
- **3 Weeks**: fixed grid of current week + 2 upcoming. Week label rows show ISO week number + date range. Alternating weeks get `.week-alt` tint.
- **Month**: full month grid with prev/next/today navigation. `monthOffset` module state tracks which month relative to current. Days outside the month shown faded (`.other-month`).

**JS modules** (`js/`, ES module imports):
- `app.js` — entry point, wires "New Goal" button, calls `renderAll()` on init and after every modal close via `setOnClose(cb)`
- `store.js` — all localStorage CRUD. Keys: `calendar_goals` / `calendar_tasks`. Goal completion % always computed, never stored. Exports `GOAL_COLORS` palette
- `calendar.js` — renders into `#calendar-panel`. Module state: `viewMode` (`'3weeks'`/`'month'`), `monthOffset`. Task toggle calls both `renderCalendar()` and `renderDashboard()` to keep sidebar in sync. Adds `.just-toggled` class for bounce animation on toggle
- `dashboard.js` — renders into `#dashboard-panel`. Goal cards with progress bars (shimmer overlay), expand chevron with rotation animation, SVG check/circle icons for task items. Formatted dates ("Apr 19"). Empty state has SVG target icon
- `modal.js` — task and goal create/edit/delete forms. Color picker with `role="radiogroup"`, keyboard-accessible swatches. Overlay uses `backdrop-filter: blur`
- `utils.js` — date math (week boundaries, formatting). Weeks start on Monday. Dates stored as `"YYYY-MM-DD"` strings, no time-of-day

**Data model:**
- **Goal**: `{ id, name, color, createdAt }` — color chosen by user from swatch picker
- **Task**: `{ id, title, date, done, goalId }` — `goalId` is nullable. Tasks with a goal get fully colored pills (goal color bg, white text)

**Key patterns:**
- All rendering is imperative DOM replacement (`innerHTML`). Event listeners re-attached after each render
- `store.js` is the single source of truth — other modules never touch `localStorage` directly
- Deleting a goal unlinks its tasks (`goalId` → `null`) rather than deleting them
- `escapeHtml()` defined locally in each module that renders user content to prevent XSS

**Responsive breakpoints** (in `style.css`):
- `900px` — tablet: narrower sidebar (280px), smaller day cells
- `720px` — mobile: layout stacks vertically, sidebar goes full-width below calendar, modals become bottom sheets, touch targets min 44px, form inputs 16px font (prevents iOS zoom), task edit buttons always partially visible
- `420px` — very small: further reduced padding and font sizes
