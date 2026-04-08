# PWA implementation (v339)

This document summarizes the Progressive Web App work aligned with `projectplan/v339_PWA_Implementation_Plan.md`.

## Plan status

The implementation plan is **closed** — all phases are marked complete in [`projectplan/v339_PWA_Implementation_Plan.md`](../../projectplan/v339_PWA_Implementation_Plan.md) (audit completed 2026-03-28). Use that file for the full checklist, review notes, and success criteria.

## Stack

- **Build:** `vite-plugin-pwa` with Workbox (`registerType: 'prompt'`, `devOptions.enabled: false`).
- **Registration:** automatic injection (`injectRegister: 'auto'`); update UI uses `virtual:pwa-register/react`.
- **Manifest / icons:** `public/manifest.json` and static assets under `public/` (including `offline.html`).

## Database

- **`SQL/v353_push_subscriptions_table.sql`** — `public.push_subscriptions` for Web Push subscription storage (run on Supabase before using browser push in production).

## Environment

- **`VITE_VAPID_PUBLIC_KEY`** — VAPID public key for `PushManager.subscribe` (see `.env.example`). Private key remains server-side only.

## Routes

- **Platform:** `/platform/pwa-settings`
- **Simulator:** `/simulator/pwa-settings`

Both use the same `PWASettings` page; the app shell covers Platform and Simulator under one origin.

- **Simulator “scenario library” shortcut:** the PWA manifest includes a shortcut to `/simulator/scenarios`. That path **redirects** to `/simulator/practice-projects` (the live Simulator practice-project library). The shortcut keeps a stable URL for installable app links while the app uses the current route structure.

## Operational notes

- **Lighthouse:** run a production build (`npm run build`) and audit the preview or deployed HTTPS URL; target PWA score as high as practical.
- **HTTPS:** installability and push require a secure context in real deployments.
