# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A personal calendar & goal tracker with multi-device sync. Vanilla HTML/CSS/JS frontend, Supabase backend (auth + PostgreSQL). Deployed on Vercel.

## Running

Requires a static file server for ES module imports. Use `npx serve .` or `python -m http.server`. Supabase CDN is loaded from `index.html` via `<script>` tag; no npm needed.

## Supabase Setup

- **Project**: `bjbjhoyhxrodwcvyayvx.supabase.co`
- **Tables**: `goals` and `tasks` with `user_id` column and Row Level Security
- **Auth**: Email/password via Supabase Auth
- **Schema**: See `supabase-setup.sql` for table definitions, RLS policies, and indexes
- **Key pattern**: RLS ensures users only see their own data. `user_id` is set on insert, filtered automatically on reads.

## Architecture

Single-page app. Auth screen shown when logged out; main app (calendar + sidebar) shown when logged in. Calendar on the left, goals dashboard sidebar (340px) on the right; stacks vertically on mobile (<720px).

**Theme colors** (must preserve): `#546B41` (primary green), `#99AD7A` (light green), `#DCCCAC` (tan/border), `#FFF8EC` (cream bg).

**Two calendar view modes** toggled via toolbar buttons:
- **3 Weeks**: fixed grid of current week + 2 upcoming. Week label rows show ISO week number + date range.
- **Month**: full month grid with prev/next/today navigation. `monthOffset` module state tracks which month.

**JS modules** (`js/`, ES module imports):
- `supabase.js` - initializes Supabase client with project URL and anon key
- `auth.js` - renders login/signup form, handles auth state transitions. `showAuthScreen()`/`showApp()` toggle visibility
- `app.js` - entry point. Listens to `supabase.auth.onAuthStateChange` to switch between auth and app views. Calls `refreshData()` then renders calendar + dashboard
- `store.js` - **data layer with in-memory cache**. `refreshData()` fetches all goals/tasks from Supabase into module-level arrays. Read functions (`loadGoals`, `getTasksForDate`, etc.) are synchronous reads from cache. Mutation functions (`addTask`, `toggleTask`, etc.) are async - write to Supabase, then call `refreshData()` to update cache. Exports `GOAL_COLORS` palette
- `calendar.js` - renders into `#calendar-panel`. Module state: `viewMode`, `monthOffset`. Task toggle is async (awaits `toggleTask`)
- `dashboard.js` - renders into `#dashboard-panel`. Goal cards with progress bars, expandable task lists
- `modal.js` - task and goal create/edit/delete forms. Color picker with keyboard accessibility. Form submissions are async (await store mutations before closing modal)
- `utils.js` - date math (week boundaries, formatting). Weeks start on Monday. Dates as `"YYYY-MM-DD"` strings

**Data model (Supabase tables):**
- **goals**: `id` (UUID PK), `user_id`, `name`, `color`, `created_at`
- **tasks**: `id` (UUID PK), `user_id`, `title`, `date`, `done`, `goal_id` (FK nullable, ON DELETE SET NULL)

**Key patterns:**
- In-memory cache in `store.js` keeps rendering synchronous while data lives in Supabase
- All mutations follow: write to DB -> `refreshData()` -> re-render
- `store.js` is the single source of truth; other modules never call Supabase directly
- Deleting a goal unlinks its tasks (`goal_id` -> `null`) rather than deleting them
- `escapeHtml()` defined locally in rendering modules to prevent XSS
- Auth state managed via Supabase's `onAuthStateChange` listener

**Responsive breakpoints** (in `style.css`):
- `900px` - tablet: narrower sidebar
- `720px` - mobile: layout stacks vertically, modals become bottom sheets, 44px touch targets
- `420px` - very small: further reduced padding/fonts
