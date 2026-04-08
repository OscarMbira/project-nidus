# View toggle (card grid vs table list)

## Overview

The app uses a shared **card grid (⊞) / table list (≡)** pattern on list pages. Persistence uses `localStorage` with keys `nidus-view-mode-{pageId}`.

## Shared code

| File | Purpose |
|------|---------|
| `src/hooks/useViewMode.js` | `useViewMode(pageId, defaultMode)` — returns `[viewMode, setViewMode]` |
| `src/components/ui/ViewToggle.jsx` | Icon button group; optional `className` for dark toolbars (e.g. `!bg-gray-800 !border-gray-700`) |
| `src/hooks/__tests__/useViewMode.test.js` | Vitest coverage for the hook |

## Toolbar layout

Typical order: **Export** → **Search** → **ViewToggle** → primary actions (Create, etc.). Search is debounced at **300 ms** where implemented.

## Default

**Grid (cards)** is the default unless a page passes a different second argument to `useViewMode`.

## Testing

- Run `npm test -- src/hooks/__tests__/useViewMode.test.js`
- Manually: switch views, refresh the page (persistence), and confirm both views filter correctly when search/filters apply.
