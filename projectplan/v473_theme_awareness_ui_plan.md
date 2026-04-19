# v473 — Theme awareness (light / dark) UI plan

## Goal

Align Platform (and shared) UI with the user-selected theme so light mode does not leave large areas in dark-only greys.

## Todo (completed)

- [x] Theme-aware `SystemHeader` / Platform & Simulator headers and nav links
- [x] Platform dashboard page shell, loaders, Executive Summary, PMO scope tabs
- [x] Sidebar default background when branding colour absent
- [x] PMO dashboard entity panels (search + tables)
- [x] Dashboard widgets: cards, KPIs, modals, key form controls
- [x] Replace `min-h-screen bg-gray-900` with `bg-gray-50 dark:bg-gray-900` on listed route pages

## Review

Implementation focused on Tailwind `dark:` pairs and light defaults. Simulator header uses `dark:bg-purple-950` for brand continuity in dark mode. Documentation: `Documentation/Theme_Awareness_UI_Update.md`.
