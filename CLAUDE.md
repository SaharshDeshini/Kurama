# Kurama — Personal OS

A local-first personal dashboard: daily journal, challenge tracking (streaks), counters, and a
command-box for quick entry. No backend — all data lives in `localStorage`.

## Stack

- React 18 + Vite 5 + Tailwind 3 (JavaScript, not TypeScript — `.jsx`, intentional for this project)
- `react-router-dom` for routing, `recharts` for charts, `date-fns` for dates, `lucide-react` for icons
- No test runner configured yet, no backend/API, no auth

## Commands

```
npm run dev       # vite dev server, http://localhost:5173
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Structure

Only 2 routes exist: `/` (Home) and `/journal`. Settings is not a route — it's a modal
(`SettingsModal`) whose open/close state lives in `AppLayout` and is handed to pages via
`<Outlet context={{ openSettings }} />` (read with `useOutletContext()`, see `BackupReminder`).

```
src/
  pages/          Home (merges the former Today/Challenges/Track into one dashboard), Journal
  components/
    layout/       AppLayout (owns Settings-modal state, passes `onOpenSettings` down), Sidebar,
                  MobileNav
    journal/      JournalView
    challenges/   ChallengeCard — Home-page card per challenge: today's requirements
                  (checkbox tap-to-toggle or counter +/- with auto-complete at target), a
                  14-day consistency strip, and a toggle that swaps in ChallengeDetail inline
                  (no route change) for full streak history/freeze/day-notes; ChallengeModal —
                  create form with a fixed-duration-vs-open-ended toggle and a per-requirement
                  checkbox-vs-counter toggle
    counters/     CountersSection — standalone counters (grid + 14-day chart + time-of-day
                  heatmap), embedded directly on Home; CounterModal, CounterChart
    settings/     SettingsModal — appearance/profile/backup-export-import/clear-data, opened
                  from Sidebar/MobileNav/CommandPalette instead of a route
    command/      CommandBox — parses quick-entry text commands (incl. shorthand counter
                  updates, journal quick-entry, and challenge-template creation);
                  CommandPalette — global Cmd+K / Ctrl+K fuzzy launcher, mounted once in
                  AppLayout, searches pages/challenges/counters via utils/fuzzySearch.js
                  (its Settings entry calls `onOpenSettings` rather than navigating)
    common/       Modal, ConfirmDialog, EmptyState, ProgressBar (generic, reused everywhere);
                  ConsistencyChart — 14-day bar chart of % of requirements completed across
                  all active challenges (green/amber/red), the main "stay motivated" dashboard
                  visual on Home; BackupReminder — dashboard banner nudging export when a
                  backup is stale; TimeOfDayHeatmap — recharts bar chart of completions by
                  time-of-day bucket, used in CountersSection and ChallengeDetail;
                  JournalCorrelationInsight — surfaces whether completion rate is higher on
                  days the user journaled
  context/
    DataContext.jsx   single source of truth: challenges, counters, journal, settings —
                      all backed by useLocalStorage, exposes CRUD actions via useCallback.
                      Also holds challengeCompletionTimes / counterCompletionTimes (ISO
                      timestamp maps feeding the time-of-day heatmap) and challengeDayNotes
                      ("why did I fail" notes on FAILED days). Challenges carry a
                      `frozenDates` array (streak-insurance/freeze tokens), a `durationType`
                      ('fixed' | 'open' — open-ended challenges have no end date and
                      `duration: null`), and settings carries `lastBackupAt` (drives the
                      backup-reminder staleness check). Each `dailyRequirements[]` entry has a
                      `type` ('checkbox' | 'counter'); counter requirements store a numeric
                      progress value per day (via `adjustRequirementProgress`) and
                      auto-complete once it reaches `target` — see `isRequirementComplete` in
                      `utils/challenges.js`.
  hooks/
    useLocalStorage.js   safe read/write wrapper around window.localStorage (try/catch, no throw)
    useTheme.js          applies settings.theme ('light' | 'dark' | 'system')
  utils/          dates.js, streaks.js, statistics.js (incl. getTimeOfDayDistribution /
                  flattenCompletionTimestamps), challenges.js (incl. getMilestoneCrossed,
                  isRequirementComplete, getRecentDayStatuses for the card's consistency
                  strip), commandParser.js, backup.js (backup-staleness threshold/calc, shared
                  by SettingsModal and BackupReminder), insights.js (journal/completion
                  correlation), fuzzySearch.js (small local subsequence matcher for
                  CommandPalette)
  data/exampleData.js    seed/demo data for onboarding
```

## Conventions actually in use here

- **State**: everything global goes through `DataContext` (`useContext(DataContext)`), backed by
  `useLocalStorage` under keys prefixed `personalOS_*`. Don't add a second state mechanism —
  extend `DataContext` for new domains (mirror the existing `add*/update*/delete*` action shape).
- **IDs**: generated client-side as `` `${prefix}_${Date.now()}_${random}` `` (see `addChallenge`
  in `DataContext.jsx`) — no backend to assign them. Updates use `{ ...prev, [id]: value }` copies,
  never mutate in place.
- **Errors from storage**: `useLocalStorage` swallows read/write failures to a `console.warn`
  (`[Personal OS] ...`) instead of throwing, so the app degrades instead of crashing — follow the
  same pattern for new storage-adjacent code.
- **Styling**: Tailwind only, dark mode via `darkMode: 'class'` + custom `background/surface/
  border/subtle` color tokens (light/dark pairs) defined in `tailwind.config.js` — reuse those
  tokens instead of raw Tailwind grays. Fonts: `font-sans` (default) is Space Grotesk, loaded via
  Google Fonts `<link>` in `index.html`; `font-mono` is Space Mono, used on numeric/stat displays
  (streaks, day counts) with `tabular-nums` so digits don't shift width — apply both to new
  numeric stat displays. Cards use `border` only (no `shadow-xs`) — shadow is reserved for
  genuinely elevated/floating surfaces (Modal, CommandPalette), not static content cards.
- **No tests exist yet.** If adding tests, this needs a test runner (Vitest is the natural fit for
  Vite) — not currently installed.
- Not a git repository yet — no commit/branch history to reference.

## When you change things

Update this file in the same edit whenever you: add a new page/route, add a new global data
domain to `DataContext`, add a dependency, change the storage key scheme, or add a test runner /
CI. Keep it describing what's actually in the repo, not aspirational plans — put those in a
separate note if needed.
